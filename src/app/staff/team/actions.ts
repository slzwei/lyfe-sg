"use server";

import { randomBytes } from "crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { getStaffUser, type StaffUser } from "../actions";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import type { Database } from "@/lib/supabase/database.types";

// DB enum: admin | director | manager | agent | pa | candidate
// Staff-level roles (anyone who can access the staff portal):
const STAFF_ROLES = ["manager", "director", "admin"] as const;

async function requireAdmin(): Promise<StaffUser | null> {
  const user = await getStaffUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

async function requireManager(): Promise<StaffUser | null> {
  const user = await getStaffUser();
  if (!user) return null;
  const level = STAFF_ROLES.indexOf(user.role as typeof STAFF_ROLES[number]);
  if (level < STAFF_ROLES.indexOf("manager")) return null;
  return user;
}

export async function listStaff(): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    full_name: string;
    email: string | null;
    role: string;
    is_active: boolean | null;
    last_login_at: string | null;
    created_at: string | null;
  }>;
  error?: string;
}> {
  const staff = await requireManager();
  if (!staff) return { success: false, error: "Manager access required." };

  const admin = getAdminClient();
  const { data, error } = await admin.from("users")
    .select("id, full_name, email, role, is_active, last_login_at, created_at")
    .in("role", STAFF_ROLES)
    .order("created_at", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

export async function inviteStaff(data: {
  email: string;
  fullName: string;
  role: string;
}): Promise<{ success: boolean; error?: string }> {
  const staff = await requireAdmin();
  if (!staff) return { success: false, error: "Admin access required." };

  if (!data.email || !data.fullName) {
    return { success: false, error: "Email and name are required." };
  }

  if (!STAFF_ROLES.includes(data.role as typeof STAFF_ROLES[number])) {
    return { success: false, error: "Invalid role." };
  }

  const tempPassword = randomBytes(12).toString("base64url");
  const admin = getAdminClient();

  // 1. Create auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: data.email,
    password: tempPassword,
    email_confirm: true,
    app_metadata: { role: data.role },
    user_metadata: { full_name: data.fullName },
  });

  if (authError) {
    return { success: false, error: authError.message };
  }

  // 2. Explicitly create public.users entry (NO trigger — FMEA FM-1)
  type UserRole = Database["public"]["Enums"]["user_role"];
  const { error: profileError } = await admin.from("users").insert({
    id: authData.user.id,
    email: data.email,
    full_name: data.fullName,
    role: data.role as UserRole,
    is_active: true,
  });

  if (profileError) {
    console.error("[team] Failed to create users profile:", profileError);
    // Auth user was created — log the issue but don't fail silently
  }

  // 3. Send welcome email with temp password
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  await sendEmail({
    to: data.email,
    subject: "Welcome to Lyfe Staff Portal",
    html: `
      <p>Hi ${data.fullName},</p>
      <p>You've been invited to the Lyfe Staff Portal as <strong>${data.role}</strong>.</p>
      <p>Sign in at <a href="${siteUrl}/staff/login">${siteUrl}/staff/login</a> with:</p>
      <table style="margin:16px 0;border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;color:#888">Email</td><td style="padding:4px 0">${data.email}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888">Password</td><td style="padding:4px 0;font-family:monospace">${tempPassword}</td></tr>
      </table>
      <p>Please change your password after signing in.</p>
    `,
  });

  return { success: true };
}

export async function updateStaffRole(
  userId: string,
  newRole: string
): Promise<{ success: boolean; error?: string }> {
  const staff = await requireAdmin();
  if (!staff) return { success: false, error: "Admin access required." };

  if (!STAFF_ROLES.includes(newRole as typeof STAFF_ROLES[number])) {
    return { success: false, error: "Invalid role." };
  }

  // Prevent self-demotion
  if (userId === staff.id) {
    return { success: false, error: "Cannot change your own role." };
  }

  const admin = getAdminClient();

  // Update public.users
  const { error: dbError } = await admin.from("users")
    .update({ role: newRole as Database["public"]["Enums"]["user_role"] })
    .eq("id", userId);

  if (dbError) return { success: false, error: dbError.message };

  // Update auth.users app_metadata
  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role: newRole },
  });

  if (authError) return { success: false, error: authError.message };

  return { success: true };
}

export async function deactivateStaff(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const staff = await requireAdmin();
  if (!staff) return { success: false, error: "Admin access required." };

  if (userId === staff.id) {
    return { success: false, error: "Cannot deactivate yourself." };
  }

  const admin = getAdminClient();
  const { error } = await admin.from("users")
    .update({ is_active: false })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };

  return { success: true };
}

export async function reactivateStaff(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const staff = await requireAdmin();
  if (!staff) return { success: false, error: "Admin access required." };

  const admin = getAdminClient();
  const { error } = await admin.from("users")
    .update({ is_active: true })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };

  return { success: true };
}

export async function resetStaffPassword(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const staff = await requireAdmin();
  if (!staff) return { success: false, error: "Admin access required." };

  const admin = getAdminClient();
  const { data: targetUser } = await admin.from("users")
    .select("email")
    .eq("id", userId)
    .single();

  if (!targetUser?.email) {
    return { success: false, error: "User has no email." };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(targetUser.email, {
    redirectTo: `${siteUrl}/staff/reset-password`,
  });

  if (error) return { success: false, error: error.message };

  return { success: true };
}
