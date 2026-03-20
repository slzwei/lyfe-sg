"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function sendOtp(phone: string) {
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
    .single() as { data: { id: string; candidate_name: string | null; position_applied: string | null; status: string; expires_at: string } | null; error: unknown };

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
    await supabase.rpc("assign_candidate_role");
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
    .single() as { data: { id: string } | null; error: unknown };

  if (existingProfile) {
    // Existing candidate — allow login without invite token
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
  interface InvitationRow {
    id: string;
    email: string;
    candidate_name: string | null;
    position_applied: string | null;
    expires_at: string;
  }
  const { data: invitation, error: invError } = await admin
    .from("invitations")
    .select("id, email, candidate_name, position_applied, expires_at")
    .eq("token", inviteToken)
    .eq("status", "pending")
    .single() as { data: InvitationRow | null; error: unknown };

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from("invitations") as any)
    .update({
      status: "accepted",
      user_id: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invitation.id);

  // Create draft profile with pre-filled data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from("candidate_profiles") as any).upsert(
    {
      user_id: user.id,
      email: invitation.email,
      full_name: invitation.candidate_name || "",
      position_applied: invitation.position_applied || "",
      contact_number: phone,
      invitation_id: invitation.id,
      completed: false,
    },
    { onConflict: "user_id" }
  );

  redirect("/candidate/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/candidate/signed-out");
}
