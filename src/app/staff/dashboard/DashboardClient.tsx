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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="text-xs font-medium text-stone-400">Open Jobs</div>
          <div className="mt-1 text-3xl font-bold text-stone-800">{stats.openJobs}</div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="text-xs font-medium text-stone-400">Total Candidates</div>
          <div className="mt-1 text-3xl font-bold text-stone-800">{stats.totalCandidates}</div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="text-xs font-medium text-stone-400">Added This Week</div>
          <div className="mt-1 text-3xl font-bold text-orange-500">{stats.candidatesThisWeek}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pipeline overview */}
        <div className="rounded-2xl border border-stone-200 bg-white">
          <div className="border-b border-stone-100 px-5 py-4">
            <h2 className="font-semibold text-stone-700">Pipeline Overview</h2>
          </div>
          <div className="p-5">
            {stats.pipelineBreakdown.length === 0 ? (
              <p className="text-sm text-stone-400">No candidates in pipeline yet.</p>
            ) : (
              <div className="space-y-3">
                {stats.pipelineBreakdown.map((s) => {
                  const maxCount = Math.max(...stats.pipelineBreakdown.map((x) => x.count));
                  const pct = maxCount > 0 ? (s.count / maxCount) * 100 : 0;
                  return (
                    <div key={s.stage}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-stone-600">{s.stage}</span>
                        <span className="font-medium text-stone-800">{s.count}</span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                        <div className="h-full rounded-full bg-orange-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* DISC distribution */}
        <div className="rounded-2xl border border-stone-200 bg-white">
          <div className="border-b border-stone-100 px-5 py-4">
            <h2 className="font-semibold text-stone-700">DISC Distribution</h2>
          </div>
          <div className="p-5">
            {stats.discTypeDistribution.length === 0 ? (
              <p className="text-sm text-stone-400">No DISC assessments completed yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {stats.discTypeDistribution.map((d) => (
                  <div key={d.type} className="rounded-xl border border-purple-100 bg-purple-50 px-3 py-2 text-center">
                    <div className="text-lg font-bold text-purple-600">{d.type}</div>
                    <div className="text-xs text-purple-400">{d.count} candidate{d.count !== 1 ? "s" : ""}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Funnel by job */}
      {stats.funnelByJob.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white">
          <div className="border-b border-stone-100 px-5 py-4">
            <h2 className="font-semibold text-stone-700">Hiring Funnel</h2>
          </div>
          <div className="divide-y divide-stone-50">
            {stats.funnelByJob.map((f) => (
              <div key={f.job_id} className="px-5 py-4">
                <Link href={`/staff/jobs/${f.job_id}`} className="text-sm font-medium text-stone-700 hover:text-orange-500">
                  {f.job_title}
                </Link>
                <div className="mt-2 flex items-center gap-1">
                  {f.stages.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-1">
                      <div className="rounded bg-stone-100 px-2 py-1 text-center">
                        <div className="text-sm font-semibold text-stone-700">{s.count}</div>
                        <div className="text-[10px] text-stone-400">{s.name}</div>
                      </div>
                      {i < f.stages.length - 1 && (
                        <svg className="h-3 w-3 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="rounded-2xl border border-stone-200 bg-white">
        <div className="border-b border-stone-100 px-5 py-4">
          <h2 className="font-semibold text-stone-700">Recent Activity</h2>
        </div>
        {stats.recentActivity.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-stone-400">No activity yet.</div>
        ) : (
          <div className="divide-y divide-stone-50">
            {stats.recentActivity.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-500">{a.type}</span>
                <span className="text-sm text-stone-600">{a.candidate_name}</span>
                {a.note && <span className="flex-1 truncate text-sm text-stone-400">{a.note}</span>}
                <span className="shrink-0 text-xs text-stone-300">
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
