"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { onProgress, type CandidateState } from "@/lib/supabase/progress-broadcast";
import { searchCandidates, type SearchResult } from "./actions";
import {
  sendInvite,
  listInvitations,
  getProgressForUser,
  revokeInvitation,
  resetApplication,
  resetQuiz,
  archiveInvitation,
  deleteCandidate,
  getPdfUrl,
  type Invitation,
} from "../actions";

type Tab = "all" | "invited" | "archived";

export default function CandidatesClient({ staffRole }: { staffRole?: string }) {
  const isManagerPlus = staffRole && ["manager", "director", "admin"].includes(staffRole);
  const [tab, setTab] = useState<Tab>("all");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [pipelineCandidates, setPipelineCandidates] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", candidateName: "", position: "" });
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Live progress tracking
  const [live, setLive] = useState(false);
  const [liveStates, setLiveStates] = useState<Record<string, CandidateState>>({});
  const debounceMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [invResult, candResult] = await Promise.all([
      listInvitations(),
      searchCandidates({ query: query || undefined }),
    ]);
    if (invResult.success && invResult.data) setInvitations(invResult.data);
    if (candResult.success && candResult.data) setPipelineCandidates(candResult.data);
    setLoading(false);
  }, [query]);

  useEffect(() => {
    const timeout = setTimeout(fetchData, 300);
    return () => clearTimeout(timeout);
  }, [fetchData]);

  // Targeted refresh: only fetch progress for the candidate that changed
  const refreshUser = useCallback((userId: string) => {
    const existing = debounceMap.current.get(userId);
    if (existing) clearTimeout(existing);
    debounceMap.current.set(userId, setTimeout(async () => {
      debounceMap.current.delete(userId);
      const result = await getProgressForUser(userId);
      if (result.success && result.progress) {
        setInvitations((prev) =>
          prev.map((inv) =>
            inv.user_id === userId ? { ...inv, progress: result.progress! } : inv
          )
        );
      }
    }, 500));
  }, []);

  // Listen for realtime broadcasts from candidate browsers
  useEffect(() => {
    const unsub = onProgress(
      (payload) => {
        if (payload.userId && payload.state) {
          setLiveStates((prev) => ({ ...prev, [payload.userId]: payload.state }));
          if (payload.state === "quiz" || payload.state === "form") {
            refreshUser(payload.userId);
          }
          if (payload.state === "signed-out") {
            setTimeout(() => {
              setLiveStates((prev) => {
                if (prev[payload.userId] !== "signed-out") return prev;
                const next = { ...prev };
                delete next[payload.userId];
                return next;
              });
            }, 60_000);
          }
        }
      },
      (connected) => setLive(connected)
    );
    const goOffline = () => setLive(false);
    const goOnline = () => setLive(true);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      debounceMap.current.forEach((t) => clearTimeout(t));
      debounceMap.current.clear();
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      unsub();
    };
  }, [refreshUser]);

  // Fallback poll every 30s
  useEffect(() => {
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Accepted invitations (with or without candidates record) — shown on "All" tab with progress
  const acceptedInvitations = invitations.filter((inv) => !inv.archived_at && inv.status === "accepted");
  const acceptedCandidateIds = new Set(acceptedInvitations.map((inv) => inv.candidate_record_id).filter(Boolean));
  // Pipeline candidates not already covered by an invitation row
  const pipelineOnly = pipelineCandidates.filter((c) => !acceptedCandidateIds.has(c.id));
  // Invited = not yet signed up (pending/expired/revoked, no candidate_record_id)
  const pendingInvitations = invitations.filter((inv) => !inv.archived_at && inv.status !== "accepted" && !inv.candidate_record_id);
  const archivedInvitations = invitations.filter((inv) => inv.archived_at);

  // Search filter (for invitation tabs — candidates are already server-filtered by query)
  const filteredAccepted = query
    ? acceptedInvitations.filter((inv) =>
        inv.candidate_name?.toLowerCase().includes(query.toLowerCase()) ||
        inv.email.toLowerCase().includes(query.toLowerCase())
      )
    : acceptedInvitations;

  const filteredInvitations = query
    ? pendingInvitations.filter((inv) =>
        inv.candidate_name?.toLowerCase().includes(query.toLowerCase()) ||
        inv.email.toLowerCase().includes(query.toLowerCase())
      )
    : pendingInvitations;

  const filteredArchived = query
    ? archivedInvitations.filter((inv) =>
        inv.candidate_name?.toLowerCase().includes(query.toLowerCase()) ||
        inv.email.toLowerCase().includes(query.toLowerCase())
      )
    : archivedInvitations;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setMessage(null);
    const result = await sendInvite(inviteForm);
    if (result.success) {
      setMessage({ type: "success", text: `Invitation sent to ${inviteForm.email}` });
      setInviteForm({ email: "", candidateName: "", position: "" });
      setShowInvite(false);
      fetchData();
    } else {
      setMessage({ type: "error", text: result.error || "Failed." });
    }
    setSending(false);
  }

  async function handleAction(id: string, action: () => Promise<{ success: boolean }>) {
    setActionLoading(id);
    await action();
    fetchData();
    setActionLoading(null);
  }

  async function handleDownloadPdf(path: string) {
    const result = await getPdfUrl(path);
    if (result.success && result.url) window.open(result.url, "_blank");
  }

  function progressDisplay(inv: Invitation) {
    const isExpired = inv.status === "pending" && new Date(inv.expires_at) < new Date();

    // Non-accepted: simple pill badge
    if (isExpired || inv.status === "revoked" || inv.status === "pending") {
      const status = isExpired ? "expired" : inv.status;
      const styles: Record<string, string> = {
        pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
        expired: "bg-stone-50 text-stone-500 border-stone-200",
        revoked: "bg-red-50 text-red-600 border-red-200",
      };
      return (
        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
          {status}
        </span>
      );
    }

    // Accepted: smooth progress bar
    const progress = inv.progress;
    const quizInProgress = progress && progress.quiz_answered > 0 && !progress.quiz_completed;
    let pct = 0;
    let label = "Starting";
    let detail = "";
    let barColor = "bg-stone-300";
    let textColor = "text-stone-500";
    const liveState = inv.user_id ? liveStates[inv.user_id] : undefined;

    if (liveState === "signed-out" && progress?.quiz_completed) {
      pct = 100; label = "Signed out"; barColor = "bg-stone-400"; textColor = "text-stone-500";
    } else if (liveState === "viewing-results" && progress?.quiz_completed) {
      pct = 100; label = "Viewing results"; barColor = "bg-green-500"; textColor = "text-green-700";
    } else if (progress?.quiz_completed) {
      pct = 100; label = "Completed"; barColor = "bg-green-500"; textColor = "text-green-700";
    } else if (progress?.profile_completed && quizInProgress) {
      pct = 50 + Math.round((progress.quiz_answered / 39) * 50);
      label = "Quiz"; detail = `${progress.quiz_answered}/39`;
      barColor = "bg-blue-500"; textColor = "text-blue-700";
    } else if (progress?.profile_completed) {
      pct = 50; label = "Form done"; detail = "Quiz not started";
      barColor = "bg-orange-500"; textColor = "text-orange-700";
    } else if (progress) {
      const s = progress.onboarding_step || 1;
      pct = Math.round((s / 6) * 50);
      label = "Form"; detail = `${s}/6`;
      barColor = "bg-orange-400"; textColor = "text-stone-600";
    }

    const discType = progress?.disc_type?.toUpperCase();

    return (
      <div className="w-28">
        <div className="mb-1 flex items-baseline justify-between">
          <span className={`text-xs font-medium ${textColor}`}>{label}</span>
          <span className="text-[10px] text-stone-400">{detail}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {discType && (
          <p className="mt-1 flex items-center gap-1 text-[10px] text-stone-400">
            DISC: <span className="font-semibold text-stone-600">{discType}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search + invite button */}
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search candidates…"
          className="h-10 flex-1 rounded-xl border border-stone-200 bg-white px-4 text-base outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="h-10 shrink-0 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          {showInvite ? "Cancel" : "Invite Candidate"}
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-stone-500">Email *</label>
              <input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="candidate@email.com" required
                className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-base outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-stone-500">Name</label>
              <input type="text" value={inviteForm.candidateName} onChange={(e) => setInviteForm({ ...inviteForm, candidateName: e.target.value })}
                placeholder="Full name"
                className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-base outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-stone-500">Position</label>
              <input type="text" value={inviteForm.position} onChange={(e) => setInviteForm({ ...inviteForm, position: e.target.value })}
                placeholder="e.g. Financial Consultant"
                className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-base outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
            </div>
            <button type="submit" disabled={sending || !inviteForm.email}
              className="h-10 shrink-0 rounded-lg bg-orange-500 px-5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50">
              {sending ? "Sending…" : "Send Invite"}
            </button>
          </form>
        </div>
      )}

      {message && (
        <p className={`rounded-lg px-3 py-2 text-sm ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {message.text}
        </p>
      )}

      {/* Tabs + live indicator */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-stone-200">
        {([["all", "All"], ["invited", "Invited"], ["archived", "Archived"]] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
              tab === key ? "border-b-2 border-orange-500 text-orange-600" : "text-stone-400 hover:text-stone-600"
            }`}
          >
            {label}
          </button>
        ))}
        {live && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-green-600">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        )}
      </div>

      {loading ? (
        <>
          {/* Desktop loading skeleton */}
          <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left text-xs font-medium text-stone-400">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="h-4 w-28 animate-pulse rounded bg-stone-100" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-40 animate-pulse rounded bg-stone-100" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-stone-100" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-stone-100" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-stone-100" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-12 animate-pulse rounded bg-stone-100" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile loading skeleton */}
          <div className="space-y-3 md:hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="mb-2 h-4 w-32 animate-pulse rounded bg-stone-100" />
                <div className="mb-1 h-3 w-48 animate-pulse rounded bg-stone-100" />
                <div className="h-3 w-24 animate-pulse rounded bg-stone-100" />
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Desktop: Table */}
          <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left text-xs font-medium text-stone-400">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {tab === "all" && filteredAccepted.map((inv) => renderInvitationRow(inv))}
                {tab === "all" && pipelineOnly.map((c) => renderCandidateRow(c))}
                {tab === "invited" && filteredInvitations.map((inv) => renderInvitationRow(inv))}
                {tab === "archived" && filteredArchived.map((inv) => renderInvitationRow(inv))}

                {((tab === "all" && pipelineOnly.length === 0 && filteredAccepted.length === 0) ||
                  (tab === "invited" && filteredInvitations.length === 0) ||
                  (tab === "archived" && filteredArchived.length === 0)) && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-stone-400">No candidates found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Mobile: Cards */}
          <div className="space-y-3 md:hidden">
            {tab === "all" && filteredAccepted.map((inv) => renderInvitationCard(inv))}
            {tab === "all" && pipelineOnly.map((c) => renderCandidateCard(c))}
            {tab === "invited" && filteredInvitations.map((inv) => renderInvitationCard(inv))}
            {tab === "archived" && filteredArchived.map((inv) => renderInvitationCard(inv))}

            {((tab === "all" && pipelineOnly.length === 0 && filteredAccepted.length === 0) ||
              (tab === "invited" && filteredInvitations.length === 0) ||
              (tab === "archived" && filteredArchived.length === 0)) && (
              <p className="py-12 text-center text-sm text-stone-400">No candidates found.</p>
            )}
          </div>
        </>
      )}
    </div>
  );

  function renderCandidateCard(c: SearchResult) {
    return (
      <div key={c.id} className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link href={`/staff/candidates/${c.id}`} className="font-medium text-orange-600 hover:underline">
              {c.name || "—"}
            </Link>
            <p className="mt-0.5 truncate text-xs text-stone-400">{c.email || "—"}</p>
          </div>
          <div className="shrink-0">
            <span className="text-xs font-medium capitalize text-stone-600">{c.status}</span>
            {c.disc_type && (
              <span className="ml-1.5 rounded bg-purple-50 px-1 py-0.5 text-[10px] font-semibold text-purple-600">{c.disc_type}</span>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-stone-400">
          {c.position_applied || "—"} &middot; {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
        </p>
      </div>
    );
  }

  function renderInvitationCard(inv: Invitation) {
    const isLoading = actionLoading === inv.id;
    const isExpired = inv.status === "pending" && new Date(inv.expires_at) < new Date();

    return (
      <div key={inv.id} className={`rounded-xl border border-stone-200 bg-white p-4 ${isLoading ? "opacity-50" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              {inv.candidate_record_id ? (
                <Link href={`/staff/candidates/${inv.candidate_record_id}`} className="font-medium text-orange-600 hover:underline">
                  {inv.candidate_name || "—"}
                </Link>
              ) : (
                <span className="font-medium text-stone-800">{inv.candidate_name || "—"}</span>
              )}
              {inv.profile_pdf_path && (
                <button onClick={() => handleDownloadPdf(inv.profile_pdf_path!)} title="Application PDF"
                  className="text-stone-300 hover:text-orange-500">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </button>
              )}
              {inv.disc_pdf_path && (
                <button onClick={() => handleDownloadPdf(inv.disc_pdf_path!)} title="DISC PDF"
                  className="text-stone-300 hover:text-purple-500">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </button>
              )}
            </span>
            <p className="mt-0.5 truncate text-xs text-stone-400">{inv.email}</p>
          </div>
          <div className="shrink-0">{progressDisplay(inv)}</div>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-stone-400">
            {inv.position_applied || "—"} &middot; {new Date(inv.created_at).toLocaleDateString()}
            {inv.invited_by && inv.invited_by !== "staff" && (
              <span className="text-stone-300"> &middot; by {inv.invited_by}</span>
            )}
          </p>
          <div className="flex items-center gap-1">
            {isManagerPlus && !inv.archived_at && (inv.status === "pending" && !isExpired || inv.status === "accepted") && (
              <button onClick={() => handleAction(inv.id, () => revokeInvitation(inv.id))} disabled={isLoading}
                title="Revoke" className="rounded p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              </button>
            )}
            {isManagerPlus && !inv.archived_at && inv.progress?.quiz_completed && (
              <button onClick={() => handleAction(inv.id, () => archiveInvitation(inv.id))} disabled={isLoading}
                title="Archive" className="rounded p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 disabled:opacity-50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8 4-8-4m16 0v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7m16 0l-8-4-8 4" /></svg>
              </button>
            )}
            {staffRole === "admin" && (
              <button onClick={() => handleAction(inv.id, () => deleteCandidate(inv.id))} disabled={isLoading}
                title="Delete" className="rounded p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderCandidateRow(c: SearchResult) {
    return (
      <tr key={c.id} className="transition-colors hover:bg-stone-50">
        <td className="px-4 py-3">
          <Link href={`/staff/candidates/${c.id}`} className="font-medium text-orange-600 hover:text-orange-700 hover:underline">
            {c.name || "—"}
          </Link>
        </td>
        <td className="px-4 py-3 text-stone-500">{c.email || "—"}</td>
        <td className="px-4 py-3 text-stone-500">{c.position_applied || "—"}</td>
        <td className="px-4 py-3">
          <span className="text-xs font-medium capitalize text-stone-600">{c.status}</span>
          {c.disc_type && (
            <span className="ml-1.5 rounded bg-purple-50 px-1 py-0.5 text-[10px] font-semibold text-purple-600">{c.disc_type}</span>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-stone-400">
          {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
        </td>
        <td className="px-4 py-3" />
      </tr>
    );
  }

  function renderInvitationRow(inv: Invitation) {
    const isLoading = actionLoading === inv.id;
    const isExpired = inv.status === "pending" && new Date(inv.expires_at) < new Date();

    return (
      <tr key={inv.id} className={`transition-colors hover:bg-stone-50 ${isLoading ? "opacity-50" : ""}`}>
        <td className="px-4 py-3">
          <span className="flex items-center gap-1.5">
            {inv.candidate_record_id ? (
              <Link href={`/staff/candidates/${inv.candidate_record_id}`} className="font-medium text-orange-600 hover:text-orange-700 hover:underline">
                {inv.candidate_name || "—"}
              </Link>
            ) : (
              <span className="font-medium text-stone-800">{inv.candidate_name || "—"}</span>
            )}
            {inv.profile_pdf_path && (
              <button onClick={() => handleDownloadPdf(inv.profile_pdf_path!)} title="Application PDF"
                className="text-stone-300 hover:text-orange-500">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </button>
            )}
            {inv.disc_pdf_path && (
              <button onClick={() => handleDownloadPdf(inv.disc_pdf_path!)} title="DISC PDF"
                className="text-stone-300 hover:text-purple-500">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </button>
            )}
          </span>
        </td>
        <td className="px-4 py-3 text-stone-500">{inv.email}</td>
        <td className="px-4 py-3 text-stone-500">{inv.position_applied || "—"}</td>
        <td className="px-4 py-3">
          {progressDisplay(inv)}
        </td>
        <td className="px-4 py-3 text-xs text-stone-400">
          <div>{new Date(inv.created_at).toLocaleDateString()}</div>
          {inv.invited_by && inv.invited_by !== "staff" && (
            <div className="text-[10px] text-stone-300">by {inv.invited_by}</div>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            {isManagerPlus && !inv.archived_at && (inv.status === "pending" && !isExpired || inv.status === "accepted") && (
              <button onClick={() => handleAction(inv.id, () => revokeInvitation(inv.id))} disabled={isLoading}
                title="Revoke" className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              </button>
            )}
            {isManagerPlus && !inv.archived_at && inv.progress?.quiz_completed && (
              <button onClick={() => handleAction(inv.id, () => archiveInvitation(inv.id))} disabled={isLoading}
                title="Archive" className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 disabled:opacity-50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8 4-8-4m16 0v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7m16 0l-8-4-8 4" /></svg>
              </button>
            )}
            {staffRole === "admin" && (
              <button onClick={() => handleAction(inv.id, () => deleteCandidate(inv.id))} disabled={isLoading}
                title="Delete" className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }
}
