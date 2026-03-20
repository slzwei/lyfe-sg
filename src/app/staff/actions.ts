"use server";

import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendInvitationEmail } from "@/lib/email";

// ─── Staff Authentication ────────────────────────────────────────────────────

export async function staffLogin(secret: string) {
  if (!process.env.STAFF_SECRET) {
    return { success: false, error: "Staff login not configured." };
  }

  if (secret !== process.env.STAFF_SECRET) {
    return { success: false, error: "Invalid password." };
  }

  const cookieStore = await cookies();
  cookieStore.set("staff_session", secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return { success: true };
}

async function requireStaff() {
  const cookieStore = await cookies();
  const session = cookieStore.get("staff_session")?.value;
  if (!session || session !== process.env.STAFF_SECRET) {
    return null;
  }
  return session;
}

// ─── Invitations ─────────────────────────────────────────────────────────────

export async function sendInvite(data: {
  email: string;
  candidateName?: string;
  position?: string;
}) {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  if (!data.email || !data.email.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const admin = getAdminClient();

  // Check if email already has an active invitation (pending or accepted)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin.from("invitations") as any)
    .select("id")
    .eq("email", data.email)
    .in("status", ["pending", "accepted"])
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: false, error: "An invitation for this email already exists." };
  }

  const token = randomBytes(32).toString("base64url");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("invitations") as any).insert({
    token,
    email: data.email,
    candidate_name: data.candidateName || null,
    position_applied: data.position || null,
    invited_by: "staff",
  });

  if (error) {
    console.error("[invite] DB insert failed:", error);
    return { success: false, error: "Failed to create invitation." };
  }

  // Send email
  const emailResult = await sendInvitationEmail({
    email: data.email,
    candidateName: data.candidateName,
    position: data.position,
    token,
  });

  if (!emailResult.success) {
    console.warn("[invite] Email send failed but invitation created:", emailResult.message);
  }

  return { success: true };
}

export interface InvitationProgress {
  profile_completed: boolean;
  onboarding_step: number;
  quiz_answered: number;
  quiz_completed: boolean;
  disc_type?: string;
}

export interface Invitation {
  id: string;
  token: string;
  email: string;
  candidate_name: string | null;
  position_applied: string | null;
  status: string;
  user_id: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  archived_at: string | null;
  progress: InvitationProgress | null;
}

export async function listInvitations(): Promise<{
  success: boolean;
  data?: Invitation[];
  error?: string;
}> {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin.from("invitations") as any)
    .select("id, token, email, candidate_name, position_applied, status, user_id, created_at, expires_at, accepted_at, archived_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return { success: false, error: (error as { message: string }).message };
  }

  const invitations = data as Array<{
    id: string;
    token: string;
    email: string;
    candidate_name: string | null;
    position_applied: string | null;
    status: string;
    user_id: string | null;
    created_at: string;
    expires_at: string;
    accepted_at: string | null;
    archived_at: string | null;
  }>;

  // Collect user_ids for accepted invitations
  const userIds = invitations
    .filter((inv) => inv.user_id)
    .map((inv) => inv.user_id as string);

  const profileMap = new Map<string, { completed: boolean; onboarding_step: number }>();
  const quizProgressMap = new Map<string, number>();
  const resultsMap = new Map<string, string>();

  if (userIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (admin.from("candidate_profiles") as any)
      .select("user_id, completed")
      .in("user_id", userIds);

    if (profiles) {
      for (const p of profiles as Array<{ user_id: string; completed: boolean }>) {
        profileMap.set(p.user_id, { completed: p.completed, onboarding_step: 1 });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: responses } = await (admin.from("disc_responses") as any)
      .select("user_id, responses")
      .in("user_id", userIds);

    if (responses) {
      for (const r of responses as Array<{ user_id: string; responses: Record<string, unknown> }>) {
        const count = r.responses ? Object.keys(r.responses).length : 0;
        quizProgressMap.set(r.user_id, count);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: results } = await (admin.from("disc_results") as any)
      .select("user_id, disc_type")
      .in("user_id", userIds);

    if (results) {
      for (const r of results as Array<{ user_id: string; disc_type: string }>) {
        resultsMap.set(r.user_id, r.disc_type);
      }
    }
  }

  const enriched: Invitation[] = invitations.map((inv) => {
    const pInfo = inv.user_id ? profileMap.get(inv.user_id) : undefined;
    return {
      ...inv,
      progress: inv.user_id
        ? {
            profile_completed: pInfo?.completed || false,
            onboarding_step: pInfo?.onboarding_step || 1,
            quiz_answered: quizProgressMap.get(inv.user_id) || 0,
            quiz_completed: resultsMap.has(inv.user_id),
            disc_type: resultsMap.get(inv.user_id),
          }
        : null,
    };
  });

  return { success: true, data: enriched };
}

export async function revokeInvitation(id: string) {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("invitations") as any)
    .update({ status: "revoked" })
    .eq("id", id)
    .in("status", ["pending", "accepted"]);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function resetApplication(invitationId: string) {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invitation, error: fetchError } = await (admin.from("invitations") as any)
    .select("user_id")
    .eq("id", invitationId)
    .single();

  if (fetchError || !invitation?.user_id) {
    return { success: false, error: "No candidate linked to this invitation." };
  }

  const userId = invitation.user_id as string;

  // Clear quiz data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from("disc_results") as any).delete().eq("user_id", userId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from("disc_responses") as any).delete().eq("user_id", userId);

  // Reset profile to incomplete so candidate can re-edit and re-submit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from("candidate_profiles") as any)
    .update({ completed: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  return { success: true };
}

export async function resetQuiz(invitationId: string) {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invitation, error: fetchError } = await (admin.from("invitations") as any)
    .select("user_id")
    .eq("id", invitationId)
    .single();

  if (fetchError || !invitation?.user_id) {
    return { success: false, error: "No candidate linked to this invitation." };
  }

  const userId = invitation.user_id as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from("disc_results") as any).delete().eq("user_id", userId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from("disc_responses") as any).delete().eq("user_id", userId);

  return { success: true };
}

export async function deleteCandidate(id: string) {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();

  // Fetch invitation to get user_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invitation, error: fetchError } = await (admin.from("invitations") as any)
    .select("user_id")
    .eq("id", id)
    .single();

  if (fetchError) {
    return { success: false, error: "Invitation not found." };
  }

  const userId = invitation?.user_id as string | null;

  if (userId) {
    // Delete in order: quiz data → profile → invitation → auth user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from("disc_results") as any).delete().eq("user_id", userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from("disc_responses") as any).delete().eq("user_id", userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from("candidate_profiles") as any).delete().eq("user_id", userId);
  }

  // Delete the invitation record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("invitations") as any).delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Delete the auth user last
  if (userId) {
    await admin.auth.admin.deleteUser(userId);
  }

  return { success: true };
}

export async function archiveInvitation(id: string) {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("invitations") as any)
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .is("archived_at", null);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
