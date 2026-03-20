"use client";

import { useState, useEffect, useCallback } from "react";
import {
  sendInvite,
  listInvitations,
  revokeInvitation,
  resetApplication,
  resetQuiz,
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

  const fetchInvitations = useCallback(async () => {
    const result = await listInvitations();
    if (result.success && result.data) {
      setInvitations(result.data);
    }
    setLoadingList(false);
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

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

  function handleCopyLink(inv: Invitation) {
    const link = `${window.location.origin}/candidate/login?token=${inv.token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function progressDisplay(inv: Invitation) {
    const isExpired =
      inv.status === "pending" && new Date(inv.expires_at) < new Date();

    // Non-accepted: simple badge
    if (isExpired || inv.status === "revoked" || inv.status === "pending") {
      const status = isExpired ? "expired" : inv.status;
      const styles: Record<string, string> = {
        pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
        expired: "bg-stone-50 text-stone-500 border-stone-200",
        revoked: "bg-red-50 text-red-600 border-red-200",
      };
      return (
        <span
          className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status]}`}
        >
          {status}
        </span>
      );
    }

    // Accepted: show progress bar + label
    const progress = inv.progress;
    let step = 1;
    let label = "Filling application";
    const quizInProgress =
      progress && progress.quiz_answered > 0 && !progress.quiz_completed;

    if (progress) {
      if (progress.quiz_completed) {
        step = 3;
        label = `Completed · ${progress.disc_type}`;
      } else if (progress.profile_completed) {
        step = 2;
        label = quizInProgress
          ? `Taking quiz (${progress.quiz_answered}/38)`
          : "Application submitted";
      }
    }

    return (
      <div className="flex flex-col gap-1">
        <div className="flex gap-0.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 w-5 rounded-full ${
                s <= step
                  ? "bg-green-400"
                  : s === 3 && quizInProgress
                  ? "bg-blue-400"
                  : "bg-stone-200"
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-stone-600">{label}</span>
      </div>
    );
  }

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

      {/* Invitation List */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-stone-800">
          Recent Invitations
        </h2>

        {loadingList ? (
          <p className="text-sm text-stone-400">Loading...</p>
        ) : invitations.length === 0 ? (
          <p className="text-sm text-stone-400">No invitations sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
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
              <tbody className="divide-y divide-stone-50">
                {invitations.map((inv) => {
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
                          {inv.status === "pending" && !isExpired && (
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
