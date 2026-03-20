"use server";

import { cookies } from "next/headers";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";
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

  const sessionToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(sessionToken).digest("hex");

  const admin = getAdminClient();

  // Clean up expired sessions
  await admin.from("staff_sessions")
    .delete()
    .lt("expires_at", new Date().toISOString());

  // Insert new session
  await admin.from("staff_sessions").insert({
    token_hash: tokenHash,
  });

  const cookieStore = await cookies();
  cookieStore.set("staff_session", sessionToken, {
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
  if (!session) return null;

  const tokenHash = createHash("sha256").update(session).digest("hex");
  const admin = getAdminClient();

  const { data } = await admin.from("staff_sessions")
    .select("id")
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .limit(1);

  if (data && data.length > 0) return session;

  // Backward compatibility: allow plaintext STAFF_SECRET cookie during deploy transition
  if (session === process.env.STAFF_SECRET) {
    console.warn("[staff-auth] Legacy plaintext cookie detected — migrate to session tokens");
    return session;
  }

  return null;
}

export async function staffLogout() {
  const cookieStore = await cookies();
  const session = cookieStore.get("staff_session")?.value;

  if (session) {
    const tokenHash = createHash("sha256").update(session).digest("hex");
    const admin = getAdminClient();
    await admin.from("staff_sessions")
      .delete()
      .eq("token_hash", tokenHash);
  }

  cookieStore.delete("staff_session");
}

// ─── Invitations ─────────────────────────────────────────────────────────────

export async function sendInvite(data: {
  email: string;
  candidateName?: string;
  position?: string;
}) {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  if (!data.email || !z.string().email().safeParse(data.email).success) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const admin = getAdminClient();

  // Check if email already has an active invitation (pending or accepted)
  const { data: existing } = await admin.from("invitations")
    .select("id")
    .eq("email", data.email)
    .in("status", ["pending", "accepted"])
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: false, error: "An invitation for this email already exists." };
  }

  const token = randomBytes(32).toString("base64url");

  const { error } = await admin.from("invitations").insert({
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
  const { data, error } = await admin.from("invitations")
    .select("id, token, email, candidate_name, position_applied, status, user_id, created_at, expires_at, accepted_at, archived_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return { success: false, error: error.message };
  }

  const invitations = data;

  // Collect user_ids for accepted invitations
  const userIds = invitations
    .filter((inv) => inv.user_id)
    .map((inv) => inv.user_id!);

  const profileMap = new Map<string, { completed: boolean; onboarding_step: number }>();
  const quizProgressMap = new Map<string, number>();
  const resultsMap = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profiles } = await admin.from("candidate_profiles")
      .select("user_id, completed, onboarding_step")
      .in("user_id", userIds);

    if (profiles) {
      for (const p of profiles) {
        profileMap.set(p.user_id, { completed: p.completed, onboarding_step: p.onboarding_step });
      }
    }

    const { data: responses } = await admin.from("disc_responses")
      .select("user_id, responses")
      .in("user_id", userIds);

    if (responses) {
      for (const r of responses) {
        const count = r.responses ? Object.keys(r.responses).length : 0;
        quizProgressMap.set(r.user_id, count);
      }
    }

    const { data: results } = await admin.from("disc_results")
      .select("user_id, disc_type")
      .in("user_id", userIds);

    if (results) {
      for (const r of results) {
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

export async function getProgressForUser(userId: string): Promise<{
  success: boolean;
  progress?: InvitationProgress;
}> {
  const staff = await requireStaff();
  if (!staff) return { success: false };

  const admin = getAdminClient();

  // 3 parallel queries for a single user
  const [profileRes, responsesRes, resultsRes] = await Promise.all([
    admin.from("candidate_profiles")
      .select("completed, onboarding_step")
      .eq("user_id", userId)
      .single(),
    admin.from("disc_responses")
      .select("responses")
      .eq("user_id", userId)
      .single(),
    admin.from("disc_results")
      .select("disc_type")
      .eq("user_id", userId)
      .single(),
  ]);

  const profile = profileRes.data;
  const responses = responsesRes.data;
  const results = resultsRes.data;

  return {
    success: true,
    progress: {
      profile_completed: profile?.completed || false,
      onboarding_step: profile?.onboarding_step || 1,
      quiz_answered: responses?.responses ? Object.keys(responses.responses).length : 0,
      quiz_completed: !!results,
      disc_type: results?.disc_type,
    },
  };
}

export async function revokeInvitation(id: string) {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();
  const { error } = await admin.from("invitations")
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
  const { data: invitation, error: fetchError } = await admin.from("invitations")
    .select("user_id")
    .eq("id", invitationId)
    .single();

  if (fetchError || !invitation?.user_id) {
    return { success: false, error: "No candidate linked to this invitation." };
  }

  const userId = invitation.user_id;

  // Clear quiz data
  await admin.from("disc_results").delete().eq("user_id", userId);
  await admin.from("disc_responses").delete().eq("user_id", userId);

  // Reset profile to incomplete so candidate can re-edit and re-submit
  await admin.from("candidate_profiles")
    .update({ completed: false, onboarding_step: 1 })
    .eq("user_id", userId);

  return { success: true };
}

export async function resetQuiz(invitationId: string) {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();
  const { data: invitation, error: fetchError } = await admin.from("invitations")
    .select("user_id")
    .eq("id", invitationId)
    .single();

  if (fetchError || !invitation?.user_id) {
    return { success: false, error: "No candidate linked to this invitation." };
  }

  const userId = invitation.user_id;

  await admin.from("disc_results").delete().eq("user_id", userId);
  await admin.from("disc_responses").delete().eq("user_id", userId);

  return { success: true };
}

export async function deleteCandidate(id: string) {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();

  // Get user_id before RPC (needed for auth.admin.deleteUser)
  const { data: invitation } = await admin
    .from("invitations")
    .select("user_id")
    .eq("id", id)
    .single();

  const userId = invitation?.user_id ?? null;

  // Transactional delete of all DB records
  const { error } = await admin.rpc("delete_candidate", { p_invitation_id: id });
  if (error) {
    return { success: false, error: error.message };
  }

  // Delete auth user last (Auth Admin API, outside transaction)
  if (userId) {
    await admin.auth.admin.deleteUser(userId);
  }

  return { success: true };
}

export async function archiveInvitation(id: string) {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();
  const { error } = await admin.from("invitations")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .is("archived_at", null);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
