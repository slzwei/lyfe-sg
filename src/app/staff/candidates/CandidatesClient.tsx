"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { searchCandidates, type SearchResult } from "./actions";
import {
  sendInvite,
  listInvitations,
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

  // Accepted without a job = signed up but no candidates record (show on "All" tab)
  const acceptedWithoutRecord = invitations.filter((inv) => !inv.archived_at && inv.status === "accepted" && !inv.candidate_record_id);
  // Invited = not yet signed up (pending/expired/revoked, no candidate_record_id)
  const pendingInvitations = invitations.filter((inv) => !inv.archived_at && inv.status !== "accepted" && !inv.candidate_record_id);
  const archivedInvitations = invitations.filter((inv) => inv.archived_at);

  // Search filter (for invitation tabs — candidates are already server-filtered by query)
  const filteredAccepted = query
    ? acceptedWithoutRecord.filter((inv) =>
        inv.candidate_name?.toLowerCase().includes(query.toLowerCase()) ||
        inv.email.toLowerCase().includes(query.toLowerCase())
      )
    : acceptedWithoutRecord;

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

  function progressLabel(inv: Invitation) {
    if (!inv.progress) {
      const isExpired = inv.status === "pending" && new Date(inv.expires_at) < new Date();
      if (isExpired) return { text: "Expired", color: "text-stone-400" };
      if (inv.status === "revoked") return { text: "Revoked", color: "text-red-500" };
      return { text: "Pending", color: "text-yellow-600" };
    }
    if (inv.progress.quiz_completed) return { text: `Done — ${inv.progress.disc_type || "DISC"}`, color: "text-green-600" };
    if (inv.progress.profile_completed) return { text: "Quiz in progress", color: "text-orange-500" };
    return { text: `Form ${inv.progress.onboarding_step}/6`, color: "text-stone-500" };
  }

  return (
    <div className="space-y-4">
      {/* Header with search + invite button */}
      <div className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search candidates…"
          className="h-10 flex-1 rounded-xl border border-stone-200 bg-white px-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
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
                className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-stone-500">Name</label>
              <input type="text" value={inviteForm.candidateName} onChange={(e) => setInviteForm({ ...inviteForm, candidateName: e.target.value })}
                placeholder="Full name"
                className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-stone-500">Position</label>
              <input type="text" value={inviteForm.position} onChange={(e) => setInviteForm({ ...inviteForm, position: e.target.value })}
                placeholder="e.g. Financial Consultant"
                className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
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

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200">
        {([["all", "All Candidates"], ["invited", "Invited"], ["archived", "Archived"]] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === key ? "border-b-2 border-orange-500 text-orange-600" : "text-stone-400 hover:text-stone-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-left text-xs font-medium text-stone-400">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Status</th>
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
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-left text-xs font-medium text-stone-400">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {tab === "all" && pipelineCandidates.map((c) => renderCandidateRow(c))}
              {tab === "all" && filteredAccepted.map((inv) => renderInvitationRow(inv))}
              {tab === "invited" && filteredInvitations.map((inv) => renderInvitationRow(inv))}
              {tab === "archived" && filteredArchived.map((inv) => renderInvitationRow(inv))}

              {((tab === "all" && pipelineCandidates.length === 0 && filteredAccepted.length === 0) ||
                (tab === "invited" && filteredInvitations.length === 0) ||
                (tab === "archived" && filteredArchived.length === 0)) && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-stone-400">No candidates found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

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
    const progress = progressLabel(inv);
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
          <span className={`text-xs font-medium ${progress.color}`}>{progress.text}</span>
          {inv.progress?.disc_type && (
            <span className="ml-1.5 rounded bg-purple-50 px-1 py-0.5 text-[10px] font-semibold text-purple-600">{inv.progress.disc_type}</span>
          )}
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
