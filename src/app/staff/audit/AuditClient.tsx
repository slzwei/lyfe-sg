"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuditEntries, restoreDeletedEntry, type AuditEntry, type AuditFilters } from "./actions";

const AUDITED_TABLES = [
  "candidates", "invitations", "candidate_profiles", "disc_results",
  "disc_responses", "leads", "lead_activities", "event_attendees", "pa_manager_assignments",
];

const TABLE_LABELS: Record<string, string> = {
  candidates: "Candidates",
  invitations: "Invitations",
  candidate_profiles: "Candidate Profiles",
  disc_results: "DISC Results",
  disc_responses: "DISC Responses",
  leads: "Leads",
  lead_activities: "Lead Activities",
  event_attendees: "Event Attendees",
  pa_manager_assignments: "PA Assignments",
};

const OP_STYLES: Record<string, string> = {
  INSERT: "bg-green-50 text-green-700 border-green-200",
  UPDATE: "bg-blue-50 text-blue-700 border-blue-200",
  DELETE: "bg-red-50 text-red-600 border-red-200",
};

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-SG", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date(iso));
}

function actorLabel(entry: AuditEntry) {
  if (entry.actor_name) return entry.actor_name;
  if (entry.source === "service_role") return "System";
  if (entry.source === "dashboard") return "Dashboard";
  return "Unknown";
}

export default function AuditClient() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AuditFilters>({});
  const [restoring, setRestoring] = useState<number | null>(null);
  const [restoreMsg, setRestoreMsg] = useState<{ id: number; type: "success" | "error"; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getAuditEntries(filters);
    if (result.success) {
      setEntries(result.data || []);
    } else {
      setError(result.error || "Failed to load.");
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    const timeout = setTimeout(fetchData, 300);
    return () => clearTimeout(timeout);
  }, [fetchData]);

  async function handleRestore(id: number) {
    if (!confirm("Restore this deleted record?")) return;
    setRestoring(id);
    setRestoreMsg(null);
    const result = await restoreDeletedEntry(id);
    if (result.success) {
      setRestoreMsg({ id, type: "success", text: "Restored" });
      fetchData();
    } else {
      setRestoreMsg({ id, type: "error", text: result.error || "Failed" });
    }
    setRestoring(null);
  }

  const clearFilters = () => setFilters({});
  const hasFilters = !!(filters.tableName || filters.operation || filters.dateFrom || filters.dateTo);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">Audit Log</h1>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <select
            value={filters.tableName || ""}
            onChange={(e) => setFilters((f) => ({ ...f, tableName: e.target.value || undefined }))}
            className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          >
            <option value="">All tables</option>
            {AUDITED_TABLES.map((t) => (
              <option key={t} value={t}>{TABLE_LABELS[t] || t}</option>
            ))}
          </select>

          <select
            value={filters.operation || ""}
            onChange={(e) => setFilters((f) => ({ ...f, operation: e.target.value || undefined }))}
            className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          >
            <option value="">All operations</option>
            <option value="INSERT">Insert</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
          </select>

          <input
            type="date"
            value={filters.dateFrom || ""}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined }))}
            placeholder="From"
            className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.dateTo || ""}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined }))}
              placeholder="To"
              className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
            {hasFilters && (
              <button onClick={clearFilters} className="shrink-0 text-xs text-orange-500 hover:text-orange-600">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-left text-xs font-medium text-stone-400">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Who</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Table</th>
                <th className="px-4 py-3">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-stone-100" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-stone-100" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-14 animate-pulse rounded bg-stone-100" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-stone-100" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-48 animate-pulse rounded bg-stone-100" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-stone-200 py-12 text-center text-sm text-stone-400">
          No audit entries found.
        </div>
      ) : (
        <>
          {/* Desktop: Table */}
          <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left text-xs font-medium text-stone-400">
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Who</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Table</th>
                  <th className="px-4 py-3">Summary</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {entries.map((e) => (
                  <tr key={e.id} className="transition-colors hover:bg-stone-50">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-stone-400">{formatTime(e.created_at)}</td>
                    <td className="px-4 py-3 text-stone-600">
                      <div className="text-xs font-medium">{actorLabel(e)}</div>
                      {e.actor_role && <div className="text-[10px] capitalize text-stone-400">{e.actor_role}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${OP_STYLES[e.operation] || "bg-stone-50 text-stone-500 border-stone-200"}`}>
                        {e.operation}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">{TABLE_LABELS[e.table_name] || e.table_name}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-xs text-stone-600">{e.summary}</td>
                    <td className="px-4 py-3">
                      {e.operation === "DELETE" && (
                        restoreMsg?.id === e.id ? (
                          <span className={`text-xs ${restoreMsg.type === "success" ? "text-green-600" : "text-red-500"}`}>
                            {restoreMsg.text}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRestore(e.id)}
                            disabled={restoring === e.id}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-orange-500 transition-colors hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50"
                          >
                            {restoring === e.id ? "Restoring..." : "Restore"}
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: Cards */}
          <div className="space-y-3 md:hidden">
            {entries.map((e) => (
              <div key={e.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${OP_STYLES[e.operation] || "bg-stone-50 text-stone-500 border-stone-200"}`}>
                      {e.operation}
                    </span>
                    <span className="ml-2 text-xs text-stone-400">{TABLE_LABELS[e.table_name] || e.table_name}</span>
                  </div>
                  <span className="shrink-0 text-[10px] text-stone-300">{formatTime(e.created_at)}</span>
                </div>
                <p className="mt-2 text-sm text-stone-700">{e.summary}</p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs text-stone-400">
                    by {actorLabel(e)}
                    {e.actor_role && <span className="capitalize"> ({e.actor_role})</span>}
                  </p>
                  {e.operation === "DELETE" && (
                    restoreMsg?.id === e.id ? (
                      <span className={`text-xs ${restoreMsg.type === "success" ? "text-green-600" : "text-red-500"}`}>
                        {restoreMsg.text}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRestore(e.id)}
                        disabled={restoring === e.id}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-orange-500 hover:bg-orange-50"
                      >
                        {restoring === e.id ? "Restoring..." : "Restore"}
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
