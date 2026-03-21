"use client";

import { useState, useEffect, useCallback } from "react";
import { listJobPostings, createJobPosting, updateJobPosting, deleteJobPosting, type JobPosting } from "./actions";

const PORTALS = ["Indeed", "Jobstreet", "LinkedIn", "MyCareersFuture", "Company Website", "Other"] as const;

export default function JobsClient() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", portal: "", portal_url: "" });
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ id: string; type: "close" | "delete" } | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const fetchJobs = useCallback(async () => {
    const result = await listJobPostings();
    if (result.success && result.data) setJobs(result.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  function resetForm() {
    setForm({ title: "", description: "", portal: "", portal_url: "" });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    const result = await createJobPosting(form);
    if (result.success) {
      resetForm();
      setShowCreate(false);
      fetchJobs();
    } else {
      setError(result.error || "Failed.");
    }
    setCreating(false);
  }

  function startEdit(job: JobPosting) {
    setEditingId(job.id);
    setForm({
      title: job.title,
      description: job.description || "",
      portal: job.portal || "",
      portal_url: job.portal_url || "",
    });
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    await updateJobPosting(editingId, form);
    setEditingId(null);
    resetForm();
    fetchJobs();
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;
    const { id, type } = confirmAction;
    setConfirmAction(null);
    setConfirmText("");
    if (type === "close") {
      setJobs((prev) => prev.map((j) => j.id === id ? { ...j, status: "closed" } : j));
      await updateJobPosting(id, { status: "closed" });
      fetchJobs();
    } else {
      await deleteJobPosting(id);
      fetchJobs();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Job Postings</h1>
        <button
          onClick={() => { setShowCreate(!showCreate); setEditingId(null); resetForm(); }}
          className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          {showCreate ? "Cancel" : "Add Posting"}
        </button>
      </div>

      {/* Create / Edit form */}
      {(showCreate || editingId) && (
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-stone-800">
            {editingId ? "Edit Job Posting" : "New Job Posting"}
          </h2>
          <form onSubmit={editingId ? (e) => { e.preventDefault(); handleSaveEdit(); } : handleCreate} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">Job Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Financial Consultant" required
                  className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">Portal</label>
                <select value={form.portal} onChange={(e) => setForm({ ...form, portal: e.target.value })}
                  className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100">
                  <option value="">Select portal…</option>
                  {PORTALS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Posting URL</label>
              <input type="text" value={form.portal_url} onChange={(e) => setForm({ ...form, portal_url: e.target.value })}
                placeholder="https://www.indeed.com/job/..."
                className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Job Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4} placeholder="Paste the job description here…"
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={creating || !form.title}
                className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50">
                {editingId ? "Save Changes" : creating ? "Creating…" : "Add Posting"}
              </button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); resetForm(); }}
                  className="rounded-lg border border-stone-200 px-5 py-2 text-sm text-stone-500 hover:bg-stone-100">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Jobs list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-40 animate-pulse rounded bg-stone-200" />
                    <div className="h-5 w-14 animate-pulse rounded-full bg-stone-100" />
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-4 w-16 animate-pulse rounded bg-stone-100" />
                    <div className="h-3.5 w-20 animate-pulse rounded bg-stone-100" />
                    <div className="h-3.5 w-24 animate-pulse rounded bg-stone-100" />
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="h-3.5 w-full animate-pulse rounded bg-stone-100" />
                    <div className="h-3.5 w-3/4 animate-pulse rounded bg-stone-100" />
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-1">
                  <div className="h-7 w-14 animate-pulse rounded-lg bg-stone-100" />
                  <div className="h-7 w-10 animate-pulse rounded-lg bg-stone-100" />
                  <div className="h-7 w-14 animate-pulse rounded-lg bg-stone-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 py-16 text-center">
          <p className="text-stone-400">No job postings yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-stone-800">{job.title}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                      job.status === "open" ? "bg-green-50 text-green-700 border-green-200" :
                      job.status === "closed" ? "bg-red-50 text-red-600 border-red-200" :
                      "bg-stone-100 text-stone-600 border-stone-200"
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-stone-400">
                    {job.portal && (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-600">{job.portal}</span>
                    )}
                    {job.created_at && <span>{new Date(job.created_at).toLocaleDateString()}</span>}
                  </div>
                  {job.portal_url && (
                    <a href={job.portal_url} target="_blank" rel="noopener noreferrer"
                      className="mt-1 inline-block text-sm text-orange-500 hover:text-orange-600 truncate max-w-md">
                      {job.portal_url}
                    </a>
                  )}
                  {job.description && (
                    <p className="mt-2 text-sm text-stone-500 line-clamp-2 whitespace-pre-wrap">{job.description}</p>
                  )}
                </div>
                <div className="ml-4 flex shrink-0 items-center gap-1">
                  {job.status === "open" && (
                    <button onClick={() => { setConfirmAction({ id: job.id, type: "close" }); setConfirmText(""); }}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50">
                      Close
                    </button>
                  )}
                  <button onClick={() => startEdit(job)}
                    className="rounded-lg px-3 py-1.5 text-xs text-stone-400 hover:bg-stone-100 hover:text-stone-600">
                    Edit
                  </button>
                  <button onClick={() => { setConfirmAction({ id: job.id, type: "delete" }); setConfirmText(""); }}
                    className="rounded-lg px-3 py-1.5 text-xs text-stone-400 hover:bg-red-50 hover:text-red-500">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setConfirmAction(null); setConfirmText(""); }}>
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-stone-800">
              {confirmAction.type === "close" ? "Close Job Posting" : "Delete Job Posting"}
            </h3>
            <p className="mt-2 text-sm text-stone-500">
              Type <span className="font-semibold text-stone-700">&quot;{confirmAction.type}&quot;</span> to confirm.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={confirmAction.type}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") { setConfirmAction(null); setConfirmText(""); }
                if (e.key === "Enter" && confirmText.toLowerCase() === confirmAction.type) handleConfirmAction();
              }}
              className="mt-3 h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setConfirmAction(null); setConfirmText(""); }}
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-500 hover:bg-stone-100">
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={confirmText.toLowerCase() !== confirmAction.type}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-30">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
