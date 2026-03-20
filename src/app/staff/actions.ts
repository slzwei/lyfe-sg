"use server";

import { cookies } from "next/headers";
import { randomBytes } from "crypto";
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

  const cookieStore = await cookies();
  cookieStore.set("staff_session", secret, {
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
  if (!session || session !== process.env.STAFF_SECRET) {
    return null;
  }
  return session;
}

// ─── Invitations ─────────────────────────────────────────────────────────────

export async function sendInvite(data: {
  email: string;
  candidateName?: string;
  position?: string;
}) {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  if (!data.email || !data.email.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const token = randomBytes(32).toString("base64url");
  const admin = getAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("invitations") as any).insert({
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

export interface Invitation {
  id: string;
  email: string;
  candidate_name: string | null;
  position_applied: string | null;
  status: string;
  created_at: string;
  expires_at: string;
}

export async function listInvitations(): Promise<{
  success: boolean;
  data?: Invitation[];
  error?: string;
}> {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin.from("invitations") as any)
    .select("id, email, candidate_name, position_applied, status, created_at, expires_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return { success: false, error: (error as { message: string }).message };
  }

  return { success: true, data: data as Invitation[] };
}

export async function revokeInvitation(id: string) {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("invitations") as any)
    .update({ status: "revoked" })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
