"use client";

import { useState, useEffect, useCallback } from "react";
import {
  sendInvite,
  listInvitations,
  revokeInvitation,
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
    const result = await revokeInvitation(id);
    if (result.success) {
      fetchInvitations();
    }
  }

  function statusBadge(inv: Invitation) {
    const isExpired =
      inv.status === "pending" && new Date(inv.expires_at) < new Date();
    const status = isExpired ? "expired" : inv.status;

    const styles: Record<string, string> = {
      pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
      accepted: "bg-green-50 text-green-700 border-green-200",
      expired: "bg-stone-50 text-stone-500 border-stone-200",
      revoked: "bg-red-50 text-red-600 border-red-200",
    };

    return (
      <span
        className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status] || styles.pending}`}
      >
        {status}
      </span>
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
            {sending ? "Sending…" : "Send Invitation"}
          </button>
        </form>
      </div>

      {/* Invitation List */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-stone-800">
          Recent Invitations
        </h2>

        {loadingList ? (
          <p className="text-sm text-stone-400">Loading…</p>
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
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Sent</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {invitations.map((inv) => {
                  const isExpired =
                    inv.status === "pending" &&
                    new Date(inv.expires_at) < new Date();
                  return (
                    <tr key={inv.id} className="text-stone-600">
                      <td className="py-2.5 pr-4 font-medium text-stone-800">
                        {inv.candidate_name || "—"}
                      </td>
                      <td className="py-2.5 pr-4">{inv.email}</td>
                      <td className="py-2.5 pr-4">
                        {inv.position_applied || "—"}
                      </td>
                      <td className="py-2.5 pr-4">{statusBadge(inv)}</td>
                      <td className="py-2.5 pr-4 text-stone-400">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5">
                        {inv.status === "pending" && !isExpired && (
                          <button
                            onClick={() => handleRevoke(inv.id)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Revoke
                          </button>
                        )}
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
