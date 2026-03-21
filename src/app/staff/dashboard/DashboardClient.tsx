"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getDashboardStats, type DashboardStats } from "./actions";

export default function DashboardClient() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then((r) => {
      if (r.success && r.stats) setStats(r.stats);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="py-12 text-center text-sm text-stone-400">Loading dashboard…</div>;
  if (!stats) return <div className="py-12 text-center text-sm text-red-500">Failed to load.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">Dashboard</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="text-xs font-medium text-stone-400">Total Candidates</div>
          <div className="mt-1 text-3xl font-bold text-stone-800">{stats.totalCandidates}</div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="text-xs font-medium text-stone-400">Completed</div>
          <div className="mt-1 text-3xl font-bold text-green-600">{stats.completedCount}</div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="text-xs font-medium text-stone-400">Pending</div>
          <div className="mt-1 text-3xl font-bold text-orange-500">{stats.pendingCount}</div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="text-xs font-medium text-stone-400">Job Postings</div>
          <div className="mt-1 text-3xl font-bold text-stone-800">{stats.openJobs}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* DISC distribution */}
        <div className="rounded-2xl border border-stone-200 bg-white">
          <div className="border-b border-stone-100 px-5 py-4">
            <h2 className="font-semibold text-stone-700">DISC Distribution</h2>
          </div>
          <div className="p-5">
            {stats.discTypeDistribution.length === 0 ? (
              <p className="text-sm text-stone-400">No assessments completed yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {stats.discTypeDistribution.map((d) => (
                  <div key={d.type} className="rounded-xl border border-purple-100 bg-purple-50 px-3 py-2 text-center">
                    <div className="text-lg font-bold text-purple-600">{d.type}</div>
                    <div className="text-xs text-purple-400">{d.count}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent candidates */}
        <div className="rounded-2xl border border-stone-200 bg-white">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <h2 className="font-semibold text-stone-700">Recent Candidates</h2>
            <Link href="/staff/candidates" className="text-xs text-orange-500 hover:text-orange-600">View all</Link>
          </div>
          {stats.recentCandidates.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-stone-400">No candidates yet.</div>
          ) : (
            <div className="divide-y divide-stone-50">
              {stats.recentCandidates.map((c, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-sm font-medium text-stone-700">{c.name}</div>
                    <div className="text-xs text-stone-400">{c.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                      c.status === "accepted" ? "bg-green-50 text-green-700 border-green-200" :
                      "bg-yellow-50 text-yellow-700 border-yellow-200"
                    }`}>
                      {c.status}
                    </span>
                    <span className="text-xs text-stone-300">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
