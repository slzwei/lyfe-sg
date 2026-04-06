"use client";

import { useState } from "react";
import { updateInterviewFeedback, type InterviewRecord } from "../../actions";
import type { UseInterviewScheduleReturn } from "../hooks/useInterviewSchedule";

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

export default function InterviewsSection({
  interviews,
  candidateId,
  scheduleHook,
  staffRole,
  onRefetch,
}: {
  interviews: InterviewRecord[];
  candidateId: string;
  scheduleHook: UseInterviewScheduleReturn;
  staffRole: string;
  onRefetch: () => void;
}) {
  const isManagerPlus = staffRole && ["manager", "director", "admin"].includes(staffRole);
  const canSchedule = staffRole && ["pa", "manager", "director", "admin"].includes(staffRole);

  const {
    showSchedule,
    setShowSchedule,
    scheduleManagers,
    scheduleForm,
    setScheduleForm,
    scheduling,
    scheduleError,
    handleOpenSchedule,
    handleScheduleInterview,
    rescheduleTarget,
    rescheduleForm,
    setRescheduleForm,
    rescheduling,
    rescheduleError,
    handleOpenReschedule,
    handleCloseReschedule,
    handleRescheduleInterview,
    cancellingId,
    confirmCancelId,
    cancelError,
    handleConfirmCancel,
    handleCancelInterview,
    handleDismissCancel,
  } = scheduleHook;

  // Feedback editing
  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({ notes: "", recommendation: null as string | null });
  const [savingFeedback, setSavingFeedback] = useState(false);

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
    onRefetch();
  }

  return (
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
          {interviews.map((interview) => {
            const isScheduled = interview.status === "scheduled";
            const isRescheduling = rescheduleTarget?.id === interview.id;
            const isConfirmingCancel = confirmCancelId === interview.id;
            const isCancelling = cancellingId === interview.id;

            return (
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
                    {interview.status === "scheduled" && interview.confirmed_at && (
                      <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600">
                        Confirmed
                      </span>
                    )}
                    <span className="text-xs text-stone-400">
                      {interview.type === "zoom" ? "Zoom" : "In-person"}
                    </span>
                    {recommendationBadge(interview.recommendation)}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {/* Reschedule / Cancel for scheduled interviews */}
                    {canSchedule && isScheduled && !isRescheduling && !isConfirmingCancel && (
                      <>
                        <button
                          onClick={() => handleOpenReschedule(interview)}
                          className="rounded-lg border border-stone-200 px-2.5 py-1 text-xs text-stone-500 hover:bg-stone-100"
                        >
                          Reschedule
                        </button>
                        <button
                          onClick={() => handleConfirmCancel(interview.id)}
                          className="rounded-lg border border-stone-200 px-2.5 py-1 text-xs text-stone-500 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {/* Cancel confirmation */}
                    {isConfirmingCancel && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-red-500">Cancel interview?</span>
                        <button
                          onClick={() => handleCancelInterview(interview.id)}
                          disabled={isCancelling}
                          className="rounded-lg bg-red-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                        >
                          {isCancelling ? "Cancelling..." : "Confirm"}
                        </button>
                        <button
                          onClick={handleDismissCancel}
                          className="rounded-lg border border-stone-200 px-2.5 py-1 text-xs text-stone-500 hover:bg-stone-100"
                        >
                          No
                        </button>
                      </div>
                    )}
                    {/* Feedback button for completed interviews */}
                    {isManagerPlus && interview.status === "completed" && editingInterviewId !== interview.id && (
                      <button
                        onClick={() => startEditingFeedback(interview)}
                        className="rounded-lg border border-stone-200 px-2.5 py-1 text-xs text-stone-500 hover:bg-stone-100"
                      >
                        {interview.notes ? "Edit feedback" : "Add feedback"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Interview details */}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400">
                  <span>{new Date(interview.datetime).toLocaleString()}</span>
                  <span>Interviewer: {interview.manager_name}</span>
                  {interview.location && <span>{interview.location}</span>}
                </div>

                {/* Cancel error */}
                {cancelError && confirmCancelId === interview.id && (
                  <p className="mt-2 text-xs text-red-500">{cancelError}</p>
                )}

                {/* Reschedule inline form */}
                {isRescheduling && (
                  <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50/30 p-4">
                    <form onSubmit={handleRescheduleInterview} className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-stone-500">New Date & Time *</label>
                          <input
                            type="datetime-local"
                            value={rescheduleForm.datetime}
                            onChange={(e) => setRescheduleForm({ ...rescheduleForm, datetime: e.target.value })}
                            className="h-9 w-full rounded-lg border border-stone-200 bg-white px-2 text-base outline-none focus:border-orange-400"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-stone-500">Type</label>
                          <select
                            value={rescheduleForm.type}
                            onChange={(e) => setRescheduleForm({ ...rescheduleForm, type: e.target.value as "zoom" | "in_person" })}
                            className="h-9 w-full rounded-lg border border-stone-200 bg-white px-2 text-base outline-none focus:border-orange-400"
                          >
                            <option value="zoom">Zoom</option>
                            <option value="in_person">In-person</option>
                          </select>
                        </div>
                        {rescheduleForm.type === "zoom" ? (
                          <div>
                            <label className="mb-1 block text-xs font-medium text-stone-500">Zoom Link</label>
                            <input
                              type="url"
                              value={rescheduleForm.zoomLink}
                              onChange={(e) => setRescheduleForm({ ...rescheduleForm, zoomLink: e.target.value })}
                              placeholder="https://zoom.us/j/..."
                              className="h-9 w-full rounded-lg border border-stone-200 bg-white px-2 text-base outline-none focus:border-orange-400"
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="mb-1 block text-xs font-medium text-stone-500">Location</label>
                            <input
                              type="text"
                              value={rescheduleForm.location}
                              onChange={(e) => setRescheduleForm({ ...rescheduleForm, location: e.target.value })}
                              placeholder="Office address..."
                              className="h-9 w-full rounded-lg border border-stone-200 bg-white px-2 text-base outline-none focus:border-orange-400"
                            />
                          </div>
                        )}
                      </div>
                      {rescheduleError && <p className="text-xs text-red-500">{rescheduleError}</p>}
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={rescheduling}
                          className="rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                        >
                          {rescheduling ? "Rescheduling..." : "Reschedule"}
                        </button>
                        <button
                          type="button"
                          onClick={handleCloseReschedule}
                          className="rounded-lg border border-stone-200 px-4 py-1.5 text-sm text-stone-500 hover:bg-stone-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

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
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
