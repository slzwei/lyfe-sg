"use server";

import { randomBytes } from "crypto";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendInvitationEmail } from "@/lib/email";
import { deleteResumeFiles } from "@/lib/supabase/storage";
import { requireStaff } from "./auth";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface InvitationProgress {
  profile_completed: boolean;
  onboarding_step: number;
  quiz_answered: number;
  quiz_completed: boolean;
  disc_type?: string;
}

export interface AttachedFile {
  label: string;
  file_name: string;
  storage_path: string;
}

export interface Invitation {
  id: string;
  token: string;
  email: string;
  candidate_name: string | null;
  position_applied: string | null;
  status: string;
  user_id: string | null;
  invited_by: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  archived_at: string | null;
  candidate_record_id: string | null;
  profile_pdf_path: string | null;
  disc_pdf_path: string | null;
  attached_files: AttachedFile[] | null;
  progress: InvitationProgress | null;
}

// ─── Invitation CRUD ─────────────────────────────────────────────────────────

export async function sendInvite(data: {
  email: string;
  candidateName?: string;
  position?: string;
  jobId?: string;
  assignedManagerId?: string;
}) {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  if (!data.email || !z.string().email().safeParse(data.email).success) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const adminClient = getAdminClient();

  // Check if email already has an active invitation (pending or accepted)
  const { data: existing } = await adminClient.from("invitations")
    .select("id")
    .eq("email", data.email)
    .in("status", ["pending", "accepted"])
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: false, error: "An invitation for this email already exists." };
  }

  const token = randomBytes(32).toString("base64url");

  const { data: inserted, error } = await adminClient.from("invitations").insert({
    token,
    email: data.email,
    candidate_name: data.candidateName || null,
    position_applied: data.position || null,
    invited_by: staff.full_name,
    invited_by_user_id: staff.id !== "legacy" ? staff.id : null,
    job_id: data.jobId || null,
    assigned_manager_id: data.assignedManagerId || null,
  }).select("id").single();

  if (error || !inserted) {
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

  return { success: true, invitationId: inserted.id };
}

export async function listInvitations(): Promise<{
  success: boolean;
  data?: Invitation[];
  error?: string;
}> {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  const adminClient = getAdminClient();
  const { data, error } = await adminClient.from("invitations")
    .select("*")
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
    const { data: profiles } = await adminClient.from("candidate_profiles")
      .select("user_id, completed, onboarding_step")
      .in("user_id", userIds);

    if (profiles) {
      for (const p of profiles) {
        profileMap.set(p.user_id, { completed: p.completed, onboarding_step: p.onboarding_step });
      }
    }

    const { data: responses } = await adminClient.from("disc_responses")
      .select("user_id, responses")
      .in("user_id", userIds);

    if (responses) {
      for (const r of responses) {
        const count = r.responses ? Object.keys(r.responses).length : 0;
        quizProgressMap.set(r.user_id, count);
      }
    }

    const { data: results } = await adminClient.from("disc_results")
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
      invited_by: inv.invited_by || "staff",
      attached_files: (inv.attached_files as unknown as AttachedFile[] | null) || null,
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

  const adminClient = getAdminClient();

  // 3 parallel queries for a single user
  const [profileRes, responsesRes, resultsRes] = await Promise.all([
    adminClient.from("candidate_profiles")
      .select("completed, onboarding_step")
      .eq("user_id", userId)
      .single(),
    adminClient.from("disc_responses")
      .select("responses")
      .eq("user_id", userId)
      .single(),
    adminClient.from("disc_results")
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
  const staff = await requireStaff("manager");
  if (!staff) return { success: false, error: "Manager access required." };

  const adminClient = getAdminClient();
  const { error } = await adminClient.from("invitations")
    .update({ status: "revoked" })
    .eq("id", id)
    .in("status", ["pending", "accepted"]);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function resetApplication(invitationId: string) {
  const staff = await requireStaff("manager");
  if (!staff) return { success: false, error: "Manager access required." };

  const adminClient = getAdminClient();
  const { data: invitation, error: fetchError } = await adminClient.from("invitations")
    .select("user_id")
    .eq("id", invitationId)
    .single();

  if (fetchError || !invitation?.user_id) {
    return { success: false, error: "No candidate linked to this invitation." };
  }

  const userId = invitation.user_id;

  // Clear quiz data
  await adminClient.from("disc_results").delete().eq("user_id", userId);
  await adminClient.from("disc_responses").delete().eq("user_id", userId);

  // Reset profile to incomplete so candidate can re-edit and re-submit
  await adminClient.from("candidate_profiles")
    .update({ completed: false, onboarding_step: 1 })
    .eq("user_id", userId);

  return { success: true };
}

export async function resetQuiz(invitationId: string) {
  const staff = await requireStaff("manager");
  if (!staff) return { success: false, error: "Manager access required." };

  const adminClient = getAdminClient();
  const { data: invitation, error: fetchError } = await adminClient.from("invitations")
    .select("user_id")
    .eq("id", invitationId)
    .single();

  if (fetchError || !invitation?.user_id) {
    return { success: false, error: "No candidate linked to this invitation." };
  }

  const userId = invitation.user_id;

  await adminClient.from("disc_results").delete().eq("user_id", userId);
  await adminClient.from("disc_responses").delete().eq("user_id", userId);

  return { success: true };
}

export async function deleteCandidate(id: string) {
  const staff = await requireStaff("pa");
  if (!staff) return { success: false, error: "Not authorized." };

  const adminClient = getAdminClient();

  // Get user_id and attached files before RPC
  const { data: invitation } = await adminClient
    .from("invitations")
    .select("user_id, attached_files")
    .eq("id", id)
    .single();

  const userId = invitation?.user_id ?? null;

  // Transactional delete of all DB records
  const { error } = await adminClient.rpc("delete_candidate", { p_invitation_id: id });
  if (error) {
    return { success: false, error: error.message };
  }

  // Clean up attached files from storage
  if (invitation?.attached_files) {
    const files = invitation.attached_files as unknown as AttachedFile[];
    const paths = files.map((f) => f.storage_path);
    const deleted = await deleteResumeFiles(paths);
    if (!deleted) {
      console.error(`[deleteCandidate] Storage cleanup failed for invitation ${id}, paths:`, paths);
    }
  }

  // Delete auth user last (Auth Admin API, outside transaction)
  if (userId) {
    await adminClient.auth.admin.deleteUser(userId);
  }

  return { success: true };
}

export async function archiveInvitation(id: string) {
  const staff = await requireStaff("manager");
  if (!staff) return { success: false, error: "Manager access required." };

  const adminClient = getAdminClient();
  const { error } = await adminClient.from("invitations")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .is("archived_at", null);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function removeInviteFile(invitationId: string, storagePath: string) {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  const adminClient = getAdminClient();

  const { data: invitation } = await adminClient.from("invitations")
    .select("id, attached_files")
    .eq("id", invitationId)
    .single();

  if (!invitation) return { success: false, error: "Invitation not found." };

  const files = (invitation.attached_files as unknown[] || []) as AttachedFile[];
  const updated = files.filter((f) => f.storage_path !== storagePath);

  const { error: updateErr } = await adminClient.from("invitations")
    .update({ attached_files: JSON.parse(JSON.stringify(updated)) })
    .eq("id", invitationId);

  if (updateErr) return { success: false, error: "Failed to update file list." };

  await deleteResumeFiles([storagePath]);

  return { success: true };
}
