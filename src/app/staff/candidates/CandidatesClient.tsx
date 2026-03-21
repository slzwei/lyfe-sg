"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { searchCandidates, listJobsForFilter, type SearchResult } from "./actions";

export default function CandidatesClient() {
  const [candidates, setCandidates] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    const result = await searchCandidates({
      query: query || undefined,
      jobId: jobFilter || undefined,
    });
    if (result.success) {
      setCandidates(result.data || []);
      setTotal(result.total || 0);
    }
    setLoading(false);
  }, [query, jobFilter]);

  useEffect(() => {
    listJobsForFilter().then(setJobs);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(fetchCandidates, 300);
    return () => clearTimeout(timeout);
  }, [fetchCandidates]);

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or phone…"
            className="h-10 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <select
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
          className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-orange-400"
        >
          <option value="">All jobs</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>{j.title}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <div className="text-sm text-stone-400">
        {loading ? "Searching…" : `${total} candidate${total !== 1 ? "s" : ""}`}
      </div>

      {/* Candidates table */}
      {!loading && candidates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 py-16 text-center">
          <p className="text-stone-400">
            {query || jobFilter ? "No candidates match your search." : "No candidates yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-left text-xs font-medium text-stone-400">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Job</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">DISC</th>
                <th className="px-4 py-3">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {candidates.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/staff/candidates/${c.id}`}
                      className="font-medium text-stone-800 hover:text-orange-500"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    <div>{c.email || "—"}</div>
                    <div className="text-xs text-stone-300">{c.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-stone-500">{c.job_title || "—"}</td>
                  <td className="px-4 py-3">
                    {c.stage_name ? (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                        {c.stage_name}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.disc_type ? (
                      <span className="rounded bg-purple-50 px-1.5 py-0.5 text-xs font-semibold text-purple-600">
                        {c.disc_type}
                      </span>
                    ) : (
                      <span className="text-xs text-stone-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-400">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
