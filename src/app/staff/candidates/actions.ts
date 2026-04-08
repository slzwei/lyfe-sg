"use server";

import { after } from "next/server";
import { getAdminClient, getAdminClientAs } from "@/lib/supabase/admin";
import { deleteCandidateDocFiles, deletePdfFiles, deleteResumeFiles } from "@/lib/supabase/storage";
import { sendCandidateAssignedEmail, sendCandidateReassignedEmail } from "@/lib/email";
import { sendInterviewScheduled, sendInterviewUpdated, sendInterviewCancelled } from "@/lib/whatsapp";
import { getStaffUser, requireStaff, type StaffUser } from "../actions";
import { canScheduleInterviews, type UserRole } from "@/lib/shared-types/roles";

// ─── Team Scoping ─────────────────────────────────────────────────────────────

/**
 * Returns the manager IDs whose candidates the staff user can access.
 * Returns null if the user has global access (admin/director).
 */
async function getTeamManagerIds(staff: StaffUser): Promise<string[] | null> {
  // All ATS staff roles see all candidates
  if (["admin", "director", "manager", "pa"].includes(staff.role)) {
    return null;
  }

  // Other roles (agent): no candidate access
  return [];
}

/** Verify the caller has team-scoped access to a specific candidate. */
async function verifyCandidateAccess(
  candidateId: string,
  staff: StaffUser
): Promise<boolean> {
  const managerIds = await getTeamManagerIds(staff);
  if (managerIds === null) return true; // global access
  if (managerIds.length === 0) return false;
  const admin = getAdminClient();
  const { data } = await admin
    .from("candidates")
    .select("assigned_manager_id")
    .eq("id", candidateId)
    .single();
  if (!data) return false;
  return data.assigned_manager_id !== null && managerIds.includes(data.assigned_manager_id);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CandidateDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  notes: string | null;
  job_id: string | null;
  current_stage_id: string | null;
  stage_entered_at: string | null;
  assigned_manager_id: string | null;
  resume_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Enriched
  assigned_manager_name?: string | null;
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
  phone: string | null;
  status: string;
  position_applied: string | null;
  disc_type: string | null;
  created_at: string | null;
  // Progress fields for unified rendering
  user_id: string | null;
  profile_completed: boolean;
  onboarding_step: number;
  quiz_answered: number;
  quiz_completed: boolean;
  profile_pdf_path: string | null;
  disc_pdf_path: string | null;
  notes: string | null;
}

// ─── Candidate Detail ────────────────────────────────────────────────────────

export async function getCandidate(candidateId: string): Promise<{
  success: boolean;
  candidate?: CandidateDetail;
  profile?: CandidateProfile | null;
  activities?: Activity[];
  documents?: CandidateDocument[];
  staffRole?: string;
  staffId?: string;
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

  // Team scoping: verify the staff user has access to this candidate
  const managerIds = await getTeamManagerIds(staff);
  if (managerIds !== null) {
    if (!candidate.assigned_manager_id || !managerIds.includes(candidate.assigned_manager_id)) {
      return { success: false, error: "Candidate not found." };
    }
  }

  // Parallel: job, stage, DISC, activities, documents, invitation PDFs
  const [activitiesRes, documentsRes, profileRes, invitationRes, managerRes] = await Promise.all([
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
    candidate.assigned_manager_id
      ? admin.from("users").select("full_name").eq("id", candidate.assigned_manager_id).single()
      : Promise.resolve({ data: null }),
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
      assigned_manager_name: managerRes.data?.full_name || null,
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
    staffId: staff.id,
  };
}

// ─── Activities ──────────────────────────────────────────────────────────────

const VALID_ACTIVITY_TYPES = ["call", "whatsapp", "note"] as const;
const VALID_OUTCOMES = ["reached", "no_answer", "sent"] as const;

export async function addActivity(
  candidateId: string,
  data: { type: string; note?: string; outcome?: string }
): Promise<{ success: boolean; error?: string }> {
  const staff = await getStaffUser();
  if (!staff) return { success: false, error: "Not authenticated." };
  // P3-7: Validate activity type and outcome against allowlists
  if (!VALID_ACTIVITY_TYPES.includes(data.type as typeof VALID_ACTIVITY_TYPES[number]))
    return { success: false, error: "Invalid activity type." };
  if (data.outcome && !VALID_OUTCOMES.includes(data.outcome as typeof VALID_OUTCOMES[number]))
    return { success: false, error: "Invalid outcome." };
  // P3-6: Input length limit
  if (data.note && data.note.length > 10000)
    return { success: false, error: "Note too long (max 10,000 characters)." };
  if (!(await verifyCandidateAccess(candidateId, staff)))
    return { success: false, error: "Candidate not found." };

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

export async function deleteActivity(activityId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const staff = await getStaffUser();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();

  // Only the author or an admin can delete
  if (staff.role !== "admin") {
    const { data: activity } = await admin.from("candidate_activities")
      .select("user_id")
      .eq("id", activityId)
      .single();
    if (!activity) return { success: false, error: "Activity not found." };
    if (activity.user_id !== staff.id) return { success: false, error: "You can only delete your own notes." };
  }

  const { error } = await admin.from("candidate_activities").delete().eq("id", activityId);
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
  if (!(await verifyCandidateAccess(candidateId, staff)))
    return { success: false, error: "Candidate not found." };

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
  const staff = await requireStaff("pa");
  if (!staff) return { success: false, error: "Staff access required." };

  const admin = getAdminClient();

  // Fetch file URL before deleting the record
  const { data: doc } = await admin.from("candidate_documents")
    .select("file_url")
    .eq("id", docId)
    .single();

  const { error } = await admin.from("candidate_documents").delete().eq("id", docId);
  if (error) return { success: false, error: error.message };

  // Clean up storage file (best-effort — DB record already deleted)
  if (doc?.file_url) {
    await deleteCandidateDocFiles([doc.file_url]);
  }

  return { success: true };
}

// ─── Search ──────────────────────────────────────────────────────────────────

export async function searchCandidates(params: {
  query?: string;
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

  // Team scoping: restrict candidates to assigned managers
  const teamManagerIds = await getTeamManagerIds(staff);
  if (teamManagerIds !== null && teamManagerIds.length === 0) {
    return { success: true, data: [], total: 0 };
  }

  // Build query
  let q = admin.from("candidates")
    .select("id, name, email, phone, status, notes, created_at", { count: "exact" });

  if (teamManagerIds !== null) {
    q = q.in("assigned_manager_id", teamManagerIds);
  }

  // Text search
  if (params.query?.trim()) {
    const search = params.query.trim();
    const safe = search.replace(/[%_(),.*]/g, "");
    q = q.or(`name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }

  q = q.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data: candidates, count, error } = await q;
  if (error) return { success: false, error: error.message };

  if (!candidates || candidates.length === 0) {
    return { success: true, data: [], total: 0 };
  }

  // Enrich with position, progress, DISC, and PDF paths
  const candidateIds = candidates.map((c) => c.id);

  const [profilesRes, invPdfRes] = await Promise.all([
    admin.from("candidate_profiles")
      .select("candidate_id, user_id, position_applied, completed, onboarding_step")
      .in("candidate_id", candidateIds),
    admin.from("invitations")
      .select("candidate_record_id, profile_pdf_path, disc_pdf_path")
      .in("candidate_record_id", candidateIds),
  ]);

  const profiles = profilesRes.data || [];
  const positionMap = new Map<string, string>();
  const profileMap = new Map<string, { user_id: string; completed: boolean; onboarding_step: number }>();
  for (const p of profiles) {
    if (p.candidate_id) {
      if (p.position_applied) positionMap.set(p.candidate_id, p.position_applied);
      profileMap.set(p.candidate_id, { user_id: p.user_id, completed: p.completed, onboarding_step: p.onboarding_step });
    }
  }

  // PDF paths from invitations
  const pdfMap = new Map<string, { profile: string | null; disc: string | null }>();
  for (const inv of invPdfRes.data || []) {
    if (inv.candidate_record_id) {
      pdfMap.set(inv.candidate_record_id, { profile: inv.profile_pdf_path, disc: inv.disc_pdf_path });
    }
  }

  // DISC types + quiz progress via profiles → results/responses
  const discMap = new Map<string, string>();
  const quizAnsweredMap = new Map<string, number>();
  const userIds = profiles.map((p) => p.user_id).filter(Boolean);
  if (userIds.length > 0) {
    const [discRes, responsesRes] = await Promise.all([
      admin.from("disc_results").select("user_id, disc_type").in("user_id", userIds),
      admin.from("disc_responses").select("user_id, responses").in("user_id", userIds),
    ]);
    if (discRes.data) {
      const userToDisc = new Map(discRes.data.map((r) => [r.user_id, r.disc_type]));
      for (const p of profiles) {
        const dt = userToDisc.get(p.user_id);
        if (dt && p.candidate_id) discMap.set(p.candidate_id, dt);
      }
    }
    if (responsesRes.data) {
      for (const r of responsesRes.data) {
        const count = r.responses ? Object.keys(r.responses).length : 0;
        // Map user_id back to candidate_id
        const profile = profiles.find((p) => p.user_id === r.user_id);
        if (profile?.candidate_id) quizAnsweredMap.set(profile.candidate_id, count);
      }
    }
  }

  // Filter by DISC type if requested (post-query since it's cross-table)
  let enriched: SearchResult[] = candidates.map((c) => {
    const prof = profileMap.get(c.id);
    const pdfs = pdfMap.get(c.id);
    const hasDisc = discMap.has(c.id);
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      status: c.status,
      position_applied: positionMap.get(c.id) || null,
      disc_type: discMap.get(c.id) || null,
      created_at: c.created_at,
      user_id: prof?.user_id || null,
      profile_completed: prof?.completed || false,
      onboarding_step: prof?.onboarding_step || 0,
      quiz_answered: quizAnsweredMap.get(c.id) || 0,
      quiz_completed: hasDisc,
      profile_pdf_path: pdfs?.profile || null,
      disc_pdf_path: pdfs?.disc || null,
      notes: c.notes,
    };
  });

  if (params.discType) {
    enriched = enriched.filter((c) => c.disc_type === params.discType);
  }

  return { success: true, data: enriched, total: count || 0 };
}

// ─── Update Candidate ────────────────────────────────────────────────────────

export async function updateCandidate(
  candidateId: string,
  data: { name?: string; email?: string; phone?: string; notes?: string }
): Promise<{ success: boolean; error?: string }> {
  const staff = await getStaffUser();
  if (!staff) return { success: false, error: "Not authenticated." };
  if (!(await verifyCandidateAccess(candidateId, staff)))
    return { success: false, error: "Candidate not found." };
  // P3-6: Input length limits
  if (data.name !== undefined && data.name.length > 255)
    return { success: false, error: "Name too long (max 255 characters)." };
  if (data.email !== undefined && data.email.length > 255)
    return { success: false, error: "Email too long (max 255 characters)." };
  if (data.phone !== undefined && data.phone && data.phone.length > 20)
    return { success: false, error: "Phone number too long." };
  if (data.notes !== undefined && data.notes.length > 10000)
    return { success: false, error: "Notes too long (max 10,000 characters)." };

  const admin = getAdminClientAs(staff);
  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name.trim();
  if (data.email !== undefined) update.email = data.email.trim() || null;
  if (data.phone !== undefined) update.phone = data.phone?.trim() || null;
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
  confirmed_at: string | null;
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
  // P3-1: Verify candidate access
  if (!(await verifyCandidateAccess(candidateId, staff)))
    return { success: false, error: "Candidate not found." };

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

  // P3-7: Validate recommendation against allowlist
  const VALID_RECOMMENDATIONS = ["second_interview", "on_hold", "pass"];
  if (data.recommendation !== undefined && data.recommendation !== null &&
      !VALID_RECOMMENDATIONS.includes(data.recommendation))
    return { success: false, error: "Invalid recommendation value." };
  // P3-6: Input length limit
  if (data.notes !== undefined && data.notes.length > 10000)
    return { success: false, error: "Notes too long (max 10,000 characters)." };

  const admin = getAdminClient();

  // P3-2: Verify access to the candidate this interview belongs to
  const { data: interview } = await admin.from("interviews")
    .select("candidate_id")
    .eq("id", interviewId)
    .single();
  if (!interview) return { success: false, error: "Interview not found." };
  if (!(await verifyCandidateAccess(interview.candidate_id, staff)))
    return { success: false, error: "Candidate not found." };

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.notes !== undefined) update.notes = data.notes.trim() || null;
  if (data.recommendation !== undefined) update.recommendation = data.recommendation;

  const { error } = await admin.from("interviews").update(update).eq("id", interviewId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function scheduleInterview(
  candidateId: string,
  data: {
    managerId: string;
    datetime: string;
    type: "zoom" | "in_person";
    location?: string;
    zoomLink?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const staff = await getStaffUser();
  if (!staff) return { success: false, error: "Not authenticated." };
  if (!canScheduleInterviews(staff.role as UserRole)) {
    return { success: false, error: "You don't have permission to schedule interviews." };
  }

  if (!data.datetime || !data.managerId) {
    return { success: false, error: "Date/time and interviewer are required." };
  }
  // P3-3: Verify candidate access
  if (!(await verifyCandidateAccess(candidateId, staff)))
    return { success: false, error: "Candidate not found." };
  // P3-6: Input length limits
  if (data.location && data.location.length > 500)
    return { success: false, error: "Location too long (max 500 characters)." };
  if (data.zoomLink && data.zoomLink.length > 2000)
    return { success: false, error: "Zoom link too long." };

  const admin = getAdminClient();

  // Auto-calculate round number
  const { data: existing } = await admin
    .from("interviews")
    .select("round_number")
    .eq("candidate_id", candidateId)
    .order("round_number", { ascending: false })
    .limit(1);

  const roundNumber = (existing?.[0]?.round_number ?? 0) + 1;

  const { error } = await admin.from("interviews").insert({
    candidate_id: candidateId,
    manager_id: data.managerId,
    scheduled_by_id: staff.id,
    datetime: data.datetime,
    type: data.type,
    status: "scheduled",
    round_number: roundNumber,
    location: data.location?.trim() || null,
    zoom_link: data.zoomLink?.trim() || null,
  });

  // Handle duplicate round number from concurrent scheduling
  if (error) {
    if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
      // Retry once with recalculated round number
      const { data: retry } = await admin.from("interviews")
        .select("round_number")
        .eq("candidate_id", candidateId)
        .order("round_number", { ascending: false })
        .limit(1);
      const retryRound = (retry?.[0]?.round_number ?? 0) + 1;
      const { error: retryErr } = await admin.from("interviews").insert({
        candidate_id: candidateId,
        manager_id: data.managerId,
        scheduled_by_id: staff.id,
        datetime: data.datetime,
        type: data.type,
        status: "scheduled",
        round_number: retryRound,
        location: data.location?.trim() || null,
        zoom_link: data.zoomLink?.trim() || null,
      });
      if (retryErr) return { success: false, error: retryErr.message };
    } else {
      return { success: false, error: error.message };
    }
  }

  // Log activity
  const { data: manager } = await admin
    .from("users")
    .select("full_name")
    .eq("id", data.managerId)
    .single();

  await admin.from("candidate_activities").insert({
    candidate_id: candidateId,
    user_id: staff.id,
    type: "interview_scheduled",
    note: `Round ${roundNumber} ${data.type === "zoom" ? "Zoom" : "in-person"} interview scheduled with ${manager?.full_name || "Unknown"} for ${new Date(data.datetime).toLocaleString()}.`,
  });

  // Send WhatsApp notification (fire-and-forget, post-response)
  after(async () => {
    const { data: cand } = await admin.from("candidates")
      .select("phone, name").eq("id", candidateId).single();
    if (!cand?.phone) return;
    const dt = new Date(data.datetime);
    const dateStr = dt.toLocaleDateString("en-SG", { timeZone: "Asia/Singapore", day: "numeric", month: "short", year: "numeric" });
    const timeStr = dt.toLocaleTimeString("en-SG", { timeZone: "Asia/Singapore", hour: "numeric", minute: "2-digit", hour12: true });
    const loc = data.type === "zoom" ? (data.zoomLink || "Zoom") : (data.location || "TBC");
    await sendInterviewScheduled(cand.phone, cand.name, dateStr, timeStr, loc);
  });

  return { success: true };
}

// ─── Reschedule Interview ────────────────────────────────────────────────────

export async function rescheduleInterview(
  interviewId: string,
  data: {
    datetime: string;
    type: "zoom" | "in_person";
    location?: string;
    zoomLink?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const staff = await getStaffUser();
  if (!staff) return { success: false, error: "Not authenticated." };
  if (!canScheduleInterviews(staff.role as UserRole))
    return { success: false, error: "You don't have permission to reschedule interviews." };

  if (!data.datetime) return { success: false, error: "Date/time is required." };
  if (data.location && data.location.length > 500)
    return { success: false, error: "Location too long (max 500 characters)." };
  if (data.zoomLink && data.zoomLink.length > 2000)
    return { success: false, error: "Zoom link too long." };

  const admin = getAdminClient();

  // Fetch existing interview
  const { data: interview } = await admin.from("interviews")
    .select("candidate_id, datetime, status, type, location, zoom_link, round_number")
    .eq("id", interviewId)
    .single();
  if (!interview) return { success: false, error: "Interview not found." };
  if (interview.status !== "scheduled")
    return { success: false, error: "Only scheduled interviews can be rescheduled." };
  if (!(await verifyCandidateAccess(interview.candidate_id, staff)))
    return { success: false, error: "Candidate not found." };

  const oldDatetime = interview.datetime;

  // Update in-place, with status guard to prevent race condition
  const { data: updated, error } = await admin.from("interviews")
    .update({
      datetime: data.datetime,
      type: data.type,
      location: data.location?.trim() || null,
      zoom_link: data.zoomLink?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", interviewId)
    .eq("status", "scheduled")
    .select("id");

  if (error) return { success: false, error: error.message };
  if (!updated || updated.length === 0)
    return { success: false, error: "Interview is no longer scheduled." };

  // Log activity
  const oldDt = new Date(oldDatetime);
  const newDt = new Date(data.datetime);
  const fmtDt = (d: Date) => d.toLocaleString("en-SG", { timeZone: "Asia/Singapore" });
  await admin.from("candidate_activities").insert({
    candidate_id: interview.candidate_id,
    user_id: staff.id,
    type: "interview_rescheduled",
    note: `Round ${interview.round_number} interview rescheduled from ${fmtDt(oldDt)} to ${fmtDt(newDt)}.`,
  });

  // Send WhatsApp notification (fire-and-forget)
  after(async () => {
    const { data: cand } = await admin.from("candidates")
      .select("phone, name").eq("id", interview.candidate_id).single();
    if (!cand?.phone) return;
    const dt = new Date(data.datetime);
    const dateStr = dt.toLocaleDateString("en-SG", { timeZone: "Asia/Singapore", day: "numeric", month: "short", year: "numeric" });
    const timeStr = dt.toLocaleTimeString("en-SG", { timeZone: "Asia/Singapore", hour: "numeric", minute: "2-digit", hour12: true });
    const loc = data.type === "zoom" ? (data.zoomLink || "Zoom") : (data.location || "TBC");
    await sendInterviewUpdated(cand.phone, cand.name, dateStr, timeStr, loc);
  });

  return { success: true };
}

// ─── Cancel Interview ────────────────────────────────────────────────────────

export async function cancelInterview(
  interviewId: string,
): Promise<{ success: boolean; error?: string }> {
  const staff = await getStaffUser();
  if (!staff) return { success: false, error: "Not authenticated." };
  if (!canScheduleInterviews(staff.role as UserRole))
    return { success: false, error: "You don't have permission to cancel interviews." };

  const admin = getAdminClient();

  const { data: interview } = await admin.from("interviews")
    .select("candidate_id, datetime, status, round_number, type, location")
    .eq("id", interviewId)
    .single();
  if (!interview) return { success: false, error: "Interview not found." };
  if (interview.status !== "scheduled")
    return { success: false, error: "Only scheduled interviews can be cancelled." };
  if (!(await verifyCandidateAccess(interview.candidate_id, staff)))
    return { success: false, error: "Candidate not found." };

  // Cancel with status guard
  const { data: updated, error } = await admin.from("interviews")
    .update({
      status: "cancelled" as const,
      updated_at: new Date().toISOString(),
    })
    .eq("id", interviewId)
    .eq("status", "scheduled")
    .select("id");

  if (error) return { success: false, error: error.message };
  if (!updated || updated.length === 0)
    return { success: false, error: "Interview is no longer scheduled." };

  // Log activity
  const dt = new Date(interview.datetime);
  const fmtDt = dt.toLocaleString("en-SG", { timeZone: "Asia/Singapore" });
  await admin.from("candidate_activities").insert({
    candidate_id: interview.candidate_id,
    user_id: staff.id,
    type: "interview_cancelled",
    note: `Round ${interview.round_number} ${interview.type === "zoom" ? "Zoom" : "in-person"} interview on ${fmtDt} cancelled.`,
  });

  // Send WhatsApp notification (fire-and-forget)
  after(async () => {
    const { data: cand } = await admin.from("candidates")
      .select("phone, name").eq("id", interview.candidate_id).single();
    if (!cand?.phone) return;
    const dateStr = dt.toLocaleDateString("en-SG", { timeZone: "Asia/Singapore", day: "numeric", month: "short", year: "numeric" });
    const timeStr = dt.toLocaleTimeString("en-SG", { timeZone: "Asia/Singapore", hour: "numeric", minute: "2-digit", hour12: true });
    await sendInterviewCancelled(cand.phone, cand.name, dateStr, timeStr);
  });

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

// ─── Delete Candidate (by candidate ID) ──────────────────────────────────────

export async function deleteCandidateById(candidateId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const staff = await requireStaff("manager");
  if (!staff) return { success: false, error: "Not authorized. Manager access required." };

  const admin = getAdminClientAs(staff);

  // Get candidate name for logging + linked profile user_id for cleanup
  const { data: candidate } = await admin.from("candidates")
    .select("name, email")
    .eq("id", candidateId)
    .maybeSingle();

  const { data: profile } = await admin.from("candidate_profiles")
    .select("user_id")
    .eq("candidate_id", candidateId)
    .maybeSingle();

  // Collect storage files to clean up before DB deletes
  const storageCleanup: Promise<boolean>[] = [];

  if (profile?.user_id) {
    // PDFs in candidate-pdfs bucket
    storageCleanup.push(
      deletePdfFiles([
        `${profile.user_id}/application.pdf`,
        `${profile.user_id}/disc-profile.pdf`,
      ])
    );
  }

  // Documents in candidate-documents bucket
  const { data: docs } = await admin.from("candidate_documents")
    .select("file_url")
    .eq("candidate_id", candidateId);
  if (docs && docs.length > 0) {
    const docPaths = docs.map((d) => d.file_url).filter(Boolean);
    if (docPaths.length > 0) storageCleanup.push(deleteCandidateDocFiles(docPaths));
  }

  // Attached files in candidate-resumes bucket (from linked invitations)
  const { data: invitations } = await admin.from("invitations")
    .select("attached_files")
    .eq("candidate_record_id", candidateId);
  if (invitations) {
    const resumePaths: string[] = [];
    for (const inv of invitations) {
      if (inv.attached_files) {
        const files = inv.attached_files as unknown as { storage_path: string }[];
        resumePaths.push(...files.map((f) => f.storage_path));
      }
    }
    if (resumePaths.length > 0) storageCleanup.push(deleteResumeFiles(resumePaths));
  }

  // Fire storage cleanup (best-effort, don't block DB deletes)
  await Promise.allSettled(storageCleanup);

  // Delete related records with NO ACTION FK constraints
  if (profile?.user_id) {
    await admin.from("disc_results").delete().eq("user_id", profile.user_id);
    await admin.from("disc_responses").delete().eq("user_id", profile.user_id);
    await admin.from("candidate_profiles").delete().eq("candidate_id", candidateId);
  }

  // Clear invitation links
  await admin.from("invitations")
    .update({ candidate_record_id: null })
    .eq("candidate_record_id", candidateId);

  // Delete candidate (cascades to activities, documents, interviews)
  // Use .select('id') so PostgREST returns deleted rows — lets us verify the delete happened
  const { data: deleted, error } = await admin.from("candidates").delete().eq("id", candidateId).select("id");
  if (error) {
    console.error(`[deleteCandidateById] Delete failed:`, error.message);
    return { success: false, error: error.message };
  }
  if (!deleted || deleted.length === 0) {
    console.error(`[deleteCandidateById] Delete returned 0 rows for candidateId=${candidateId}`);
    return { success: false, error: "Failed to delete candidate. Please try again." };
  }

  console.log(`[deleteCandidateById] Deleted by ${staff.full_name} (${staff.role}) — candidateId=${candidateId}, name=${candidate?.name || candidate?.email || "unknown"}`);

  return { success: true };
}

// ─── Reassign Candidate ───────────────────────────────────────────────────────

export async function reassignCandidate(
  candidateId: string,
  newManagerId: string
): Promise<{ success: boolean; error?: string }> {
  const staff = await requireStaff("manager");
  if (!staff) return { success: false, error: "Manager access required." };

  const admin = getAdminClientAs(staff);

  // Validate new manager exists and has correct role
  const { data: targetUser } = await admin
    .from("users")
    .select("id, full_name, email, role, is_active")
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
    .select("name, assigned_manager_id")
    .eq("id", candidateId)
    .single();

  if (!candidate) return { success: false, error: "Candidate not found." };

  if (candidate.assigned_manager_id === newManagerId) {
    return { success: false, error: "Candidate is already assigned to this manager." };
  }

  // Get old manager name + email for activity log and notification
  const { data: oldManager } = await admin
    .from("users")
    .select("full_name, email")
    .eq("id", candidate.assigned_manager_id)
    .single();

  // Update assignment
  const { error } = await admin
    .from("candidates")
    .update({ assigned_manager_id: newManagerId })
    .eq("id", candidateId);

  if (error) return { success: false, error: error.message };

  // Log activity + notify both managers
  const candidateName = candidate.name || "A candidate";
  await Promise.all([
    admin.from("candidate_activities").insert({
      candidate_id: candidateId,
      user_id: staff.id,
      type: "reassignment",
      note: `Reassigned from ${oldManager?.full_name || "Unknown"} to ${targetUser.full_name}`,
    }),
    // Notify new manager
    admin.from("notifications").insert({
      user_id: newManagerId,
      type: "candidate_assigned",
      title: "Candidate assigned to you",
      body: `${candidateName} has been assigned to you by ${staff.full_name}.`,
      data: { candidate_id: candidateId },
    }),
    // Notify old manager (if exists)
    ...(candidate.assigned_manager_id
      ? [admin.from("notifications").insert({
          user_id: candidate.assigned_manager_id,
          type: "candidate_reassigned",
          title: "Candidate reassigned",
          body: `${candidateName} has been reassigned to ${targetUser.full_name} by ${staff.full_name}.`,
          data: { candidate_id: candidateId },
        })]
      : []),
    // Email new manager
    ...(targetUser.email
      ? [sendCandidateAssignedEmail({
          to: targetUser.email,
          managerName: targetUser.full_name,
          candidateName,
          assignedBy: staff.full_name,
          candidateId,
        })]
      : []),
    // Email old manager
    ...(oldManager?.email
      ? [sendCandidateReassignedEmail({
          to: oldManager.email,
          managerName: oldManager.full_name,
          candidateName,
          newManagerName: targetUser.full_name,
          reassignedBy: staff.full_name,
          candidateId,
        })]
      : []),
  ]);

  return { success: true };
}
