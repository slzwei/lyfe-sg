"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { STAFF_ROLES } from "@/lib/shared-types/roles";
import { checkRateLimit } from "@/lib/rate-limit";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StaffUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

// ─── Staff Authentication ────────────────────────────────────────────────────

export async function staffLogin(email: string, password: string) {
  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  const { allowed } = checkRateLimit(`staff-login:${ip}`, 5);
  if (!allowed) return { success: false, error: "Too many attempts. Please wait a minute." };

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

  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  const { allowed } = checkRateLimit(`staff-otp:${ip}`, 5);
  if (!allowed) return { success: false, error: "Too many attempts. Please wait a minute." };

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
      .select("id, full_name, email, role, is_active")
      .eq("id", user.id)
      .single();

    // Block deactivated users
    if (profile && profile.is_active === false) return null;

    if (profile) return profile as StaffUser;

    // Profile missing in public.users — return from auth metadata
    return {
      id: user.id,
      full_name: (user.user_metadata?.full_name as string) || user.email || "Staff",
      email: user.email || "",
      role: role,
    };
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
