"use server";

import { getAdminClient } from "@/lib/supabase/admin";
import { getStaffUser, type StaffUser } from "../actions";
import type { Database } from "@/lib/supabase/database.types";

type JobStatus = Database["public"]["Enums"]["job_status"];
type StageType = Database["public"]["Enums"]["stage_type"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MANAGER_ROLES = ["manager", "director", "admin"] as const;

async function requireManager(): Promise<StaffUser | null> {
  const user = await getStaffUser();
  if (!user) return null;
  if (!MANAGER_ROLES.includes(user.role as typeof MANAGER_ROLES[number])) return null;
  return user;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Job {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  description: string | null;
  status: JobStatus;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
  closed_at: string | null;
  archived_at: string | null;
  candidate_count?: number;
  stages?: PipelineStage[];
}

export interface PipelineStage {
  id: string;
  job_id: string;
  name: string;
  stage_type: StageType;
  display_order: number;
  candidate_count?: number;
}

export interface PipelineCandidate {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  status: string;
  current_stage_id: string | null;
  stage_entered_at: string | null;
  job_id: string | null;
  notes: string | null;
  created_at: string | null;
  disc_type?: string | null;
  has_invitation?: boolean;
}

// ─── Jobs CRUD ───────────────────────────────────────────────────────────────

export async function createJob(data: {
  title: string;
  department?: string;
  location?: string;
  description?: string;
}): Promise<{ success: boolean; job?: Job; error?: string }> {
  const staff = await requireManager();
  if (!staff) return { success: false, error: "Manager access required." };

  if (!data.title.trim()) return { success: false, error: "Title is required." };

  const admin = getAdminClient();

  const { data: job, error } = await admin.from("jobs").insert({
    title: data.title.trim(),
    department: data.department?.trim() || null,
    location: data.location?.trim() || null,
    description: data.description?.trim() || null,
    status: "draft" as JobStatus,
    created_by: staff.id,
  }).select().single();

  if (error) return { success: false, error: error.message };

  // Create default pipeline stages
  await admin.rpc("create_default_pipeline", { p_job_id: job.id });

  return { success: true, job: job as Job };
}

export async function listJobs(): Promise<{
  success: boolean;
  data?: Job[];
  error?: string;
}> {
  const staff = await getStaffUser();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();
  const { data: jobs, error } = await admin.from("jobs")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };

  // Count candidates per job
  const jobIds = jobs.map((j) => j.id);
  const countMap = new Map<string, number>();

  if (jobIds.length > 0) {
    const { data: candidates } = await admin.from("candidates")
      .select("job_id")
      .in("job_id", jobIds);

    if (candidates) {
      for (const c of candidates) {
        if (c.job_id) countMap.set(c.job_id, (countMap.get(c.job_id) || 0) + 1);
      }
    }
  }

  const enriched: Job[] = jobs.map((j) => ({
    ...j,
    candidate_count: countMap.get(j.id) || 0,
  }));

  return { success: true, data: enriched };
}

export async function getJob(jobId: string): Promise<{
  success: boolean;
  job?: Job;
  stages?: PipelineStage[];
  candidates?: PipelineCandidate[];
  error?: string;
}> {
  const staff = await getStaffUser();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();

  // Fetch job, stages, and candidates in parallel
  const [jobRes, stagesRes, candidatesRes] = await Promise.all([
    admin.from("jobs").select("*").eq("id", jobId).single(),
    admin.from("pipeline_stages")
      .select("*")
      .eq("job_id", jobId)
      .order("display_order"),
    admin.from("candidates")
      .select("id, name, email, phone, status, current_stage_id, stage_entered_at, job_id, notes, created_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false }),
  ]);

  if (jobRes.error) return { success: false, error: jobRes.error.message };

  const rawCandidates = candidatesRes.data || [];
  const candidateIds = rawCandidates.map((c) => c.id);

  // Fetch DISC results for linked candidates (via candidate_profiles.candidate_id)
  const discMap = new Map<string, string>();
  const invitationMap = new Set<string>();

  if (candidateIds.length > 0) {
    const { data: profiles } = await admin.from("candidate_profiles")
      .select("candidate_id, user_id")
      .in("candidate_id", candidateIds);

    if (profiles && profiles.length > 0) {
      const userIds = profiles.map((p) => p.user_id).filter(Boolean);
      if (userIds.length > 0) {
        const { data: results } = await admin.from("disc_results")
          .select("user_id, disc_type")
          .in("user_id", userIds);

        if (results) {
          const userToDisc = new Map(results.map((r) => [r.user_id, r.disc_type]));
          for (const p of profiles) {
            const dt = userToDisc.get(p.user_id);
            if (dt && p.candidate_id) discMap.set(p.candidate_id, dt);
          }
        }
      }
    }

    // Check which candidates have active invitations
    const { data: invitations } = await admin.from("invitations")
      .select("candidate_record_id")
      .in("candidate_record_id", candidateIds)
      .in("status", ["pending", "accepted"]);

    if (invitations) {
      for (const inv of invitations) {
        if (inv.candidate_record_id) invitationMap.add(inv.candidate_record_id);
      }
    }
  }

  const stages: PipelineStage[] = (stagesRes.data || []).map((s) => ({
    ...s,
    candidate_count: rawCandidates.filter((c) => c.current_stage_id === s.id).length,
  }));

  const enrichedCandidates: PipelineCandidate[] = rawCandidates.map((c) => ({
    ...c,
    disc_type: discMap.get(c.id) || null,
    has_invitation: invitationMap.has(c.id),
  }));

  return {
    success: true,
    job: jobRes.data as Job,
    stages,
    candidates: enrichedCandidates,
  };
}

export async function updateJob(
  jobId: string,
  data: { title?: string; department?: string; location?: string; description?: string; status?: JobStatus }
): Promise<{ success: boolean; error?: string }> {
  const staff = await requireManager();
  if (!staff) return { success: false, error: "Manager access required." };

  const admin = getAdminClient();
  const update: Record<string, unknown> = {};
  if (data.title !== undefined) update.title = data.title.trim();
  if (data.department !== undefined) update.department = data.department.trim() || null;
  if (data.location !== undefined) update.location = data.location.trim() || null;
  if (data.description !== undefined) update.description = data.description.trim() || null;
  if (data.status !== undefined) {
    update.status = data.status;
    if (data.status === "closed") update.closed_at = new Date().toISOString();
  }

  const { error } = await admin.from("jobs").update(update).eq("id", jobId);
  if (error) return { success: false, error: error.message };

  return { success: true };
}

export async function archiveJob(jobId: string): Promise<{ success: boolean; error?: string }> {
  const staff = await requireManager();
  if (!staff) return { success: false, error: "Manager access required." };

  const admin = getAdminClient();
  const { error } = await admin.from("jobs")
    .update({ archived_at: new Date().toISOString(), status: "archived" as JobStatus })
    .eq("id", jobId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Pipeline Stages ─────────────────────────────────────────────────────────

export async function createStage(
  jobId: string,
  data: { name: string; stage_type?: StageType }
): Promise<{ success: boolean; error?: string }> {
  const staff = await requireManager();
  if (!staff) return { success: false, error: "Manager access required." };

  const admin = getAdminClient();

  // Get max display_order for this job
  const { data: existing } = await admin.from("pipeline_stages")
    .select("display_order")
    .eq("job_id", jobId)
    .order("display_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

  const { error } = await admin.from("pipeline_stages").insert({
    job_id: jobId,
    name: data.name.trim(),
    stage_type: data.stage_type || ("custom" as StageType),
    display_order: nextOrder,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateStage(
  stageId: string,
  data: { name: string }
): Promise<{ success: boolean; error?: string }> {
  const staff = await requireManager();
  if (!staff) return { success: false, error: "Manager access required." };

  const admin = getAdminClient();
  const { error } = await admin.from("pipeline_stages")
    .update({ name: data.name.trim() })
    .eq("id", stageId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteStage(stageId: string): Promise<{ success: boolean; error?: string }> {
  const staff = await requireManager();
  if (!staff) return { success: false, error: "Manager access required." };

  const admin = getAdminClient();

  // Check no candidates in this stage
  const { data: candidates } = await admin.from("candidates")
    .select("id")
    .eq("current_stage_id", stageId)
    .limit(1);

  if (candidates && candidates.length > 0) {
    return { success: false, error: "Move all candidates out of this stage before deleting." };
  }

  const { error } = await admin.from("pipeline_stages").delete().eq("id", stageId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Move Candidate ──────────────────────────────────────────────────────────

export async function moveCandidate(
  candidateId: string,
  toStageId: string,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  const staff = await getStaffUser();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();

  // Get current candidate state
  const { data: candidate, error: fetchError } = await admin.from("candidates")
    .select("id, job_id, current_stage_id")
    .eq("id", candidateId)
    .single();

  if (fetchError || !candidate) return { success: false, error: "Candidate not found." };
  if (!candidate.job_id) return { success: false, error: "Candidate is not assigned to a job." };

  // Verify target stage belongs to same job
  const { data: stage } = await admin.from("pipeline_stages")
    .select("id, job_id")
    .eq("id", toStageId)
    .single();

  if (!stage || stage.job_id !== candidate.job_id) {
    return { success: false, error: "Invalid stage for this job." };
  }

  const now = new Date().toISOString();

  // Update candidate
  await admin.from("candidates")
    .update({ current_stage_id: toStageId, stage_entered_at: now })
    .eq("id", candidateId);

  // Log transition
  await admin.from("stage_transitions").insert({
    candidate_id: candidateId,
    job_id: candidate.job_id,
    from_stage_id: candidate.current_stage_id,
    to_stage_id: toStageId,
    moved_by: staff.id,
    note: note || null,
  });

  return { success: true };
}

// ─── Add Candidate to Job ────────────────────────────────────────────────────

export async function addCandidateToJob(
  jobId: string,
  data: { name: string; phone: string; email?: string; notes?: string }
): Promise<{ success: boolean; error?: string }> {
  const staff = await getStaffUser();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();

  // Get first stage of this job
  const { data: firstStage } = await admin.from("pipeline_stages")
    .select("id")
    .eq("job_id", jobId)
    .order("display_order")
    .limit(1)
    .single();

  if (!firstStage) return { success: false, error: "Job has no pipeline stages." };

  const now = new Date().toISOString();

  const { error } = await admin.from("candidates").insert({
    name: data.name.trim(),
    phone: data.phone.trim(),
    email: data.email?.trim() || null,
    notes: data.notes?.trim() || null,
    status: "applied",
    job_id: jobId,
    current_stage_id: firstStage.id,
    stage_entered_at: now,
    assigned_manager_id: staff.id,
    created_by_id: staff.id,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Invite Pipeline Candidate for DISC ──────────────────────────────────────

export async function inviteCandidateForDisc(
  candidateId: string
): Promise<{ success: boolean; error?: string }> {
  const staff = await getStaffUser();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();

  const { data: candidate, error: fetchError } = await admin.from("candidates")
    .select("id, name, email, phone, job_id")
    .eq("id", candidateId)
    .single();

  if (fetchError || !candidate) return { success: false, error: "Candidate not found." };
  if (!candidate.email) return { success: false, error: "Candidate has no email. Add one first." };

  // Check for existing active invitation
  const { data: existing } = await admin.from("invitations")
    .select("id")
    .eq("email", candidate.email)
    .in("status", ["pending", "accepted"])
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: false, error: "An active invitation already exists for this email." };
  }

  const { randomBytes } = await import("crypto");
  const token = randomBytes(32).toString("base64url");

  const { error: insertError } = await admin.from("invitations").insert({
    token,
    email: candidate.email,
    candidate_name: candidate.name,
    invited_by: staff.full_name,
    invited_by_user_id: staff.id !== "legacy" ? staff.id : null,
    job_id: candidate.job_id,
    candidate_record_id: candidate.id,
  });

  if (insertError) return { success: false, error: insertError.message };

  const { sendInvitationEmail } = await import("@/lib/email");
  await sendInvitationEmail({ email: candidate.email, candidateName: candidate.name, token });

  return { success: true };
}
