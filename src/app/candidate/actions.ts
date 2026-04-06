"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendCandidateAssignedEmail } from "@/lib/email";
import { redirect } from "next/navigation";
import { checkRateLimitAsync } from "@/lib/rate-limit";

// ── Validate invite token (used by acceptInvite internally) ─────────────────

export async function validateInviteToken(token: string): Promise<{
  valid: boolean;
  candidateName?: string;
  position?: string;
  error?: string;
}> {
  if (!token) return { valid: false, error: "No token provided." };

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("invitations")
    .select("id, candidate_name, position_applied, status, expires_at")
    .eq("token", token)
    .single();

  if (error || !data) {
    return { valid: false, error: "Invalid invitation link." };
  }

  if (data.status !== "pending" && data.status !== "accepted") {
    return { valid: false, error: "This invitation has already been used or revoked." };
  }

  if (data.status === "pending" && new Date(data.expires_at) < new Date()) {
    return { valid: false, error: "This invitation link has expired. Please contact us for a new one." };
  }

  return {
    valid: true,
    candidateName: data.candidate_name || undefined,
    position: data.position_applied || undefined,
  };
}

// ── Accept invitation (token-based auth — no OTP) ──────────────────────────

export async function acceptInvite(token: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!token) return { success: false, error: "No token provided." };

  // Rate limit
  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  const { allowed } = await checkRateLimitAsync(`candidate-accept:${ip}`, 10);
  if (!allowed) return { success: false, error: "Too many attempts. Please wait a minute." };

  const admin = getAdminClient();

  // ── Step 1: Validate invitation (BEFORE creating auth user — FM-16) ───
  const { data: invitation, error: invError } = await admin
    .from("invitations")
    .select("id, email, candidate_name, position_applied, status, expires_at, job_id, invited_by_user_id, assigned_manager_id, attached_files, user_id, candidate_record_id")
    .eq("token", token)
    .single();

  if (invError || !invitation) {
    return { success: false, error: "Invalid invitation link." };
  }

  if (invitation.status === "revoked") {
    return { success: false, error: "This invitation has been revoked. Please contact us for a new one." };
  }

  if (invitation.status === "pending" && new Date(invitation.expires_at) < new Date()) {
    return { success: false, error: "This invitation link has expired. Please contact us for a new one." };
  }

  // Use invitation email, or generate synthetic for mobile-created invites with no email
  const authEmail = invitation.email?.trim()
    ? invitation.email.trim()
    : `candidate-${invitation.id}@lyfe.internal`;

  // ── Step 2: Create or find auth user ──────────────────────────────────
  let authUserId: string;

  if (invitation.status === "accepted" && invitation.user_id) {
    // Returning candidate — user already exists
    authUserId = invitation.user_id;
  } else {
    // Try to create new auth user
    const { data: createData, error: createError } =
      await admin.auth.admin.createUser({
        email: authEmail,
        email_confirm: true,
        app_metadata: { role: "candidate" },
        user_metadata: { full_name: invitation.candidate_name || "" },
      });

    if (createError) {
      // Handle "User already registered" — FM-3
      if (createError.message?.includes("already been registered")) {
        // Look up existing user by email
        const { data: listData } = await admin.auth.admin.listUsers({
          page: 1,
          perPage: 1,
        });
        const existingUser = listData?.users?.find(
          (u) => u.email === authEmail
        );

        if (!existingUser) {
          // Can't find the user — try by invitation.user_id
          if (invitation.user_id) {
            authUserId = invitation.user_id;
          } else {
            return { success: false, error: "Account setup failed. Please contact us." };
          }
        } else {
          // FM-24: Check if existing user is staff
          const existingRole = existingUser.app_metadata?.role as string | undefined;
          if (existingRole && existingRole !== "candidate") {
            return {
              success: false,
              error: "This email is already registered as a staff account. Please contact your administrator.",
            };
          }
          authUserId = existingUser.id;
        }
      } else {
        console.error("[token-auth] createUser failed:", createError.message);
        return { success: false, error: "Account setup failed. Please try again." };
      }
    } else {
      authUserId = createData.user.id;
    }
  }

  // ── Step 3: Establish session via generateLink + verifyOtp ────────────
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email: authEmail,
    });

  if (linkError || !linkData.properties?.hashed_token) {
    console.error("[token-auth] generateLink failed:", linkError?.message);
    return { success: false, error: "Session setup failed. Please try again." };
  }

  const serverClient = await createClient();
  const { data: verifyData, error: verifyError } =
    await serverClient.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });

  if (verifyError || !verifyData.session) {
    console.error("[token-auth] verifyOtp failed:", verifyError?.message);
    return { success: false, error: "Session setup failed. Please try again." };
  }

  // ── Step 4: Handle returning candidate (existing profile) ─────────────
  const { data: existingProfile } = await admin
    .from("candidate_profiles")
    .select("id, candidate_id")
    .eq("user_id", authUserId)
    .single();

  if (existingProfile) {
    // Returning candidate — update profile with this invitation's data if pending
    if (invitation.status === "pending") {
      await admin.from("candidate_profiles")
        .update({
          email: invitation.email,
          full_name: invitation.candidate_name || "",
          position_applied: invitation.position_applied || "",
          invitation_id: invitation.id,
        })
        .eq("user_id", authUserId);

      // Bridge attached files for returning candidates
      if (invitation.attached_files && existingProfile.candidate_id) {
        const files = invitation.attached_files as {
          label: string;
          file_name: string;
          storage_path: string;
        }[];
        if (files.length > 0) {
          await admin.from("candidate_documents").insert(
            files.map((f) => ({
              candidate_id: existingProfile.candidate_id!,
              label: f.label,
              file_name: f.file_name,
              file_url: f.storage_path,
            }))
          );
        }
      }

      // Consume the invitation
      await admin.from("invitations")
        .update({
          status: "accepted",
          user_id: authUserId,
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invitation.id)
        .eq("status", "pending");
    }

    redirect("/candidate/onboarding");
  }

  // ── Step 5: New candidate — consume invitation + create records ────────
  // Atomic: only matches if status is still 'pending' and not expired
  const { data: consumed } = await admin
    .from("invitations")
    .update({
      status: "accepted",
      user_id: authUserId,
      accepted_at: new Date().toISOString(),
    })
    .eq("token", token)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .select("id")
    .maybeSingle();

  if (!consumed) {
    // Invitation was consumed by a concurrent request or expired
    // Try to clean up the auth user we just created
    // (only if we created it — returning candidates keep their user)
    if (!invitation.user_id) {
      await admin.auth.admin.deleteUser(authUserId).catch(() => {});
    }
    await serverClient.auth.signOut();
    return { success: false, error: "This invitation is no longer valid. Please contact us." };
  }

  // Create candidates pipeline record FIRST (profile needs candidate_id)
  let createdBy: string | null = invitation.invited_by_user_id;
  if (!createdBy) {
    const { data: fallbackAdmin } = await admin.from("users")
      .select("id")
      .eq("role", "admin")
      .limit(1)
      .single();
    createdBy = fallbackAdmin?.id ?? null;
  }

  if (!createdBy) {
    console.error("[acceptInvite] No invited_by_user_id and no admin user found — cannot create candidate record");
    return { success: false, error: "Account setup failed. Please contact us." };
  }

  const candidateName = invitation.candidate_name || invitation.email || "Unknown";
  const now = new Date().toISOString();

  let stageId: string | null = null;
  if (invitation.job_id) {
    const { data: firstStage } = await admin.from("pipeline_stages")
      .select("id")
      .eq("job_id", invitation.job_id)
      .order("display_order")
      .limit(1)
      .single();
    stageId = firstStage?.id || null;
  }

  const { data: candidateRecord, error: candidateError } = await admin.from("candidates").insert({
    name: candidateName,
    phone: null,
    email: invitation.email,
    status: "applied",
    job_id: invitation.job_id || null,
    current_stage_id: stageId,
    stage_entered_at: stageId ? now : null,
    assigned_manager_id: invitation.assigned_manager_id || createdBy,
    created_by_id: createdBy,
  }).select("id").single();

  if (candidateError || !candidateRecord) {
    console.error("[acceptInvite] Failed to create candidates record:", candidateError?.message);
    return { success: false, error: "Account setup failed. Please try again." };
  }

  // Link invitation to candidates row
  await admin.from("invitations")
    .update({ candidate_record_id: candidateRecord.id })
    .eq("id", invitation.id);

  // Create draft profile
  const { error: profileError } = await admin.from("candidate_profiles").upsert(
    {
      user_id: authUserId,
      candidate_id: candidateRecord.id,
      email: invitation.email,
      full_name: invitation.candidate_name || "",
      position_applied: invitation.position_applied || "",
      contact_number: "",
      invitation_id: invitation.id,
      completed: false,
      onboarding_step: 1,
    },
    { onConflict: "user_id" }
  );

  if (profileError) {
    console.error("[acceptInvite] Failed to create candidate_profiles record:", profileError.message);
    return { success: false, error: "Account setup failed. Please try again." };
  }

  // Non-critical: notify manager + bridge files (fire-and-forget)
  const managerId = invitation.assigned_manager_id || createdBy;
  const { data: manager } = await admin.from("users")
    .select("full_name, email")
    .eq("id", managerId)
    .single();

  await admin.from("notifications").insert({
    user_id: managerId,
    type: "candidate_assigned",
    title: "New candidate assigned",
    body: `${candidateName} has been assigned to you.`,
    data: { candidate_id: candidateRecord.id },
  }).then(null, (err) => console.error("[acceptInvite] notification insert failed:", err));

  if (manager?.email) {
    sendCandidateAssignedEmail({
      to: manager.email,
      managerName: manager.full_name,
      candidateName,
      candidateId: candidateRecord.id,
    });
  }

  if (invitation.attached_files) {
    const files = invitation.attached_files as {
      label: string;
      file_name: string;
      storage_path: string;
    }[];
    if (files.length > 0) {
      await admin.from("candidate_documents").insert(
        files.map((f) => ({
          candidate_id: candidateRecord.id,
          label: f.label,
          file_name: f.file_name,
          file_url: f.storage_path,
        }))
      ).then(null, (err) => console.error("[acceptInvite] candidate_documents insert failed:", err));
    }
  }

  redirect("/candidate/onboarding");
}

// ── Sign out ────────────────────────────────────────────────────────────────

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/candidate/signed-out");
}
