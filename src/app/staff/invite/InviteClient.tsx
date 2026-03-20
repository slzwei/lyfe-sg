"use client";

import { useState, useEffect, useCallback } from "react";
import {
  sendInvite,
  listInvitations,
  revokeInvitation,
  resetApplication,
  resetQuiz,
  archiveInvitation,
  deleteCandidate,
  type Invitation,
} from "../actions";

export default function InviteClient() {
  const [email, setEmail] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [position, setPosition] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [pastOpen, setPastOpen] = useState(false);

  const fetchInvitations = useCallback(async () => {
    const result = await listInvitations();
    if (result.success && result.data) {
      setInvitations(result.data);
    }
    setLoadingList(false);
    setLastRefreshed(new Date());
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  // Auto-poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchInvitations, 30_000);
    return () => clearInterval(interval);
  }, [fetchInvitations]);

  const active = invitations.filter((inv) => !inv.archived_at);
  const archived = invitations.filter((inv) => inv.archived_at);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchInvitations();
    setRefreshing(false);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setMessage(null);

    const result = await sendInvite({
      email,
      candidateName: candidateName || undefined,
      position: position || undefined,
    });

    if (result.success) {
      setMessage({ type: "success", text: `Invitation sent to ${email}` });
      setEmail("");
      setCandidateName("");
      setPosition("");
      fetchInvitations();
    } else {
      setMessage({ type: "error", text: result.error || "Failed to send." });
    }
    setSending(false);
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this invitation? The candidate will no longer be able to use it.")) return;
    setActionLoading(id);
    const result = await revokeInvitation(id);
    if (result.success) fetchInvitations();
    setActionLoading(null);
  }

  async function handleResetApp(id: string) {
    if (!confirm("Reset this candidate's application? Their form will be marked incomplete and quiz data will be cleared. They will need to re-submit.")) return;
    setActionLoading(id);
    const result = await resetApplication(id);
    if (result.success) fetchInvitations();
    setActionLoading(null);
  }

  async function handleResetQuiz(id: string) {
    if (!confirm("Reset this candidate's quiz? They will need to retake the DISC personality test.")) return;
    setActionLoading(id);
    const result = await resetQuiz(id);
    if (result.success) fetchInvitations();
    setActionLoading(null);
  }

  async function handleArchive(id: string) {
    if (!confirm("Archive this candidate? They will be moved to Past Candidates.")) return;
    setActionLoading(id);
    const result = await archiveInvitation(id);
    if (result.success) fetchInvitations();
    setActionLoading(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this candidate? This will remove their invitation, application, quiz data, and account. This cannot be undone.")) return;
    setActionLoading(id);
    const result = await deleteCandidate(id);
    if (result.success) fetchInvitations();
    setActionLoading(null);
  }

  function handleCopyLink(inv: Invitation) {
    const link = `${window.location.origin}/candidate/login?token=${inv.token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function progressDisplay(inv: Invitation) {
    const isExpired =
      inv.status === "pending" && new Date(inv.expires_at) < new Date();

    // Non-accepted: simple pill badge
    if (isExpired || inv.status === "revoked" || inv.status === "pending") {
      const status = isExpired ? "expired" : inv.status;
      const styles: Record<string, string> = {
        pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
        expired: "bg-stone-50 text-stone-500 border-stone-200",
        revoked: "bg-red-50 text-red-600 border-red-200",
      };
      return (
        <span
          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
        >
          {status}
        </span>
      );
    }

    // Accepted: pill bar showing progress
    const progress = inv.progress;
    const quizInProgress =
      progress && progress.quiz_answered > 0 && !progress.quiz_completed;
    const stepLabels = ["Personal", "NS & Emergency", "Education", "Skills", "Employment", "Declaration"];

    type PillStatus = "done" | "active" | "pending";
    let pillLabel: string;
    let pillStyle: string;
    let subLabel = "";

    if (progress?.quiz_completed) {
      pillLabel = `Completed`;
      pillStyle = "bg-green-50 text-green-700 border-green-200";
      subLabel = `DISC: ${progress.disc_type?.toUpperCase()}`;
    } else if (progress?.profile_completed && quizInProgress) {
      pillLabel = `Quiz`;
      pillStyle = "bg-blue-50 text-blue-700 border-blue-200";
      subLabel = `${progress.quiz_answered}/39`;
    } else if (progress?.profile_completed) {
      pillLabel = "Submitted";
      pillStyle = "bg-orange-50 text-orange-700 border-orange-200";
    } else if (progress) {
      const s = progress.onboarding_step || 1;
      pillLabel = stepLabels[s - 1];
      pillStyle = "bg-stone-50 text-stone-600 border-stone-200";
      subLabel = `${s}/6`;
    } else {
      pillLabel = "Starting";
      pillStyle = "bg-stone-50 text-stone-500 border-stone-200";
    }

    // Determine segment statuses for the pill bar
    let segments: PillStatus[];
    if (progress?.quiz_completed) {
      segments = ["done", "done", "done"];
    } else if (progress?.profile_completed && quizInProgress) {
      segments = ["done", "done", "active"];
    } else if (progress?.profile_completed) {
      segments = ["done", "done", "pending"];
    } else if (progress) {
      segments = ["done", "active", "pending"];
    } else {
      segments = ["active", "pending", "pending"];
    }

    const segmentStyles: Record<PillStatus, string> = {
      done: "bg-green-400",
      active: "bg-orange-400",
      pending: "bg-stone-200",
    };

    return (
      <div className="flex flex-col gap-1">
        {/* Mini bar segments */}
        <div className="flex gap-0.5">
          {segments.map((s, i) => (
            <div key={i} className={`h-1.5 w-3 first:rounded-l-full last:rounded-r-full ${segmentStyles[s]}`} />
          ))}
        </div>
        {/* Pill label */}
        <div className="flex items-center gap-1.5">
          <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${pillStyle}`}>
            {pillLabel}
          </span>
          {subLabel && (
            <span className="text-[10px] text-stone-400">{subLabel}</span>
          )}
        </div>
      </div>
    );
  }

  function renderRow(inv: Invitation, showArchive: boolean) {
    const isExpired =
      inv.status === "pending" &&
      new Date(inv.expires_at) < new Date();
    const isAccepted = inv.status === "accepted";
    const isLoading = actionLoading === inv.id;

    return (
      <tr
        key={inv.id}
        className={`text-stone-600 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <td className="py-2.5 pr-4 font-medium text-stone-800">
          {inv.candidate_name || "\u2014"}
        </td>
        <td className="py-2.5 pr-4">{inv.email}</td>
        <td className="py-2.5 pr-4">
          {inv.position_applied || "\u2014"}
        </td>
        <td className="py-2.5 pr-4">{progressDisplay(inv)}</td>
        <td className="py-2.5 pr-4 text-stone-400">
          {new Date(inv.created_at).toLocaleDateString()}
        </td>
        <td className="py-2.5">
          <div className="flex items-center gap-1.5">
            {inv.status === "pending" && !isExpired && (
              <button
                onClick={() => handleCopyLink(inv)}
                title={copiedId === inv.id ? "Copied!" : "Copy invite link"}
                className="rounded p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
              >
                {copiedId === inv.id ? (
                  <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                )}
              </button>
            )}
            {((inv.status === "pending" && !isExpired) || isAccepted) && (
              <button
                onClick={() => handleRevoke(inv.id)}
                disabled={isLoading}
                title="Revoke invitation"
                className="rounded p-1 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              </button>
            )}
            {isAccepted && inv.progress?.quiz_completed && (
              <button
                onClick={() => handleResetQuiz(inv.id)}
                disabled={isLoading}
                title="Reset quiz"
                className="rounded p-1 text-stone-400 transition-colors hover:bg-blue-50 hover:text-blue-500 disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
            )}
            {isAccepted && inv.progress?.profile_completed && (
              <button
                onClick={() => handleResetApp(inv.id)}
                disabled={isLoading}
                title="Reopen application form"
                className="rounded p-1 text-stone-400 transition-colors hover:bg-orange-50 hover:text-orange-500 disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
            )}
            {showArchive && !inv.archived_at && (inv.status === "revoked" || isExpired || (isAccepted && inv.progress?.quiz_completed)) && (
              <button
                onClick={() => handleArchive(inv.id)}
                disabled={isLoading}
                title="Archive candidate"
                className="rounded p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8 4-8-4m16 0v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7m16 0l-8-4-8 4" /></svg>
              </button>
            )}
            <button
              onClick={() => handleDelete(inv.id)}
              disabled={isLoading}
              title="Permanently delete candidate"
              className="rounded p-1 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </td>
      </tr>
    );
  }

  const tableHead = (
    <thead>
      <tr className="border-b border-stone-100 text-left text-xs font-medium uppercase tracking-wider text-stone-400">
        <th className="pb-2 pr-4">Name</th>
        <th className="pb-2 pr-4">Email</th>
        <th className="pb-2 pr-4">Position</th>
        <th className="pb-2 pr-4">Progress</th>
        <th className="pb-2 pr-4">Sent</th>
        <th className="pb-2">Actions</th>
      </tr>
    </thead>
  );

  return (
    <div className="space-y-8">
      {/* Send Invitation Form */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-stone-800">
          Send Invitation
        </h2>
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-stone-700"
            >
              Email <span className="text-red-400">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="candidate@example.com"
              required
              className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-stone-700"
              >
                Candidate Name
              </label>
              <input
                id="name"
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="John Tan"
                className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label
                htmlFor="position"
                className="mb-1.5 block text-sm font-medium text-stone-700"
              >
                Position
              </label>
              <input
                id="position"
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Sales Executive"
                className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>

          {message && (
            <p
              className={`rounded-lg px-3 py-2 text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={sending || !email}
            className="h-10 rounded-xl bg-orange-500 px-6 font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send Invitation"}
          </button>
        </form>
      </div>

      {/* Candidate List */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-800">
            Candidate List
          </h2>
          <div className="flex items-center gap-2">
            {lastRefreshed && (
              <span className="text-xs text-stone-400">
                Updated {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh"
              className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 disabled:opacity-50"
            >
              <svg
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {loadingList ? (
          <p className="text-sm text-stone-400">Loading...</p>
        ) : invitations.length === 0 ? (
          <p className="text-sm text-stone-400">No candidates yet.</p>
        ) : (
          <div className="space-y-6">
            {/* Active Candidates */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                Active Candidates
              </h3>
              {active.length === 0 ? (
                <p className="text-sm text-stone-400">No active candidates.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    {tableHead}
                    <tbody className="divide-y divide-stone-50">
                      {active.map((inv) => renderRow(inv, true))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Past Candidates (archived) */}
            {archived.length > 0 && (
              <div className="border-t border-stone-100 pt-4">
                <button
                  type="button"
                  onClick={() => setPastOpen(!pastOpen)}
                  className="flex w-full items-center gap-2 text-left text-xs font-semibold uppercase tracking-wider text-stone-400 transition-colors hover:text-stone-600"
                >
                  <svg
                    className={`h-3.5 w-3.5 transition-transform ${pastOpen ? "rotate-90" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  Past Candidates ({archived.length})
                </button>
                {pastOpen && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-sm">
                      {tableHead}
                      <tbody className="divide-y divide-stone-50">
                        {archived.map((inv) => renderRow(inv, false))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
