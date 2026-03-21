"use server";

import { getAdminClient } from "@/lib/supabase/admin";
import { getStaffUser, type StaffUser } from "../actions";
import type { Database } from "@/lib/supabase/database.types";

type JobStatus = Database["public"]["Enums"]["job_status"];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface JobPosting {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  description: string | null;
  status: JobStatus;
  portal: string | null;
  portal_url: string | null;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
  closed_at: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MANAGER_ROLES = ["manager", "director", "admin"] as const;

async function requireManager(): Promise<StaffUser | null> {
  const user = await getStaffUser();
  if (!user) return null;
  if (!MANAGER_ROLES.includes(user.role as typeof MANAGER_ROLES[number])) return null;
  return user;
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function createJobPosting(data: {
  title: string;
  department?: string;
  location?: string;
  description?: string;
  portal?: string;
  portal_url?: string;
}): Promise<{ success: boolean; error?: string }> {
  const staff = await requireManager();
  if (!staff) return { success: false, error: "Manager access required." };

  if (!data.title.trim()) return { success: false, error: "Title is required." };

  const admin = getAdminClient();
  const { error } = await admin.from("jobs").insert({
    title: data.title.trim(),
    department: data.department?.trim() || null,
    location: data.location?.trim() || null,
    description: data.description?.trim() || null,
    portal: data.portal?.trim() || null,
    portal_url: data.portal_url?.trim() || null,
    status: "open" as JobStatus,
    created_by: staff.id,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function listJobPostings(): Promise<{
  success: boolean;
  data?: JobPosting[];
  error?: string;
}> {
  const staff = await getStaffUser();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();
  const { data, error } = await admin.from("jobs")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data || []) as JobPosting[] };
}

export async function updateJobPosting(
  jobId: string,
  data: {
    title?: string;
    department?: string;
    location?: string;
    description?: string;
    portal?: string;
    portal_url?: string;
    status?: JobStatus;
  }
): Promise<{ success: boolean; error?: string }> {
  const staff = await requireManager();
  if (!staff) return { success: false, error: "Manager access required." };

  const admin = getAdminClient();
  const update: Record<string, unknown> = {};
  if (data.title !== undefined) update.title = data.title.trim();
  if (data.department !== undefined) update.department = data.department.trim() || null;
  if (data.location !== undefined) update.location = data.location.trim() || null;
  if (data.description !== undefined) update.description = data.description.trim() || null;
  if (data.portal !== undefined) update.portal = data.portal.trim() || null;
  if (data.portal_url !== undefined) update.portal_url = data.portal_url.trim() || null;
  if (data.status !== undefined) {
    update.status = data.status;
    if (data.status === "closed") update.closed_at = new Date().toISOString();
  }

  const { error } = await admin.from("jobs").update(update).eq("id", jobId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteJobPosting(jobId: string): Promise<{ success: boolean; error?: string }> {
  const staff = await requireManager();
  if (!staff) return { success: false, error: "Manager access required." };

  const admin = getAdminClient();
  const { error } = await admin.from("jobs")
    .update({ archived_at: new Date().toISOString(), status: "archived" as JobStatus })
    .eq("id", jobId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
