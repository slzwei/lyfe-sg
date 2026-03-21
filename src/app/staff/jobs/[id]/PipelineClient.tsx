"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getJob,
  updateJob,
  moveCandidate,
  addCandidateToJob,
  createStage,
  deleteStage,
  inviteCandidateForDisc,
  type Job,
  type PipelineStage,
  type PipelineCandidate,
} from "../actions";

const STATUS_OPTIONS = ["draft", "open", "paused", "closed"] as const;

export default function PipelineClient({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<Job | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [candidates, setCandidates] = useState<PipelineCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add candidate form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [adding, setAdding] = useState(false);

  // Add stage form
  const [newStageName, setNewStageName] = useState("");

  // Drag state
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [inviting, setInviting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const result = await getJob(jobId);
    if (result.success) {
      setJob(result.job || null);
      setStages(result.stages || []);
      setCandidates(result.candidates || []);
    } else {
      setError(result.error || "Failed to load job.");
    }
    setLoading(false);
  }, [jobId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function candidatesInStage(stageId: string) {
    return candidates.filter((c) => c.current_stage_id === stageId);
  }

  // Drag and drop handlers
  function handleDragStart(candidateId: string) {
    setDragging(candidateId);
  }

  function handleDragOver(e: React.DragEvent, stageId: string) {
    e.preventDefault();
    setDragOver(stageId);
  }

  function handleDragLeave() {
    setDragOver(null);
  }

  async function handleDrop(stageId: string) {
    if (!dragging) return;
    setDragOver(null);
    setDragging(null);

    const candidate = candidates.find((c) => c.id === dragging);
    if (!candidate || candidate.current_stage_id === stageId) return;

    // Optimistic update
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === dragging ? { ...c, current_stage_id: stageId, stage_entered_at: new Date().toISOString() } : c
      )
    );

    const result = await moveCandidate(dragging, stageId);
    if (!result.success) {
      fetchData(); // Revert on failure
    }
  }

  async function handleAddCandidate(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    const result = await addCandidateToJob(jobId, addForm);
    if (result.success) {
      setAddForm({ name: "", phone: "", email: "", notes: "" });
      setShowAddForm(false);
      fetchData();
    } else {
      setError(result.error || "Failed to add candidate.");
    }
    setAdding(false);
  }

  async function handleInviteForDisc(candidateId: string) {
    setInviting(candidateId);
    const result = await inviteCandidateForDisc(candidateId);
    if (result.success) {
      fetchData();
    } else {
      setError(result.error || "Failed to send invitation.");
    }
    setInviting(null);
  }

  async function handleAddStage() {
    if (!newStageName.trim()) return;
    await createStage(jobId, { name: newStageName.trim() });
    setNewStageName("");
    fetchData();
  }

  async function handleDeleteStage(stageId: string) {
    const result = await deleteStage(stageId);
    if (result.success) {
      fetchData();
    } else {
      setError(result.error || "Failed to delete stage.");
    }
  }

  async function handleStatusChange(newStatus: string) {
    await updateJob(jobId, { status: newStatus as typeof STATUS_OPTIONS[number] });
    fetchData();
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-stone-400">Loading pipeline…</div>;
  }

  if (!job) {
    return <div className="py-12 text-center text-sm text-red-500">{error || "Job not found."}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Job header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/staff/jobs" className="text-stone-400 hover:text-stone-600 transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-stone-800">{job.title}</h1>
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm text-stone-400">
            {job.department && <span>{job.department}</span>}
            {job.location && <span>{job.location}</span>}
            <span>{candidates.length} candidates</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={job.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm outline-none focus:border-orange-400"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
          >
            Add Candidate
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
          <button onClick={() => setError("")} className="ml-2 underline">dismiss</button>
        </p>
      )}

      {/* Add candidate form */}
      {showAddForm && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h3 className="mb-3 font-semibold text-stone-700">Add Candidate</h3>
          <form onSubmit={handleAddCandidate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-stone-500">Name *</label>
              <input
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="Full name"
                className="h-9 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-orange-400"
                required
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-stone-500">Phone *</label>
              <input
                type="tel"
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                placeholder="+65..."
                className="h-9 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-orange-400"
                required
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-stone-500">Email</label>
              <input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="email@example.com"
                className="h-9 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-orange-400"
              />
            </div>
            <button
              type="submit"
              disabled={adding || !addForm.name || !addForm.phone}
              className="h-9 shrink-0 rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {adding ? "Adding…" : "Add"}
            </button>
          </form>
        </div>
      )}

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageCandidates = candidatesInStage(stage.id);
          const isOver = dragOver === stage.id;

          return (
            <div
              key={stage.id}
              className={`w-64 shrink-0 rounded-2xl border bg-white transition-colors ${
                isOver ? "border-orange-400 bg-orange-50/30" : "border-stone-200"
              }`}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(stage.id)}
            >
              {/* Stage header */}
              <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-stone-700">{stage.name}</h3>
                  <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-xs text-stone-500">
                    {stageCandidates.length}
                  </span>
                </div>
                {stageCandidates.length === 0 && stage.stage_type === "custom" && (
                  <button
                    onClick={() => handleDeleteStage(stage.id)}
                    className="text-stone-300 hover:text-red-400 transition-colors"
                    title="Delete empty stage"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Candidate cards */}
              <div className="min-h-[80px] space-y-2 p-3">
                {stageCandidates.map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={() => handleDragStart(c.id)}
                    onDragEnd={() => { setDragging(null); setDragOver(null); }}
                    className={`cursor-grab rounded-xl border border-stone-100 bg-stone-50 p-3 transition-shadow hover:shadow-sm active:cursor-grabbing ${
                      dragging === c.id ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-stone-800">{c.name}</span>
                      {c.disc_type && (
                        <span className="rounded bg-purple-50 px-1 py-0.5 text-[10px] font-semibold text-purple-600">
                          {c.disc_type}
                        </span>
                      )}
                    </div>
                    {c.email && <div className="mt-0.5 text-xs text-stone-400 truncate">{c.email}</div>}
                    <div className="mt-1 flex items-center justify-between">
                      {c.stage_entered_at && (
                        <span className="text-[10px] text-stone-300">
                          {daysSince(c.stage_entered_at)}
                        </span>
                      )}
                      {!c.disc_type && !c.has_invitation && c.email && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleInviteForDisc(c.id); }}
                          disabled={inviting === c.id}
                          className="rounded px-1.5 py-0.5 text-[10px] text-orange-400 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50"
                          title="Send DISC assessment invitation"
                        >
                          {inviting === c.id ? "Sending…" : "DISC Invite"}
                        </button>
                      )}
                      {c.has_invitation && !c.disc_type && (
                        <span className="text-[10px] text-stone-300">Invited</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Add stage column */}
        <div className="w-64 shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              placeholder="New stage…"
              className="h-9 flex-1 rounded-lg border border-dashed border-stone-300 bg-transparent px-3 text-sm text-stone-500 outline-none placeholder:text-stone-300 focus:border-orange-400"
              onKeyDown={(e) => e.key === "Enter" && handleAddStage()}
            />
            {newStageName && (
              <button
                onClick={handleAddStage}
                className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200"
              >
                Add
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function daysSince(date: string): string {
  const ms = Date.now() - new Date(date).getTime();
  const days = Math.floor(ms / 86400000);
  if (days === 0) return "Added today";
  if (days === 1) return "1 day in stage";
  return `${days} days in stage`;
}
