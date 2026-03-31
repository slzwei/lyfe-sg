"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendCandidateAssignedEmail } from "@/lib/email";
import { redirect } from "next/navigation";
import { checkRateLimit } from "@/lib/rate-limit";

export async function sendOtp(phone: string) {
  const cleaned = phone.replace(/\s/g, "");
  if (!/^\+65\d{8}$/.test(cleaned)) {
    return { success: false, error: "Please enter a valid SG mobile number." };
  }

  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  const { allowed } = checkRateLimit(`candidate-otp:${ip}`, 5);
  if (!allowed) return { success: false, error: "Too many attempts. Please wait a minute." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone: cleaned });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

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

  if (data.status !== "pending") {
    return { valid: false, error: "This invitation has already been used or revoked." };
  }

  if (new Date(data.expires_at) < new Date()) {
    return { valid: false, error: "This invitation link has expired. Please contact us for a new one." };
  }

  return {
    valid: true,
    candidateName: data.candidate_name || undefined,
    position: data.position_applied || undefined,
  };
}

export async function verifyOtp(phone: string, token: string, inviteToken?: string) {
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

  // Check if user has a role assigned
  const role = user.app_metadata?.role as string | undefined;

  if (!role) {
    // New user — assign candidate role
    try {
      await supabase.rpc("assign_candidate_role");
      await supabase.auth.refreshSession();
    } catch (e) {
      console.error("[auth] Failed to assign candidate role:", e);
    }
  } else if (role !== "candidate") {
    await supabase.auth.signOut();
    return {
      success: false,
      error: "This portal is for candidates only. Please use the correct portal for your role.",
    };
  }

  // Grandfathering: check if existing profile exists
  const admin = getAdminClient();
  const { data: existingProfile } = await admin
    .from("candidate_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existingProfile) {
    // Existing candidate — if they have an invite token, apply invitation data
    if (inviteToken) {
      const { data: inv } = await admin.from("invitations")
        .select("id, email, candidate_name, position_applied, expires_at, job_id, invited_by_user_id, attached_files")
        .eq("token", inviteToken)
        .eq("status", "pending")
        .single();

      if (inv && new Date(inv.expires_at) > new Date()) {
        // Mark invitation as accepted
        await admin.from("invitations")
          .update({
            status: "accepted",
            user_id: user.id,
            accepted_at: new Date().toISOString(),
          })
          .eq("id", inv.id);

        // Update profile with invitation data
        await admin.from("candidate_profiles")
          .update({
            email: inv.email,
            full_name: inv.candidate_name || "",
            position_applied: inv.position_applied || "",
            invitation_id: inv.id,
          })
          .eq("user_id", user.id);

        // Bridge attached files to candidate_documents for returning candidates
        if (inv.attached_files) {
          const { data: profile } = await admin.from("candidate_profiles")
            .select("candidate_id")
            .eq("user_id", user.id)
            .single();

          if (profile?.candidate_id) {
            const files = inv.attached_files as {
              label: string;
              file_name: string;
              storage_path: string;
            }[];
            if (files.length > 0) {
              await admin.from("candidate_documents").insert(
                files.map((f) => ({
                  candidate_id: profile.candidate_id!,
                  label: f.label,
                  file_name: f.file_name,
                  file_url: f.storage_path,
                }))
              );
            }
          }
        }
      }
    }
    redirect("/candidate/onboarding");
  }

  // New candidate — require invite token
  if (!inviteToken) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: "This portal is invite-only. Please use the invitation link from your email.",
    };
  }

  // Validate and consume invitation
  const { data: invitation, error: invError } = await admin
    .from("invitations")
    .select("id, email, candidate_name, position_applied, expires_at, job_id, invited_by_user_id, assigned_manager_id, attached_files")
    .eq("token", inviteToken)
    .eq("status", "pending")
    .single();

  if (invError || !invitation) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: "Invalid or expired invitation. Please contact us for a new one.",
    };
  }

  if (new Date(invitation.expires_at) < new Date()) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: "This invitation has expired. Please contact us for a new one.",
    };
  }

  // Mark invitation as accepted
  await admin.from("invitations")
    .update({
      status: "accepted",
      user_id: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invitation.id);

  // Create draft profile with pre-filled data
  const profileUpsert = await admin.from("candidate_profiles").upsert(
    {
      user_id: user.id,
      email: invitation.email,
      full_name: invitation.candidate_name || "",
      position_applied: invitation.position_applied || "",
      contact_number: phone,
      invitation_id: invitation.id,
      completed: false,
      onboarding_step: 1,
    },
    { onConflict: "user_id" }
  ).select("id").single();

  // Bridge to ATS pipeline: always create a candidates record
  {
    // Resolve the staff user who invited, fallback to any admin
    let createdBy: string | null = invitation.invited_by_user_id;
    if (!createdBy) {
      const { data: fallbackAdmin } = await admin.from("users")
        .select("id")
        .eq("role", "admin")
        .limit(1)
        .single();
      createdBy = fallbackAdmin?.id ?? null;
    }

    if (createdBy) {
      const now = new Date().toISOString();

      // If linked to a job, resolve the first pipeline stage
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

      // Strip '+' prefix to match auth.users / public.users phone format
      const normalizedPhone = phone.replace(/^\+/, "");
      const { data: candidateRecord } = await admin.from("candidates").insert({
        name: invitation.candidate_name || phone,
        phone: normalizedPhone,
        email: invitation.email,
        status: "applied",
        job_id: invitation.job_id || null,
        current_stage_id: stageId,
        stage_entered_at: stageId ? now : null,
        assigned_manager_id: invitation.assigned_manager_id || createdBy,
        created_by_id: createdBy,
      }).select("id").single();

      // Link candidate_profiles and invitation to candidates record
      if (candidateRecord && profileUpsert.data) {
        await admin.from("candidate_profiles")
          .update({ candidate_id: candidateRecord.id })
          .eq("id", profileUpsert.data.id);

        await admin.from("invitations")
          .update({ candidate_record_id: candidateRecord.id })
          .eq("id", invitation.id);

        // Notify assigned manager of new candidate
        const managerId = invitation.assigned_manager_id || createdBy;
        if (managerId) {
          const { data: manager } = await admin.from("users")
            .select("full_name, email")
            .eq("id", managerId)
            .single();

          const candName = invitation.candidate_name || phone;
          await admin.from("notifications").insert({
            user_id: managerId,
            type: "candidate_assigned",
            title: "New candidate assigned",
            body: `${candName} has been assigned to you.`,
            data: { candidate_id: candidateRecord.id },
          });

          if (manager?.email) {
            sendCandidateAssignedEmail({
              to: manager.email,
              managerName: manager.full_name,
              candidateName: candName,
              candidateId: candidateRecord.id,
            });
          }
        }

        // Bridge attached files to candidate_documents
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
            );
          }
        }
      }
    }
  }

  redirect("/candidate/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/candidate/signed-out");
}
