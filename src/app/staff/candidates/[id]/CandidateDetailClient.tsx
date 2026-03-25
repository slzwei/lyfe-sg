"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getCandidate,
  addActivity,
  updateCandidate,
  getInterviews,
  updateInterviewFeedback,
  scheduleInterview,
  listAssignableManagers,
  reassignCandidate,
  deleteDocument,
  type CandidateDetail,
  type CandidateProfile,
  type Activity,
  type CandidateDocument,
  type InterviewRecord,
  type AssignableManager,
} from "../actions";
import { getPdfUrl, getInviteFileUrl, getCandidateDocUrl } from "../../actions";

const ACTIVITY_TYPES = ["note", "call", "email", "meeting", "status_change", "follow_up"] as const;

const RECOMMENDATION_OPTIONS = [
  { value: "second_interview", label: "2nd Interview", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "on_hold", label: "On Hold", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "pass", label: "Pass", color: "bg-red-50 text-red-600 border-red-200" },
] as const;

function recommendationBadge(rec: string | null) {
  if (!rec) return null;
  const opt = RECOMMENDATION_OPTIONS.find((o) => o.value === rec);
  if (!opt) return null;
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${opt.color}`}>
      {opt.label}
    </span>
  );
}

export default function CandidateDetailClient({ candidateId }: { candidateId: string }) {
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [documents, setDocuments] = useState<CandidateDocument[]>([]);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [staffRole, setStaffRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add note form
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState<string>("note");
  const [addingNote, setAddingNote] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", notes: "" });

  // Interview feedback editing
  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({ notes: "", recommendation: null as string | null });
  const [savingFeedback, setSavingFeedback] = useState(false);

  // Reassign
  const [showReassign, setShowReassign] = useState(false);
  const [reassignManagers, setReassignManagers] = useState<AssignableManager[]>([]);
  const [reassignTarget, setReassignTarget] = useState("");
  const [reassigning, setReassigning] = useState(false);

  // Document upload
  const [showUpload, setShowUpload] = useState(false);
  const [uploadLabel, setUploadLabel] = useState("Resume");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Schedule interview
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleManagers, setScheduleManagers] = useState<AssignableManager[]>([]);
  const [scheduleForm, setScheduleForm] = useState({ managerId: "", datetime: "", type: "zoom" as "zoom" | "in_person", location: "", zoomLink: "" });
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  const isManagerPlus = staffRole && ["manager", "director", "admin"].includes(staffRole);
  const canSchedule = staffRole && ["pa", "manager", "director", "admin"].includes(staffRole);

  const fetchData = useCallback(async () => {
    const [candidateResult, interviewsResult] = await Promise.all([
      getCandidate(candidateId),
      getInterviews(candidateId),
    ]);
    if (candidateResult.success && candidateResult.candidate) {
      setCandidate(candidateResult.candidate);
      setActivities(candidateResult.activities || []);
      setDocuments(candidateResult.documents || []);
      setProfile(candidateResult.profile || null);
      setStaffRole(candidateResult.staffRole || "");
      setEditForm({
        name: candidateResult.candidate.name,
        email: candidateResult.candidate.email || "",
        phone: candidateResult.candidate.phone,
        notes: candidateResult.candidate.notes || "",
      });
    } else {
      setError(candidateResult.error || "Not found.");
    }
    if (interviewsResult.success) {
      setInterviews(interviewsResult.interviews || []);
    }
    setLoading(false);
  }, [candidateId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleDownloadPdf(path: string) {
    const result = await getPdfUrl(path);
    if (result.success && result.url) window.open(result.url, "_blank");
  }

  async function handleDownloadDoc(fileUrl: string) {
    if (fileUrl.startsWith("invitations/")) {
      const result = await getInviteFileUrl(fileUrl);
      if (result.success && result.url) window.open(result.url, "_blank");
    } else if (fileUrl.startsWith("candidates/")) {
      const result = await getCandidateDocUrl(fileUrl);
      if (result.success && result.url) window.open(result.url, "_blank");
    } else {
      window.open(fileUrl, "_blank");
    }
  }

  async function handleDeleteDoc(docId: string) {
    if (!confirm("Delete this document?")) return;
    setDeletingDocId(docId);
    const result = await deleteDocument(docId);
    if (result.success) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    }
    setDeletingDocId(null);
  }

  async function handleUploadDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("candidateId", candidateId);
    formData.append("label", uploadLabel);
    formData.append("file", uploadFile);

    const res = await fetch("/api/upload-candidate-doc", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok || !data.success) {
      setUploadError(data.error || "Upload failed.");
    } else {
      setShowUpload(false);
      setUploadFile(null);
      setUploadLabel("Resume");
      fetchData();
    }
    setUploading(false);
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setAddingNote(true);
    await addActivity(candidateId, { type: noteType, note: noteText.trim() });
    setNoteText("");
    fetchData();
    setAddingNote(false);
  }

  async function handleSaveEdit() {
    await updateCandidate(candidateId, editForm);
    setEditing(false);
    fetchData();
  }

  function startEditingFeedback(interview: InterviewRecord) {
    setEditingInterviewId(interview.id);
    setFeedbackForm({
      notes: interview.notes || "",
      recommendation: interview.recommendation || null,
    });
  }

  async function handleSaveFeedback() {
    if (!editingInterviewId) return;
    setSavingFeedback(true);
    await updateInterviewFeedback(editingInterviewId, {
      notes: feedbackForm.notes,
      recommendation: feedbackForm.recommendation || null,
    });
    setEditingInterviewId(null);
    setSavingFeedback(false);
    fetchData();
  }

  async function handleOpenSchedule() {
    setShowSchedule(true);
    setScheduleForm({ managerId: "", datetime: "", type: "zoom", location: "", zoomLink: "" });
    setScheduleError("");
    const result = await listAssignableManagers();
    if (result.success && result.managers) {
      setScheduleManagers(result.managers);
    }
  }

  async function handleScheduleInterview(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduleForm.managerId || !scheduleForm.datetime) {
      setScheduleError("Interviewer and date/time are required.");
      return;
    }
    setScheduling(true);
    setScheduleError("");
    const result = await scheduleInterview(candidateId, {
      managerId: scheduleForm.managerId,
      datetime: new Date(scheduleForm.datetime).toISOString(),
      type: scheduleForm.type,
      location: scheduleForm.location || undefined,
      zoomLink: scheduleForm.zoomLink || undefined,
    });
    setScheduling(false);
    if (result.success) {
      setShowSchedule(false);
      fetchData();
    } else {
      setScheduleError(result.error || "Failed to schedule interview.");
    }
  }

  async function handleOpenReassign() {
    setShowReassign(true);
    setReassignTarget("");
    const result = await listAssignableManagers();
    if (result.success && result.managers) {
      setReassignManagers(result.managers);
    }
  }

  async function handleReassign() {
    if (!reassignTarget) return;
    setReassigning(true);
    const result = await reassignCandidate(candidateId, reassignTarget);
    setReassigning(false);
    if (result.success) {
      setShowReassign(false);
      fetchData();
    }
  }

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 animate-pulse rounded bg-stone-100" />
            <div className="h-7 w-40 animate-pulse rounded-lg bg-stone-200" />
            <div className="h-5 w-10 animate-pulse rounded bg-purple-100" />
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-3.5 w-36 animate-pulse rounded bg-stone-100" />
            <div className="h-3.5 w-24 animate-pulse rounded bg-stone-100" />
          </div>
        </div>
        <div className="h-8 w-16 animate-pulse rounded-lg bg-stone-100" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="h-3 w-14 animate-pulse rounded bg-stone-100" />
            <div className="mt-2 h-4 w-20 animate-pulse rounded bg-stone-200" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="mb-3 h-4 w-28 animate-pulse rounded bg-stone-200" />
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-stone-50" />
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white">
          <div className="border-b border-stone-100 px-5 py-3">
            <div className="h-4 w-24 animate-pulse rounded bg-stone-200" />
          </div>
          <div className="divide-y divide-stone-50">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="h-3.5 w-24 animate-pulse rounded bg-stone-200" />
                  <div className="mt-1.5 h-3 w-32 animate-pulse rounded bg-stone-100" />
                </div>
                <div className="h-4 w-4 animate-pulse rounded bg-stone-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
  if (!candidate) return <div className="py-12 text-center text-sm text-red-500">{error}</div>;

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link href="/staff/candidates" className="shrink-0 text-stone-400 hover:text-stone-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="truncate text-xl font-bold text-stone-800 sm:text-2xl">{candidate.name}</h1>
            {candidate.disc_type && (
              <span className="shrink-0 rounded bg-purple-50 px-2 py-0.5 text-sm font-semibold text-purple-600">
                {candidate.disc_type}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-7 text-sm text-stone-400 sm:pl-0">
            {candidate.email && <span className="truncate">{candidate.email}</span>}
            <span>{candidate.phone}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-500 hover:bg-stone-100"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Name</label>
              <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="h-9 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-base outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Email</label>
              <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="h-9 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-base outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Phone</label>
              <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="h-9 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-base outline-none focus:border-orange-400" />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-stone-500">Notes</label>
            <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              rows={2} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-base outline-none focus:border-orange-400" />
          </div>
          <button onClick={handleSaveEdit} className="mt-3 rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-orange-600">Save</button>
        </div>
      )}

      {/* Status cards row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="text-xs text-stone-400">Position</div>
          <div className="mt-1 text-sm font-medium text-stone-700">{profile?.position_applied || "—"}</div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="text-xs text-stone-400">Application</div>
          <div className="mt-1 text-sm font-medium text-stone-700">{candidate.profile_completed ? "Completed" : "Pending"}</div>
        </div>
      </div>

      {/* Profile details */}
      {profile && (
        <div className="rounded-2xl border border-stone-200 bg-white">
          <div className="border-b border-stone-100 px-5 py-3">
            <h3 className="font-semibold text-stone-700">Profile Details</h3>
          </div>
          <div className="p-5">
            {/* Personal info */}
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {[
                ["Salary", profile.expected_salary ? `$${profile.expected_salary}/${profile.salary_period || "month"}` : null],
                ["Available", profile.date_available ? new Date(profile.date_available).toLocaleDateString() : null],
                ["DOB", profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : null],
                ["Nationality", profile.nationality],
                ["Race", profile.race],
                ["Gender", profile.gender],
                ["Marital Status", profile.marital_status],
                ["Place of Birth", profile.place_of_birth],
              ].map(([label, value]) => value ? (
                <div key={label as string}>
                  <div className="text-xs text-stone-400">{label}</div>
                  <div className="mt-0.5 text-sm text-stone-700">{value}</div>
                </div>
              ) : null)}
            </div>

            {/* Address */}
            {(profile.address_block || profile.address_street) && (
              <div className="mt-4 border-t border-stone-100 pt-3">
                <div className="text-xs text-stone-400">Address</div>
                <div className="mt-0.5 text-sm text-stone-700">
                  {[profile.address_block, profile.address_street, profile.address_unit].filter(Boolean).join(" ")}
                  {profile.address_postal && `, S(${profile.address_postal})`}
                </div>
              </div>
            )}

            {/* Emergency contact */}
            {profile.emergency_name && (
              <div className="mt-4 border-t border-stone-100 pt-3">
                <div className="text-xs text-stone-400">Emergency Contact</div>
                <div className="mt-0.5 text-sm text-stone-700">
                  {profile.emergency_name}
                  {profile.emergency_relationship && ` (${profile.emergency_relationship})`}
                  {profile.emergency_contact && ` — ${profile.emergency_contact}`}
                </div>
              </div>
            )}

            {/* Skills */}
            {(profile.software_competencies || profile.typing_wpm || profile.shorthand_wpm) && (
              <div className="mt-4 border-t border-stone-100 pt-3">
                <div className="text-xs text-stone-400">Skills</div>
                <div className="mt-0.5 space-y-1 text-sm text-stone-700">
                  {profile.software_competencies && <div>{profile.software_competencies}</div>}
                  {profile.typing_wpm && <div>Typing: {profile.typing_wpm} WPM</div>}
                  {profile.shorthand_wpm && <div>Shorthand: {profile.shorthand_wpm} WPM</div>}
                </div>
              </div>
            )}

            {/* Languages */}
            {profile.languages && (profile.languages as unknown[]).length > 0 && (
              <div className="mt-4 border-t border-stone-100 pt-3">
                <div className="mb-1 text-xs text-stone-400">Languages</div>
                <div className="flex flex-wrap gap-1.5">
                  {(profile.languages as { language: string; spoken?: string; written?: string }[]).map((lang, i) => (
                    <span key={i} className="rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs text-stone-600">
                      {lang.language}
                      {(lang.spoken || lang.written) && (
                        <span className="text-stone-400"> — {[lang.spoken && `Spoken: ${lang.spoken}`, lang.written && `Written: ${lang.written}`].filter(Boolean).join(", ")}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Employment history */}
            {profile.employment_history && (profile.employment_history as unknown[]).length > 0 && (
              <div className="mt-4 border-t border-stone-100 pt-3">
                <div className="mb-2 text-xs text-stone-400">Employment History</div>
                <div className="space-y-2">
                  {(profile.employment_history as { company?: string; position?: string; from?: string; to?: string; reason_leaving?: string }[]).map((job, i) => (
                    <div key={i} className="rounded-lg bg-stone-50 p-3 text-sm">
                      <div className="font-medium text-stone-700">{job.position || "—"}</div>
                      <div className="text-stone-500">{job.company || "—"}</div>
                      <div className="mt-0.5 text-xs text-stone-400">
                        {job.from || "?"} — {job.to || "Present"}
                        {job.reason_leaving && ` | Left: ${job.reason_leaving}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {profile.education && Object.keys(profile.education).length > 0 && (
              <div className="mt-4 border-t border-stone-100 pt-3">
                <div className="mb-2 text-xs text-stone-400">Education</div>
                <div className="space-y-2">
                  {Object.entries(profile.education).map(([level, details]) => {
                    const d = details as { school?: string; course?: string; year?: string } | null;
                    if (!d || (!d.school && !d.course)) return null;
                    return (
                      <div key={level} className="rounded-lg bg-stone-50 p-3 text-sm">
                        <div className="text-xs font-medium uppercase text-stone-400">{level.replace(/_/g, " ")}</div>
                        {d.school && <div className="text-stone-700">{d.school}</div>}
                        {d.course && <div className="text-stone-500">{d.course}</div>}
                        {d.year && <div className="text-xs text-stone-400">{d.year}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interviews section */}
      <div className="rounded-2xl border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
          <h3 className="font-semibold text-stone-700">Interviews ({interviews.length})</h3>
          {canSchedule && !showSchedule && (
            <button
              onClick={handleOpenSchedule}
              className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600"
            >
              + Schedule
            </button>
          )}
        </div>

        {/* Schedule interview form */}
        {showSchedule && (
          <div className="border-b border-stone-100 px-5 py-4">
            <form onSubmit={handleScheduleInterview} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-500">Interviewer *</label>
                  <select
                    value={scheduleForm.managerId}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, managerId: e.target.value })}
                    className="h-9 w-full rounded-lg border border-stone-200 bg-stone-50 px-2 text-base outline-none focus:border-orange-400"
                  >
                    <option value="">Select interviewer</option>
                    {scheduleManagers.map((m) => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-500">Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={scheduleForm.datetime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, datetime: e.target.value })}
                    className="h-9 w-full rounded-lg border border-stone-200 bg-stone-50 px-2 text-base outline-none focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-500">Type</label>
                  <select
                    value={scheduleForm.type}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, type: e.target.value as "zoom" | "in_person" })}
                    className="h-9 w-full rounded-lg border border-stone-200 bg-stone-50 px-2 text-base outline-none focus:border-orange-400"
                  >
                    <option value="zoom">Zoom</option>
                    <option value="in_person">In-person</option>
                  </select>
                </div>
                {scheduleForm.type === "zoom" ? (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-500">Zoom Link</label>
                    <input
                      type="url"
                      value={scheduleForm.zoomLink}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, zoomLink: e.target.value })}
                      placeholder="https://zoom.us/j/..."
                      className="h-9 w-full rounded-lg border border-stone-200 bg-stone-50 px-2 text-base outline-none focus:border-orange-400"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-500">Location</label>
                    <input
                      type="text"
                      value={scheduleForm.location}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
                      placeholder="Office address..."
                      className="h-9 w-full rounded-lg border border-stone-200 bg-stone-50 px-2 text-base outline-none focus:border-orange-400"
                    />
                  </div>
                )}
              </div>
              {scheduleError && <p className="text-xs text-red-500">{scheduleError}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={scheduling}
                  className="rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  {scheduling ? "Scheduling..." : "Schedule Interview"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSchedule(false)}
                  className="rounded-lg border border-stone-200 px-4 py-1.5 text-sm text-stone-500 hover:bg-stone-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {interviews.length === 0 && !showSchedule ? (
          <div className="px-5 py-8 text-center text-sm text-stone-400">No interviews scheduled.</div>
        ) : interviews.length > 0 ? (
          <div className="divide-y divide-stone-100">
            {interviews.map((interview) => (
              <div key={interview.id} className="px-5 py-4">
                {/* Interview header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-stone-800 px-2 py-0.5 text-xs font-bold text-white">
                      Round {interview.round_number}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      interview.status === "completed" ? "bg-green-50 text-green-600" :
                      interview.status === "scheduled" ? "bg-blue-50 text-blue-600" :
                      interview.status === "cancelled" ? "bg-red-50 text-red-500" :
                      "bg-amber-50 text-amber-600"
                    }`}>
                      {interview.status}
                    </span>
                    <span className="text-xs text-stone-400">
                      {interview.type === "zoom" ? "Zoom" : "In-person"}
                    </span>
                    {recommendationBadge(interview.recommendation)}
                  </div>
                  {isManagerPlus && interview.status === "completed" && editingInterviewId !== interview.id && (
                    <button
                      onClick={() => startEditingFeedback(interview)}
                      className="shrink-0 rounded-lg border border-stone-200 px-2.5 py-1 text-xs text-stone-500 hover:bg-stone-100"
                    >
                      {interview.notes ? "Edit feedback" : "Add feedback"}
                    </button>
                  )}
                </div>

                {/* Interview details */}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400">
                  <span>{new Date(interview.datetime).toLocaleString()}</span>
                  <span>Interviewer: {interview.manager_name}</span>
                  {interview.location && <span>{interview.location}</span>}
                </div>

                {/* Feedback display (read-only) */}
                {interview.notes && editingInterviewId !== interview.id && (
                  <div className="mt-3 rounded-lg bg-stone-50 p-3">
                    <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-stone-400">Feedback</div>
                    <p className="text-sm text-stone-600 whitespace-pre-wrap">{interview.notes}</p>
                  </div>
                )}

                {/* Awaiting feedback indicator */}
                {interview.status === "completed" && !interview.notes && !interview.recommendation && editingInterviewId !== interview.id && (
                  <div className="mt-2 text-xs italic text-stone-300">Awaiting feedback</div>
                )}

                {/* Feedback edit form (manager+ only) */}
                {editingInterviewId === interview.id && (
                  <div className="mt-3 space-y-3 rounded-lg border border-orange-200 bg-orange-50/30 p-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-500">Feedback notes</label>
                      <textarea
                        value={feedbackForm.notes}
                        onChange={(e) => setFeedbackForm({ ...feedbackForm, notes: e.target.value })}
                        rows={3}
                        placeholder="Write your interview feedback..."
                        className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-base outline-none focus:border-orange-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-stone-500">Recommendation</label>
                      <div className="flex flex-wrap gap-2">
                        {RECOMMENDATION_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setFeedbackForm({
                              ...feedbackForm,
                              recommendation: feedbackForm.recommendation === opt.value ? null : opt.value,
                            })}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                              feedbackForm.recommendation === opt.value
                                ? opt.color
                                : "border-stone-200 bg-white text-stone-400 hover:border-stone-300"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveFeedback}
                        disabled={savingFeedback}
                        className="rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                      >
                        {savingFeedback ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingInterviewId(null)}
                        className="rounded-lg border border-stone-200 px-4 py-1.5 text-sm text-stone-500 hover:bg-stone-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity timeline (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Add note */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <h3 className="mb-3 font-semibold text-stone-700">Add Note</h3>
            <form onSubmit={handleAddNote} className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <select value={noteType} onChange={(e) => setNoteType(e.target.value)}
                  className="h-9 rounded-lg border border-stone-200 bg-stone-50 px-2 text-base outline-none focus:border-orange-400">
                  {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="text" value={noteText} onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Write a note…" className="h-9 min-w-0 flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 text-base outline-none focus:border-orange-400" />
                <button type="submit" disabled={!noteText.trim() || addingNote}
                  className="h-9 rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50">
                  Add
                </button>
              </div>
            </form>
          </div>

          {/* Timeline */}
          <div className="rounded-2xl border border-stone-200 bg-white">
            <div className="border-b border-stone-100 px-5 py-3">
              <h3 className="font-semibold text-stone-700">Activity ({activities.length})</h3>
            </div>
            {activities.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-stone-400">No activity yet.</div>
            ) : (
              <div className="divide-y divide-stone-50">
                {activities.map((a) => (
                  <div key={a.id} className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-500">{a.type}</span>
                      <span className="text-xs text-stone-400">{a.user_name}</span>
                      <span className="text-xs text-stone-300">
                        {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
                      </span>
                    </div>
                    {a.note && <p className="mt-1 text-sm text-stone-600">{a.note}</p>}
                    {a.outcome && <p className="mt-0.5 text-xs text-stone-400">Outcome: {a.outcome}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Documents sidebar (1/3) */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
              <h3 className="font-semibold text-stone-700">Documents</h3>
              <button
                type="button"
                onClick={() => setShowUpload(!showUpload)}
                className="rounded-lg bg-orange-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-orange-600"
              >
                {showUpload ? "Cancel" : "Upload"}
              </button>
            </div>
            {/* Upload form */}
            {showUpload && (
              <form onSubmit={handleUploadDoc} className="border-b border-stone-100 px-5 py-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Document Type</label>
                  <select
                    value={uploadLabel}
                    onChange={(e) => setUploadLabel(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-base text-stone-700 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  >
                    {["Resume", "RES5", "M5", "M9", "M9A", "HI", "M8", "M8A", "ComGI", "BCP", "PGI", "Other"].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">File</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-stone-700 hover:file:bg-stone-200"
                  />
                  <p className="mt-1 text-[10px] text-stone-400">PDF, JPEG, PNG, or Word. Max 10 MB.</p>
                </div>
                {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
                <button
                  type="submit"
                  disabled={!uploadFile || uploading}
                  className="w-full rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload Document"}
                </button>
              </form>
            )}
            {/* Generated PDFs */}
            {(candidate.profile_pdf_path || candidate.disc_pdf_path) && (
              <div className="divide-y divide-stone-50 border-b border-stone-100">
                {candidate.profile_pdf_path && (
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(candidate.profile_pdf_path!)}
                    className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-stone-50"
                  >
                    <div>
                      <div className="text-sm font-medium text-stone-700">Registration Form</div>
                      <div className="text-xs text-stone-400">Application PDF</div>
                    </div>
                    <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                )}
                {candidate.disc_pdf_path && (
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(candidate.disc_pdf_path!)}
                    className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-stone-50"
                  >
                    <div>
                      <div className="text-sm font-medium text-stone-700">DISC Profile</div>
                      <div className="text-xs text-stone-400">Personality assessment PDF</div>
                    </div>
                    <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                )}
              </div>
            )}
            {/* Uploaded documents */}
            {documents.length === 0 && !candidate.profile_pdf_path && !candidate.disc_pdf_path ? (
              <div className="px-5 py-8 text-center text-sm text-stone-400">No documents.</div>
            ) : documents.length > 0 ? (
              <div className="divide-y divide-stone-50">
                {documents.map((d) => (
                  <div
                    key={d.id}
                    className="flex w-full items-center justify-between px-5 py-3 transition-colors hover:bg-stone-50"
                  >
                    <button
                      type="button"
                      onClick={() => handleDownloadDoc(d.file_url)}
                      className="flex-1 text-left"
                    >
                      <div className="text-sm font-medium text-stone-700">{d.label}</div>
                      <div className="text-xs text-stone-400">{d.file_name}</div>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadDoc(d.file_url)}
                        className="p-1 text-stone-400 hover:text-stone-600"
                        title="Download"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(d.id)}
                        disabled={deletingDocId === d.id}
                        className="p-1 text-stone-400 hover:text-red-500 disabled:opacity-50"
                        title="Delete"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Candidate info */}
          {candidate.notes && (
            <div className="rounded-2xl border border-stone-200 bg-white p-5">
              <h3 className="mb-2 text-xs font-medium text-stone-400">Notes</h3>
              <p className="text-sm text-stone-600 whitespace-pre-wrap">{candidate.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
