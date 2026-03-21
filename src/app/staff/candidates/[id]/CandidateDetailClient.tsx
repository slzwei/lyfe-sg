"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getCandidate,
  addActivity,
  updateCandidate,
  getInterviews,
  updateInterviewFeedback,
  type CandidateDetail,
  type Activity,
  type CandidateDocument,
  type InterviewRecord,
} from "../actions";

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

  const isManagerPlus = staffRole && ["manager", "director", "admin"].includes(staffRole);

  const fetchData = useCallback(async () => {
    const [candidateResult, interviewsResult] = await Promise.all([
      getCandidate(candidateId),
      getInterviews(candidateId),
    ]);
    if (candidateResult.success && candidateResult.candidate) {
      setCandidate(candidateResult.candidate);
      setActivities(candidateResult.activities || []);
      setDocuments(candidateResult.documents || []);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/staff/candidates" className="text-stone-400 hover:text-stone-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-stone-800">{candidate.name}</h1>
            {candidate.disc_type && (
              <span className="rounded bg-purple-50 px-2 py-0.5 text-sm font-semibold text-purple-600">
                {candidate.disc_type}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm text-stone-400">
            {candidate.email && <span>{candidate.email}</span>}
            <span>{candidate.phone}</span>
          </div>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-500 hover:bg-stone-100"
        >
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Name</label>
              <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="h-9 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Email</label>
              <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="h-9 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Phone</label>
              <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="h-9 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-orange-400" />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-stone-500">Notes</label>
            <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              rows={2} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <button onClick={handleSaveEdit} className="mt-3 rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-orange-600">Save</button>
        </div>
      )}

      {/* Status cards row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="text-xs text-stone-400">Job</div>
          <div className="mt-1 text-sm font-medium text-stone-700">
            {candidate.job_title ? (
              <Link href={`/staff/jobs/${candidate.job_id}`} className="hover:text-orange-500">{candidate.job_title}</Link>
            ) : "\u2014"}
          </div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="text-xs text-stone-400">Stage</div>
          <div className="mt-1 text-sm font-medium text-stone-700">{candidate.stage_name || "\u2014"}</div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="text-xs text-stone-400">DISC</div>
          <div className="mt-1 text-sm font-medium text-stone-700">{candidate.disc_type || (candidate.disc_completed ? "Completed" : "Not done")}</div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="text-xs text-stone-400">Application</div>
          <div className="mt-1 text-sm font-medium text-stone-700">{candidate.profile_completed ? "Completed" : "Pending"}</div>
        </div>
      </div>

      {/* Interviews section */}
      <div className="rounded-2xl border border-stone-200 bg-white">
        <div className="border-b border-stone-100 px-5 py-3">
          <h3 className="font-semibold text-stone-700">Interviews ({interviews.length})</h3>
        </div>
        {interviews.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-stone-400">No interviews scheduled.</div>
        ) : (
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
                        className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400"
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
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity timeline (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Add note */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <h3 className="mb-3 font-semibold text-stone-700">Add Note</h3>
            <form onSubmit={handleAddNote} className="space-y-2">
              <div className="flex gap-2">
                <select value={noteType} onChange={(e) => setNoteType(e.target.value)}
                  className="h-9 rounded-lg border border-stone-200 bg-stone-50 px-2 text-xs outline-none focus:border-orange-400">
                  {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="text" value={noteText} onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Write a note\u2026" className="h-9 flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-orange-400" />
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
            <div className="border-b border-stone-100 px-5 py-3">
              <h3 className="font-semibold text-stone-700">Documents ({documents.length})</h3>
            </div>
            {documents.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-stone-400">No documents.</div>
            ) : (
              <div className="divide-y divide-stone-50">
                {documents.map((d) => (
                  <div key={d.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="text-sm font-medium text-stone-700">{d.label}</div>
                      <div className="text-xs text-stone-400">{d.file_name}</div>
                    </div>
                    <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                      className="text-stone-400 hover:text-orange-500">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  </div>
                ))}
              </div>
            )}
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
