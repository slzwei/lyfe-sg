"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { listJobs, createJob, updateJob, type Job } from "./actions";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-stone-100 text-stone-600",
  open: "bg-green-50 text-green-700 border-green-200",
  paused: "bg-yellow-50 text-yellow-700 border-yellow-200",
  closed: "bg-red-50 text-red-600 border-red-200",
};

export default function JobsClient() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", department: "", location: "", description: "" });
  const [error, setError] = useState("");

  const fetchJobs = useCallback(async () => {
    const result = await listJobs();
    if (result.success && result.data) setJobs(result.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");

    const result = await createJob(form);
    if (result.success) {
      setForm({ title: "", department: "", location: "", description: "" });
      setShowCreate(false);
      fetchJobs();
    } else {
      setError(result.error || "Failed to create job.");
    }
    setCreating(false);
  }

  async function handleToggleStatus(job: Job) {
    const newStatus = job.status === "open" ? "paused" : "open";
    await updateJob(job.id, { status: newStatus });
    fetchJobs();
  }

  return (
    <div className="space-y-6">
      {/* Create button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          {showCreate ? "Cancel" : "New Job"}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-stone-800">Create Job</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Financial Consultant"
                  className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">Department</label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="e.g. Sales"
                  className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Singapore"
                className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Job description…"
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={creating || !form.title}
              className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create Job"}
            </button>
          </form>
        </div>
      )}

      {/* Jobs list */}
      {loading ? (
        <div className="py-12 text-center text-sm text-stone-400">Loading…</div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 py-16 text-center">
          <p className="text-stone-400">No jobs yet. Create your first job to start building a pipeline.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/staff/jobs/${job.id}`}
              className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-stone-800 truncate">{job.title}</h3>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[job.status] || STATUS_STYLES.draft}`}>
                    {job.status}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-sm text-stone-400">
                  {job.department && <span>{job.department}</span>}
                  {job.location && <span>{job.location}</span>}
                  <span>{job.candidate_count || 0} candidates</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(job.status === "open" || job.status === "paused" || job.status === "draft") && (
                  <button
                    onClick={(e) => { e.preventDefault(); handleToggleStatus(job); }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      job.status === "open"
                        ? "text-yellow-600 hover:bg-yellow-50"
                        : "text-green-600 hover:bg-green-50"
                    }`}
                  >
                    {job.status === "open" ? "Pause" : "Open"}
                  </button>
                )}
                <svg className="h-5 w-5 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
