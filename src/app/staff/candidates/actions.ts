"use server";

import { getAdminClient } from "@/lib/supabase/admin";
import { getStaffUser, requireStaff } from "../actions";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CandidateDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  status: string;
  notes: string | null;
  job_id: string | null;
  current_stage_id: string | null;
  stage_entered_at: string | null;
  resume_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Enriched
  job_title?: string | null;
  stage_name?: string | null;
  disc_type?: string | null;
  disc_completed?: boolean;
  profile_completed?: boolean;
  profile_pdf_path?: string | null;
  disc_pdf_path?: string | null;
}

export interface Activity {
  id: string;
  candidate_id: string;
  user_id: string;
  type: string;
  outcome: string | null;
  note: string | null;
  created_at: string | null;
  user_name?: string;
}

export interface CandidateProfile {
  full_name: string;
  email: string | null;
  contact_number: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  race: string | null;
  gender: string | null;
  marital_status: string | null;
  position_applied: string | null;
  expected_salary: string | null;
  salary_period: string | null;
  date_available: string | null;
  place_of_birth: string | null;
  address_block: string | null;
  address_street: string | null;
  address_unit: string | null;
  address_postal: string | null;
  emergency_name: string | null;
  emergency_relationship: string | null;
  emergency_contact: string | null;
  education: Record<string, unknown> | null;
  languages: unknown[] | null;
  employment_history: unknown[] | null;
  software_competencies: string | null;
  typing_wpm: number | null;
  shorthand_wpm: number | null;
}

export interface CandidateDocument {
  id: string;
  candidate_id: string;
  label: string;
  file_name: string;
  file_url: string;
  created_at: string | null;
}

export interface SearchResult {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  status: string;
  job_title: string | null;
  stage_name: string | null;
  disc_type: string | null;
  created_at: string | null;
}

// ─── Candidate Detail ────────────────────────────────────────────────────────

export async function getCandidate(candidateId: string): Promise<{
  success: boolean;
  candidate?: CandidateDetail;
  profile?: CandidateProfile | null;
  activities?: Activity[];
  documents?: CandidateDocument[];
  staffRole?: string;
  error?: string;
}> {
  const staff = await getStaffUser();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();

  const { data: candidate, error } = await admin.from("candidates")
    .select("*")
    .eq("id", candidateId)
    .single();

  if (error || !candidate) return { success: false, error: "Candidate not found." };

  // Parallel: job, stage, DISC, activities, documents, invitation PDFs
  const [jobRes, stageRes, activitiesRes, documentsRes, profileRes, invitationRes] = await Promise.all([
    candidate.job_id
      ? admin.from("jobs").select("title").eq("id", candidate.job_id).single()
      : Promise.resolve({ data: null }),
    candidate.current_stage_id
      ? admin.from("pipeline_stages").select("name").eq("id", candidate.current_stage_id).single()
      : Promise.resolve({ data: null }),
    admin.from("candidate_activities")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false })
      .limit(50),
    admin.from("candidate_documents")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false }),
    admin.from("candidate_profiles")
      .select("*")
      .eq("candidate_id", candidateId)
      .single(),
    admin.from("invitations")
      .select("profile_pdf_path, disc_pdf_path")
      .eq("candidate_record_id", candidateId)
      .single(),
  ]);

  // Get DISC type if profile is linked
  let discType: string | null = null;
  let discCompleted = false;
  if (profileRes.data?.user_id) {
    const { data: discResult } = await admin.from("disc_results")
      .select("disc_type")
      .eq("user_id", profileRes.data.user_id)
      .single();
    if (discResult) {
      discType = discResult.disc_type;
      discCompleted = true;
    }
  }

  // Enrich activity with user names
  const activities = activitiesRes.data || [];
  const userIds = [...new Set(activities.map((a) => a.user_id))];
  const userNameMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: users } = await admin.from("users")
      .select("id, full_name")
      .in("id", userIds);
    if (users) users.forEach((u) => userNameMap.set(u.id, u.full_name));
  }

  return {
    success: true,
    candidate: {
      ...candidate,
      job_title: jobRes.data?.title || null,
      stage_name: stageRes.data?.name || null,
      disc_type: discType,
      disc_completed: discCompleted,
      profile_completed: profileRes.data?.completed || false,
      profile_pdf_path: invitationRes.data?.profile_pdf_path || null,
      disc_pdf_path: invitationRes.data?.disc_pdf_path || null,
    },
    profile: profileRes.data ? {
      full_name: profileRes.data.full_name,
      email: profileRes.data.email,
      contact_number: profileRes.data.contact_number,
      date_of_birth: profileRes.data.date_of_birth,
      nationality: profileRes.data.nationality,
      race: profileRes.data.race,
      gender: profileRes.data.gender,
      marital_status: profileRes.data.marital_status,
      position_applied: profileRes.data.position_applied,
      expected_salary: profileRes.data.expected_salary,
      salary_period: profileRes.data.salary_period,
      date_available: profileRes.data.date_available,
      place_of_birth: profileRes.data.place_of_birth,
      address_block: profileRes.data.address_block,
      address_street: profileRes.data.address_street,
      address_unit: profileRes.data.address_unit,
      address_postal: profileRes.data.address_postal,
      emergency_name: profileRes.data.emergency_name,
      emergency_relationship: profileRes.data.emergency_relationship,
      emergency_contact: profileRes.data.emergency_contact,
      education: profileRes.data.education as Record<string, unknown> | null,
      languages: profileRes.data.languages as unknown[] | null,
      employment_history: profileRes.data.employment_history as unknown[] | null,
      software_competencies: profileRes.data.software_competencies,
      typing_wpm: profileRes.data.typing_wpm,
      shorthand_wpm: profileRes.data.shorthand_wpm,
    } : null,
    activities: activities.map((a) => ({
      ...a,
      user_name: userNameMap.get(a.user_id) || "Staff",
    })),
    documents: (documentsRes.data || []) as CandidateDocument[],
    staffRole: staff.role,
  };
}

// ─── Activities ──────────────────────────────────────────────────────────────

export async function addActivity(
  candidateId: string,
  data: { type: string; note?: string; outcome?: string }
): Promise<{ success: boolean; error?: string }> {
  const staff = await getStaffUser();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();
  const { error } = await admin.from("candidate_activities").insert({
    candidate_id: candidateId,
    user_id: staff.id,
    type: data.type,
    note: data.note || null,
    outcome: data.outcome || null,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Documents ───────────────────────────────────────────────────────────────

export async function addDocument(
  candidateId: string,
  data: { label: string; fileName: string; fileUrl: string }
): Promise<{ success: boolean; error?: string }> {
  const staff = await getStaffUser();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();
  const { error } = await admin.from("candidate_documents").insert({
    candidate_id: candidateId,
    label: data.label,
    file_name: data.fileName,
    file_url: data.fileUrl,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteDocument(docId: string): Promise<{ success: boolean; error?: string }> {
  const staff = await requireStaff("manager");
  if (!staff) return { success: false, error: "Manager access required." };

  const admin = getAdminClient();
  const { error } = await admin.from("candidate_documents").delete().eq("id", docId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Search ──────────────────────────────────────────────────────────────────

export async function searchCandidates(params: {
  query?: string;
  jobId?: string;
  stageId?: string;
  discType?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  success: boolean;
  data?: SearchResult[];
  total?: number;
  error?: string;
}> {
  const staff = await getStaffUser();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();
  const limit = params.limit || 50;
  const offset = params.offset || 0;

  // Build query
  let q = admin.from("candidates")
    .select("id, name, email, phone, status, job_id, current_stage_id, created_at", { count: "exact" });

  // Text search
  if (params.query?.trim()) {
    const search = params.query.trim();
    q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  // Filters
  if (params.jobId) q = q.eq("job_id", params.jobId);
  if (params.stageId) q = q.eq("current_stage_id", params.stageId);

  q = q.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data: candidates, count, error } = await q;
  if (error) return { success: false, error: error.message };

  if (!candidates || candidates.length === 0) {
    return { success: true, data: [], total: 0 };
  }

  // Enrich with job titles, stage names, DISC types
  const jobIds = [...new Set(candidates.map((c) => c.job_id).filter(Boolean))] as string[];
  const stageIds = [...new Set(candidates.map((c) => c.current_stage_id).filter(Boolean))] as string[];
  const candidateIds = candidates.map((c) => c.id);

  const [jobsRes, stagesRes, profilesRes] = await Promise.all([
    jobIds.length > 0
      ? admin.from("jobs").select("id, title").in("id", jobIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    stageIds.length > 0
      ? admin.from("pipeline_stages").select("id, name").in("id", stageIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    admin.from("candidate_profiles")
      .select("candidate_id, user_id")
      .in("candidate_id", candidateIds),
  ]);

  const jobMap = new Map((jobsRes.data || []).map((j) => [j.id, j.title]));
  const stageMap = new Map((stagesRes.data || []).map((s) => [s.id, s.name]));

  // DISC types via profiles → results
  const discMap = new Map<string, string>();
  const profiles = profilesRes.data || [];
  if (profiles.length > 0) {
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

  // Filter by DISC type if requested (post-query since it's cross-table)
  let enriched: SearchResult[] = candidates.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    status: c.status,
    job_title: c.job_id ? jobMap.get(c.job_id) || null : null,
    stage_name: c.current_stage_id ? stageMap.get(c.current_stage_id) || null : null,
    disc_type: discMap.get(c.id) || null,
    created_at: c.created_at,
  }));

  if (params.discType) {
    enriched = enriched.filter((c) => c.disc_type === params.discType);
  }

  return { success: true, data: enriched, total: count || 0 };
}

// ─── List Jobs (for filter dropdown) ─────────────────────────────────────────

export async function listJobsForFilter(): Promise<{ id: string; title: string }[]> {
  const staff = await getStaffUser();
  if (!staff) return [];

  const admin = getAdminClient();
  const { data } = await admin.from("jobs")
    .select("id, title")
    .is("archived_at", null)
    .order("title");

  return data || [];
}

// ─── Update Candidate ────────────────────────────────────────────────────────

export async function updateCandidate(
  candidateId: string,
  data: { name?: string; email?: string; phone?: string; notes?: string }
): Promise<{ success: boolean; error?: string }> {
  const staff = await getStaffUser();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();
  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name.trim();
  if (data.email !== undefined) update.email = data.email.trim() || null;
  if (data.phone !== undefined) update.phone = data.phone.trim();
  if (data.notes !== undefined) update.notes = data.notes.trim() || null;

  const { error } = await admin.from("candidates").update(update).eq("id", candidateId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Interviews ───────────────────────────────────────────────────────────────

export interface InterviewRecord {
  id: string;
  candidate_id: string;
  manager_id: string;
  scheduled_by_id: string;
  round_number: number;
  type: string;
  datetime: string;
  location: string | null;
  zoom_link: string | null;
  status: string;
  notes: string | null;
  recommendation: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Enriched
  manager_name?: string;
  scheduled_by_name?: string;
}

export async function getInterviews(candidateId: string): Promise<{
  success: boolean;
  interviews?: InterviewRecord[];
  error?: string;
}> {
  const staff = await getStaffUser();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();
  const { data: interviews, error } = await admin.from("interviews")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("datetime", { ascending: false });

  if (error) return { success: false, error: error.message };
  if (!interviews || interviews.length === 0) return { success: true, interviews: [] };

  // Enrich with user names
  const userIds = [...new Set([
    ...interviews.map((i) => i.manager_id),
    ...interviews.map((i) => i.scheduled_by_id),
  ])];
  const userNameMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: users } = await admin.from("users")
      .select("id, full_name")
      .in("id", userIds);
    if (users) users.forEach((u) => userNameMap.set(u.id, u.full_name));
  }

  return {
    success: true,
    interviews: interviews.map((i) => ({
      ...i,
      manager_name: userNameMap.get(i.manager_id) || "Unknown",
      scheduled_by_name: userNameMap.get(i.scheduled_by_id) || "Unknown",
    })),
  };
}

export async function updateInterviewFeedback(
  interviewId: string,
  data: { notes?: string; recommendation?: string | null }
): Promise<{ success: boolean; error?: string }> {
  const staff = await requireStaff("manager");
  if (!staff) return { success: false, error: "Manager access required." };

  const admin = getAdminClient();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.notes !== undefined) update.notes = data.notes.trim() || null;
  if (data.recommendation !== undefined) update.recommendation = data.recommendation;

  const { error } = await admin.from("interviews").update(update).eq("id", interviewId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Assignable Managers ──────────────────────────────────────────────────────

export interface AssignableManager {
  id: string;
  full_name: string;
  role: string;
}

export async function listAssignableManagers(): Promise<{
  success: boolean;
  managers?: AssignableManager[];
  error?: string;
}> {
  const staff = await getStaffUser();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();

  if (staff.role === "pa") {
    // PA: only managers they are assigned to
    const { data: assignments } = await admin
      .from("pa_manager_assignments")
      .select("manager_id")
      .eq("pa_id", staff.id);

    if (!assignments || assignments.length === 0) {
      return { success: true, managers: [] };
    }

    const managerIds = assignments.map((a) => a.manager_id);
    const { data: managers } = await admin
      .from("users")
      .select("id, full_name, role")
      .in("id", managerIds)
      .eq("is_active", true)
      .order("full_name");

    return { success: true, managers: (managers || []) as AssignableManager[] };
  }

  // Manager/director/admin: all active managers, directors, and admins
  const { data: managers } = await admin
    .from("users")
    .select("id, full_name, role")
    .in("role", ["manager", "director", "admin"])
    .eq("is_active", true)
    .order("full_name");

  return { success: true, managers: (managers || []) as AssignableManager[] };
}

// ─── Reassign Candidate ───────────────────────────────────────────────────────

export async function reassignCandidate(
  candidateId: string,
  newManagerId: string
): Promise<{ success: boolean; error?: string }> {
  const staff = await requireStaff("manager");
  if (!staff) return { success: false, error: "Manager access required." };

  const admin = getAdminClient();

  // Validate new manager exists and has correct role
  const { data: targetUser } = await admin
    .from("users")
    .select("id, full_name, role, is_active")
    .eq("id", newManagerId)
    .single();

  if (!targetUser || !targetUser.is_active) {
    return { success: false, error: "Target manager not found or inactive." };
  }

  if (!["manager", "director", "admin"].includes(targetUser.role)) {
    return { success: false, error: "Target user is not a manager/director/admin." };
  }

  // Get current candidate for old manager name
  const { data: candidate } = await admin
    .from("candidates")
    .select("assigned_manager_id")
    .eq("id", candidateId)
    .single();

  if (!candidate) return { success: false, error: "Candidate not found." };

  if (candidate.assigned_manager_id === newManagerId) {
    return { success: false, error: "Candidate is already assigned to this manager." };
  }

  // Get old manager name for activity log
  const { data: oldManager } = await admin
    .from("users")
    .select("full_name")
    .eq("id", candidate.assigned_manager_id)
    .single();

  // Update assignment
  const { error } = await admin
    .from("candidates")
    .update({ assigned_manager_id: newManagerId })
    .eq("id", candidateId);

  if (error) return { success: false, error: error.message };

  // Log activity
  await admin.from("candidate_activities").insert({
    candidate_id: candidateId,
    user_id: staff.id,
    type: "reassignment",
    note: `Reassigned from ${oldManager?.full_name || "Unknown"} to ${targetUser.full_name}`,
  });

  return { success: true };
}
