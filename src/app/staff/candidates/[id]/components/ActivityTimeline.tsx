"use client";

import { useState } from "react";
import { addActivity, deleteActivity, type Activity } from "../../actions";

const ACTIVITY_TYPES = ["note", "call", "email", "meeting", "status_change", "follow_up"] as const;

export default function ActivityTimeline({
  activities,
  candidateId,
  staffId,
  staffRole,
  onRefetch,
}: {
  activities: Activity[];
  candidateId: string;
  staffId: string;
  staffRole: string;
  onRefetch: () => void;
}) {
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState<string>("note");
  const [addingNote, setAddingNote] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const isAdmin = staffRole === "admin";

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setAddingNote(true);
    await addActivity(candidateId, { type: noteType, note: noteText.trim() });
    setNoteText("");
    onRefetch();
    setAddingNote(false);
  }

  async function handleDelete(activityId: string) {
    setDeleting(activityId);
    await deleteActivity(activityId);
    onRefetch();
    setDeleting(null);
  }

  return (
    <div className="min-w-0 lg:col-span-2 space-y-4">
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
            {activities.map((a) => {
              const canDelete = isAdmin || a.user_id === staffId;
              return (
                <div key={a.id} className="group px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-500">{a.type}</span>
                    <span className="text-xs text-stone-400">{a.user_name}</span>
                    <span className="text-xs text-stone-300">
                      {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(a.id)}
                        disabled={deleting === a.id}
                        title="Delete"
                        className="ml-auto rounded p-1 text-stone-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {a.note && <p className="mt-1 text-sm text-stone-600">{a.note}</p>}
                  {a.outcome && <p className="mt-0.5 text-xs text-stone-400">Outcome: {a.outcome}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
