"use server";

import { cookies } from "next/headers";
import { randomBytes, createHash } from "crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendInvitationEmail } from "@/lib/email";
import { getSignedPdfUrl, getSignedResumeUrl, getSignedDocUrl, uploadCandidatePdf, deleteResumeFiles } from "@/lib/supabase/storage";
import { generateProfilePdf, generateDiscPdf, type FullProfileData } from "@/lib/pdf";
import { computeDerivedFields, DISC_TYPE_INFO } from "@/app/candidate/disc-quiz/scoring";
import { STAFF_ROLES } from "@/lib/shared-types/roles";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StaffUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

// ─── Staff Authentication ────────────────────────────────────────────────────

export async function staffLogin(email: string, password: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, error: "Invalid email or password." };
  }

  // Admin-only: email+password login is restricted to admins
  const role = data.user.app_metadata?.role as string | undefined;
  if (role !== "admin") {
    await supabase.auth.signOut();
    return { success: false, error: "Email login is for admins only. Use phone OTP." };
  }

  const adminClient = getAdminClient();
  await adminClient.from("users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", data.user.id);

  return { success: true };
}

export async function staffSendOtp(phone: string) {
  const cleaned = phone.replace(/\s/g, "");
  if (!/^\+65\d{8}$/.test(cleaned)) {
    return { success: false, error: "Please enter a valid SG mobile number." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone: cleaned });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function staffVerifyOtp(phone: string, token: string) {
  if (!/^\d{6}$/.test(token)) {
    return { success: false, error: "Please enter a 6-digit code." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });

  if (error) {
    return { success: false, error: "Invalid or expired code. Please try again." };
  }

  const user = data.user;
  if (!user) {
    return { success: false, error: "Verification failed." };
  }

  // Verify user has a staff-level role
  const role = user.app_metadata?.role as string | undefined;
  if (!role || !(STAFF_ROLES as readonly string[]).includes(role)) {
    await supabase.auth.signOut();
    return { success: false, error: "Not authorized as staff. Contact your admin." };
  }

  // Update last_login_at
  const adminClient = getAdminClient();
  await adminClient.from("users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", user.id);

  return { success: true };
}

export async function requireStaff(minRole?: string): Promise<StaffUser | null> {
  // PRIMARY: Check Supabase Auth session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const role = user.app_metadata?.role as string | undefined;
    if (!role || !(STAFF_ROLES as readonly string[]).includes(role)) return null;

    // Enforce minimum role if specified
    if (minRole) {
      const userLevel = (STAFF_ROLES as readonly string[]).indexOf(role);
      const requiredLevel = (STAFF_ROLES as readonly string[]).indexOf(minRole);
      if (userLevel < 0 || requiredLevel < 0 || userLevel < requiredLevel) return null;
    }

    // Fetch profile from public.users
    const adminClient = getAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("id, full_name, email, role")
      .eq("id", user.id)
      .single();

    if (profile) return profile as StaffUser;

    // Profile missing in public.users — return from auth metadata
    return {
      id: user.id,
      full_name: (user.user_metadata?.full_name as string) || user.email || "Staff",
      email: user.email || "",
      role: role,
    };
  }

  // FALLBACK (transition period): Check old staff_session cookie
  // Remove this block after all staff have migrated to individual accounts
  // Legacy sessions have no role — deny any minRole requirement
  if (minRole) return null;

  const cookieStore = await cookies();
  const session = cookieStore.get("staff_session")?.value;
  if (session) {
    const tokenHash = createHash("sha256").update(session).digest("hex");
    const adminClient = getAdminClient();
    const { data } = await adminClient.from("staff_sessions")
      .select("id")
      .eq("token_hash", tokenHash)
      .gt("expires_at", new Date().toISOString())
      .limit(1);

    if (data && data.length > 0) {
      return { id: "legacy", full_name: "Staff", email: "", role: "staff" };
    }

    // Legacy plaintext cookie fallback
    if (session === process.env.STAFF_SECRET) {
      return { id: "legacy", full_name: "Staff", email: "", role: "staff" };
    }
  }

  return null;
}

export async function staffLogout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Also clear old cookie if present (transition)
  const cookieStore = await cookies();
  cookieStore.delete("staff_session");

  redirect("/staff/login");
}

/** Returns the current staff user for use in server components / layouts. */
export async function getStaffUser(): Promise<StaffUser | null> {
  return requireStaff();
}

// ─── Invitations ─────────────────────────────────────────────────────────────

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
  // Admin-only action
  const staff = await requireStaff("admin");
  if (!staff) return { success: false, error: "Admin access required." };

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

export async function getPdfUrl(filePath: string): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  const url = await getSignedPdfUrl(filePath);
  if (!url) return { success: false, error: "Failed to generate download URL." };

  return { success: true, url };
}

export async function getInviteFileUrl(storagePath: string): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  if (!storagePath.startsWith("invitations/")) {
    return { success: false, error: "Invalid file path." };
  }

  const url = await getSignedResumeUrl(storagePath);
  if (!url) return { success: false, error: "Failed to generate download URL." };

  return { success: true, url };
}

export async function getCandidateDocUrl(storagePath: string): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  if (!storagePath.startsWith("candidates/")) {
    return { success: false, error: "Invalid file path." };
  }

  const url = await getSignedDocUrl(storagePath);
  if (!url) return { success: false, error: "Failed to generate download URL." };

  return { success: true, url };
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

/**
 * Backfill PDFs for existing candidates who completed their application/quiz
 * before PDF storage was added. Runs once on staff portal load.
 */
export async function backfillPdfs(): Promise<{ generated: number }> {
  const staff = await requireStaff();
  if (!staff) return { generated: 0 };

  const adminClient = getAdminClient();

  // Find invitations with completed work but missing PDFs
  const { data: invitations } = await adminClient.from("invitations")
    .select("id, user_id, profile_pdf_path, disc_pdf_path")
    .not("user_id", "is", null)
    .eq("status", "accepted");

  if (!invitations || invitations.length === 0) return { generated: 0 };

  let generated = 0;

  for (const inv of invitations) {
    const userId = inv.user_id!;

    // Backfill profile PDF
    if (!inv.profile_pdf_path) {
      const { data: profile } = await adminClient.from("candidate_profiles")
        .select("*")
        .eq("user_id", userId)
        .eq("completed", true)
        .single();

      if (profile) {
        try {
          const profileData: FullProfileData = {
            full_name: profile.full_name,
            position_applied: profile.position_applied || "",
            expected_salary: profile.expected_salary || "",
            salary_period: profile.salary_period || "month",
            date_available: profile.date_available,
            date_of_birth: profile.date_of_birth,
            place_of_birth: profile.place_of_birth || "",
            nationality: profile.nationality || "",
            race: profile.race || "",
            gender: profile.gender || "",
            marital_status: profile.marital_status || "",
            address_block: profile.address_block || "",
            address_street: profile.address_street || "",
            address_unit: profile.address_unit,
            address_postal: profile.address_postal || "",
            contact_number: profile.contact_number || "",
            email: profile.email || "",
            ns_enlistment_date: profile.ns_enlistment_date,
            ns_ord_date: profile.ns_ord_date,
            ns_service_status: profile.ns_service_status,
            ns_status: profile.ns_status,
            ns_exemption_reason: profile.ns_exemption_reason,
            emergency_name: profile.emergency_name || "",
            emergency_relationship: profile.emergency_relationship || "",
            emergency_contact: profile.emergency_contact || "",
            education: (profile.education || {}) as unknown as FullProfileData["education"],
            software_competencies: profile.software_competencies,
            shorthand_wpm: profile.shorthand_wpm,
            typing_wpm: profile.typing_wpm,
            languages: (profile.languages || []) as unknown as FullProfileData["languages"],
            employment_history: (profile.employment_history || []) as unknown as FullProfileData["employment_history"],
            additional_health: profile.additional_health ?? false,
            additional_health_detail: profile.additional_health_detail,
            additional_dismissed: profile.additional_dismissed ?? false,
            additional_dismissed_detail: profile.additional_dismissed_detail,
            additional_convicted: profile.additional_convicted ?? false,
            additional_convicted_detail: profile.additional_convicted_detail,
            additional_bankrupt: profile.additional_bankrupt ?? false,
            additional_bankrupt_detail: profile.additional_bankrupt_detail,
            additional_relatives: profile.additional_relatives ?? false,
            additional_relatives_detail: profile.additional_relatives_detail,
            additional_prev_applied: profile.additional_prev_applied ?? false,
            additional_prev_applied_detail: profile.additional_prev_applied_detail,
            declaration_agreed: profile.declaration_agreed ?? false,
            declaration_date: profile.declaration_date || new Date().toISOString(),
          };

          const pdfBuffer = await generateProfilePdf(profileData);
          const filePath = await uploadCandidatePdf(userId, "application", pdfBuffer);
          if (filePath) {
            await adminClient.from("invitations")
              .update({ profile_pdf_path: filePath })
              .eq("id", inv.id);
            generated++;
          }
        } catch (err) {
          console.error(`[backfill] Profile PDF failed for ${userId}:`, err);
        }
      }
    }

    // Backfill DISC PDF
    if (!inv.disc_pdf_path) {
      const [{ data: results }, { data: profile }] = await Promise.all([
        adminClient.from("disc_results").select("*").eq("user_id", userId).single(),
        adminClient.from("candidate_profiles").select("full_name").eq("user_id", userId).single(),
      ]);

      if (results) {
        try {
          const { profile_strength, strength_pct, priorities } = computeDerivedFields(
            results.d_raw, results.i_raw, results.s_raw, results.c_raw, results.angle
          );
          const isBalanced = profile_strength === "balanced";
          const typeInfo = isBalanced ? DISC_TYPE_INFO["Balanced"] : DISC_TYPE_INFO[results.disc_type];

          if (typeInfo) {
            const pdfBuffer = await generateDiscPdf({
              full_name: profile?.full_name || "Unknown",
              disc_type: results.disc_type,
              d_pct: results.d_pct,
              i_pct: results.i_pct,
              s_pct: results.s_pct,
              c_pct: results.c_pct,
              angle: results.angle,
              profile_strength,
              strength_pct,
              priorities,
              typeInfo,
            });
            const filePath = await uploadCandidatePdf(userId, "disc-profile", pdfBuffer);
            if (filePath) {
              await adminClient.from("invitations")
                .update({ disc_pdf_path: filePath })
                .eq("id", inv.id);
              generated++;
            }
          }
        } catch (err) {
          console.error(`[backfill] DISC PDF failed for ${userId}:`, err);
        }
      }
    }
  }

  console.log(`[backfill] Generated ${generated} PDFs`);
  return { generated };
}
