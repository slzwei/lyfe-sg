"use server";

import { randomBytes } from "crypto";
import { z } from "zod";
import { getAdminClient, getAdminClientAs } from "@/lib/supabase/admin";
import { sendInvitationEmail } from "@/lib/email";
import { deleteResumeFiles } from "@/lib/supabase/storage";
import { checkRateLimitAsync } from "@/lib/rate-limit";
import { requireStaff } from "./auth";
import { resolveAssignedManagerId } from "@/lib/invitations/resolve-manager";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface InvitationProgress {
  profile_completed: boolean;
  onboarding_step: number;
  /** Count of answered enneagram questions (0–36). Falls back to DISC count for legacy candidates. */
  quiz_answered: number;
  /** True when an enneagram_results row (or, for legacy, disc_results row) exists. */
  quiz_completed: boolean;
  /** Formatted as "Type 3w2" or "Type 5" when the candidate has completed the Enneagram. */
  enneagram_type?: string;
  /** Legacy — set only for candidates who completed the old DISC flow. */
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
  enneagram_pdf_path: string | null;
  attached_files: AttachedFile[] | null;
  progress: InvitationProgress | null;
  _synthetic?: boolean;
  notes?: string | null;
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

  // P4-4: Rate limit invite sending per staff (20/hour)
  const { allowed } = await checkRateLimitAsync(`send-invite:${staff.id}`, 20, 3_600_000);
  if (!allowed) return { success: false, error: "Too many invitations sent. Please wait before sending more." };

  if (!data.email || !z.string().email().safeParse(data.email).success) {
    return { success: false, error: "Please enter a valid email address." };
  }
  // P3-6: Input length limits
  if (data.email.length > 255)
    return { success: false, error: "Email too long (max 255 characters)." };
  if (data.candidateName && data.candidateName.length > 255)
    return { success: false, error: "Name too long (max 255 characters)." };
  if (data.position && data.position.length > 255)
    return { success: false, error: "Position too long (max 255 characters)." };

  const adminClient = getAdminClientAs(staff);

  // Check if email already has an active invitation (pending or accepted)
  const { data: existing } = await adminClient.from("invitations")
    .select("id")
    .eq("email", data.email)
    .in("status", ["pending", "accepted"])
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: false, error: "An invitation for this email already exists." };
  }

  const resolved = await resolveAssignedManagerId(
    adminClient,
    staff.id !== "legacy" ? staff.id : null,
    data.assignedManagerId ?? null
  );
  if (!resolved.ok) {
    return { success: false, error: resolved.error };
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
    assigned_manager_id: resolved.managerId,
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
  const enneagramAnsweredMap = new Map<string, number>();
  const discAnsweredMap = new Map<string, number>();
  const enneagramResultsMap = new Map<string, string>();
  const discResultsMap = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profiles } = await adminClient.from("candidate_profiles")
      .select("user_id, completed, onboarding_step")
      .in("user_id", userIds);
    if (profiles) {
      for (const p of profiles) {
        profileMap.set(p.user_id, { completed: p.completed, onboarding_step: p.onboarding_step });
      }
    }

    const { data: enneResponses } = await adminClient.from("enneagram_responses")
      .select("user_id, responses")
      .in("user_id", userIds);
    if (enneResponses) {
      for (const r of enneResponses) {
        const count = r.responses ? Object.keys(r.responses as Record<string, unknown>).length : 0;
        enneagramAnsweredMap.set(r.user_id, count);
      }
    }

    const { data: discResponses } = await adminClient.from("disc_responses")
      .select("user_id, responses")
      .in("user_id", userIds);
    if (discResponses) {
      for (const r of discResponses) {
        const count = r.responses ? Object.keys(r.responses as Record<string, unknown>).length : 0;
        discAnsweredMap.set(r.user_id, count);
      }
    }

    const { data: enneResults } = await adminClient.from("enneagram_results")
      .select("user_id, primary_type, wing_type")
      .in("user_id", userIds);
    if (enneResults) {
      for (const r of enneResults) {
        const label = `Type ${r.primary_type}${r.wing_type ? `w${r.wing_type}` : ""}`;
        enneagramResultsMap.set(r.user_id, label);
      }
    }

    const { data: discResults } = await adminClient.from("disc_results")
      .select("user_id, disc_type")
      .in("user_id", userIds);
    if (discResults) {
      for (const r of discResults) {
        discResultsMap.set(r.user_id, r.disc_type);
      }
    }
  }

  const enriched: Invitation[] = invitations.map((inv) => {
    const pInfo = inv.user_id ? profileMap.get(inv.user_id) : undefined;
    const uid = inv.user_id;
    const enneAnswered = uid ? enneagramAnsweredMap.get(uid) : undefined;
    const discAnswered = uid ? discAnsweredMap.get(uid) : undefined;
    const enneType = uid ? enneagramResultsMap.get(uid) : undefined;
    const discType = uid ? discResultsMap.get(uid) : undefined;
    const quizAnswered = enneAnswered ?? discAnswered ?? 0;
    const quizCompleted = !!enneType || !!discType;
    return {
      ...inv,
      invited_by: inv.invited_by || "staff",
      attached_files: (inv.attached_files as unknown as AttachedFile[] | null) || null,
      progress: uid
        ? {
            profile_completed: pInfo?.completed || false,
            onboarding_step: pInfo?.onboarding_step || 1,
            quiz_answered: quizAnswered,
            quiz_completed: quizCompleted,
            enneagram_type: enneType,
            disc_type: discType,
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

  // P3-4: Verify this userId belongs to a candidate (prevent IDOR on arbitrary users)
  const { data: candidateProfile } = await adminClient.from("candidate_profiles")
    .select("candidate_id")
    .eq("user_id", userId)
    .single();
  if (!candidateProfile?.candidate_id) return { success: false };

  const [profileRes, enneResponsesRes, discResponsesRes, enneResultsRes, discResultsRes] = await Promise.all([
    adminClient.from("candidate_profiles")
      .select("completed, onboarding_step")
      .eq("user_id", userId)
      .single(),
    adminClient.from("enneagram_responses")
      .select("responses")
      .eq("user_id", userId)
      .maybeSingle(),
    adminClient.from("disc_responses")
      .select("responses")
      .eq("user_id", userId)
      .maybeSingle(),
    adminClient.from("enneagram_results")
      .select("primary_type, wing_type")
      .eq("user_id", userId)
      .maybeSingle(),
    adminClient.from("disc_results")
      .select("disc_type")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const profile = profileRes.data;
  const enneResponses = enneResponsesRes.data;
  const discResponses = discResponsesRes.data;
  const enneResults = enneResultsRes.data;
  const discResults = discResultsRes.data;

  const enneAnswered = enneResponses?.responses
    ? Object.keys(enneResponses.responses as Record<string, unknown>).length
    : undefined;
  const discAnswered = discResponses?.responses
    ? Object.keys(discResponses.responses as Record<string, unknown>).length
    : undefined;

  const enneType = enneResults
    ? `Type ${enneResults.primary_type}${enneResults.wing_type ? `w${enneResults.wing_type}` : ""}`
    : undefined;

  return {
    success: true,
    progress: {
      profile_completed: profile?.completed || false,
      onboarding_step: profile?.onboarding_step || 1,
      quiz_answered: enneAnswered ?? discAnswered ?? 0,
      quiz_completed: !!enneResults || !!discResults,
      enneagram_type: enneType,
      disc_type: discResults?.disc_type,
    },
  };
}

export async function revokeInvitation(id: string) {
  const staff = await requireStaff("manager");
  if (!staff) return { success: false, error: "Manager access required." };

  const adminClient = getAdminClientAs(staff);
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

  const adminClient = getAdminClientAs(staff);
  const { data: invitation, error: fetchError } = await adminClient.from("invitations")
    .select("user_id")
    .eq("id", invitationId)
    .single();

  if (fetchError || !invitation?.user_id) {
    return { success: false, error: "No candidate linked to this invitation." };
  }

  const userId = invitation.user_id;

  await adminClient.from("enneagram_results").delete().eq("user_id", userId);
  await adminClient.from("enneagram_responses").delete().eq("user_id", userId);
  await adminClient.from("disc_results").delete().eq("user_id", userId);
  await adminClient.from("disc_responses").delete().eq("user_id", userId);

  await adminClient.from("candidate_profiles")
    .update({ completed: false, onboarding_step: 1 })
    .eq("user_id", userId);

  return { success: true };
}

export async function resetQuiz(invitationId: string) {
  const staff = await requireStaff("manager");
  if (!staff) return { success: false, error: "Manager access required." };

  const adminClient = getAdminClientAs(staff);
  const { data: invitation, error: fetchError } = await adminClient.from("invitations")
    .select("user_id")
    .eq("id", invitationId)
    .single();

  if (fetchError || !invitation?.user_id) {
    return { success: false, error: "No candidate linked to this invitation." };
  }

  const userId = invitation.user_id;

  await adminClient.from("enneagram_results").delete().eq("user_id", userId);
  await adminClient.from("enneagram_responses").delete().eq("user_id", userId);
  await adminClient.from("disc_results").delete().eq("user_id", userId);
  await adminClient.from("disc_responses").delete().eq("user_id", userId);

  return { success: true };
}

export async function deleteCandidate(id: string) {
  const staff = await requireStaff("pa");
  if (!staff) return { success: false, error: "Not authorized." };

  const adminClient = getAdminClientAs(staff);

  // Get invitation details before deletion for cleanup + logging
  const { data: invitation } = await adminClient
    .from("invitations")
    .select("user_id, candidate_record_id, attached_files, candidate_name, email, status")
    .eq("id", id)
    .single();

  const userId = invitation?.user_id ?? null;
  const candidateRecordId = invitation?.candidate_record_id ?? null;

  // Transactional delete of all DB records (invitation, profiles, disc data)
  const { error } = await adminClient.rpc("delete_candidate", { p_invitation_id: id });
  if (error) {
    return { success: false, error: error.message };
  }

  // Delete the candidates row (cascades to activities, documents, interviews)
  if (candidateRecordId) {
    await adminClient.from("candidates").delete().eq("id", candidateRecordId);
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

  console.log(`[deleteCandidate] Deleted by ${staff.full_name} (${staff.role}) — invitation=${id}, candidate=${invitation?.candidate_name || invitation?.email || "unknown"}`);

  return { success: true };
}

export async function archiveInvitation(id: string) {
  const staff = await requireStaff("pa");
  if (!staff) return { success: false, error: "Staff access required." };

  const adminClient = getAdminClientAs(staff);
  const { error } = await adminClient.from("invitations")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .is("archived_at", null);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function unarchiveInvitation(id: string) {
  const staff = await requireStaff("pa");
  if (!staff) return { success: false, error: "Staff access required." };

  const adminClient = getAdminClientAs(staff);
  const { error } = await adminClient.from("invitations")
    .update({ archived_at: null })
    .eq("id", id)
    .not("archived_at", "is", null);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function removeInviteFile(invitationId: string, storagePath: string) {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  const adminClient = getAdminClientAs(staff);

  const { data: invitation } = await adminClient.from("invitations")
    .select("id, attached_files, invited_by_user_id")
    .eq("id", invitationId)
    .single();

  if (!invitation) return { success: false, error: "Invitation not found." };

  // P3-5: Only the inviting staff member or manager+ can remove files
  const isOwner = invitation.invited_by_user_id === staff.id;
  const isManagerPlus = ["manager", "director", "admin"].includes(staff.role);
  if (!isOwner && !isManagerPlus) {
    return { success: false, error: "Only the inviting staff or a manager can remove files." };
  }

  const files = (invitation.attached_files as unknown[] || []) as AttachedFile[];
  const updated = files.filter((f) => f.storage_path !== storagePath);

  // Only proceed if the file was actually found in the array
  if (updated.length === files.length) {
    return { success: false, error: "File not found in invitation." };
  }

  const { error: updateErr } = await adminClient.from("invitations")
    .update({ attached_files: JSON.parse(JSON.stringify(updated)) })
    .eq("id", invitationId);

  if (updateErr) return { success: false, error: "Failed to update file list." };

  // Only delete from storage after DB update succeeds AND file was in the array
  await deleteResumeFiles([storagePath]);

  return { success: true };
}
