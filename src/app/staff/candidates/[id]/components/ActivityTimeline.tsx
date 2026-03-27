"use client";

import { useState } from "react";
import { addActivity, type Activity } from "../../actions";

const ACTIVITY_TYPES = ["note", "call", "email", "meeting", "status_change", "follow_up"] as const;

export default function ActivityTimeline({
  activities,
  candidateId,
  onRefetch,
}: {
  activities: Activity[];
  candidateId: string;
  onRefetch: () => void;
}) {
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState<string>("note");
  const [addingNote, setAddingNote] = useState(false);

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setAddingNote(true);
    await addActivity(candidateId, { type: noteType, note: noteText.trim() });
    setNoteText("");
    onRefetch();
    setAddingNote(false);
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
              placeholder="Write a note\u2026" className="h-9 min-w-0 flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 text-base outline-none focus:border-orange-400" />
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
  );
}
