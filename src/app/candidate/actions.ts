"use server";

import { createClient } from "@/lib/supabase/server";
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

export async function verifyOtp(phone: string, token: string) {
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

  // Check if user has a role assigned
  const role = data.user?.app_metadata?.role as string | undefined;

  if (!role) {
    // New user — assign candidate role via database function
    // (SECURITY DEFINER function that only sets role if none exists)
    await supabase.rpc("assign_candidate_role");
  } else if (role !== "candidate") {
    // Existing user with non-candidate role — deny access
    await supabase.auth.signOut();
    return {
      success: false,
      error: "This portal is for candidates only. Please use the correct portal for your role.",
    };
  }

  redirect("/candidate/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/candidate/login");
}
