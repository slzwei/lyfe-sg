"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listStaff,
  inviteStaff,
  updateStaffRole,
  deactivateStaff,
  reactivateStaff,
  resetStaffPassword,
} from "./actions";

const ROLE_OPTIONS = ["agent", "manager", "director", "admin"] as const;

interface StaffMember {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  is_active: boolean | null;
  last_login_at: string | null;
  created_at: string | null;
}

export default function TeamClient() {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Invite form
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<string>("agent");
  const [inviting, setInviting] = useState(false);

  const fetchStaff = useCallback(async () => {
    const result = await listStaff();
    if (result.success && result.data) {
      setMembers(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setMessage(null);

    const result = await inviteStaff({ email, fullName, role });
    if (result.success) {
      setMessage({ type: "success", text: `Invited ${fullName} as ${role}. Welcome email sent.` });
      setEmail("");
      setFullName("");
      setRole("staff");
      fetchStaff();
    } else {
      setMessage({ type: "error", text: result.error || "Failed to invite." });
    }
    setInviting(false);
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setActionLoading(userId);
    const result = await updateStaffRole(userId, newRole);
    if (!result.success) {
      setMessage({ type: "error", text: result.error || "Failed to update role." });
    }
    await fetchStaff();
    setActionLoading(null);
  }

  async function handleToggleActive(member: StaffMember) {
    setActionLoading(member.id);
    const result = member.is_active
      ? await deactivateStaff(member.id)
      : await reactivateStaff(member.id);

    if (!result.success) {
      setMessage({ type: "error", text: result.error || "Failed to update status." });
    }
    await fetchStaff();
    setActionLoading(null);
  }

  async function handleResetPassword(userId: string) {
    setActionLoading(userId);
    const result = await resetStaffPassword(userId);
    if (result.success) {
      setMessage({ type: "success", text: "Password reset email sent." });
    } else {
      setMessage({ type: "error", text: result.error || "Failed to send reset email." });
    }
    setActionLoading(null);
  }

  return (
    <div className="space-y-8">
      {/* Invite Form */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-stone-800">Invite Staff Member</h2>
        <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-stone-500">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              required
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-stone-500">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@lyfe.sg"
              className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              required
            />
          </div>
          <div className="w-32">
            <label className="mb-1 block text-xs font-medium text-stone-500">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={inviting || !email || !fullName}
            className="h-10 shrink-0 rounded-lg bg-orange-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
          >
            {inviting ? "Inviting…" : "Invite"}
          </button>
        </form>

        {message && (
          <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
          }`}>
            {message.text}
          </p>
        )}
      </div>

      {/* Staff List */}
      <div className="rounded-2xl border border-stone-200 bg-white">
        <div className="border-b border-stone-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-stone-800">
            Team Members {!loading && <span className="text-sm font-normal text-stone-400">({members.length})</span>}
          </h2>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-stone-400">Loading…</div>
        ) : members.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-stone-400">No staff members yet.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-stone-800 truncate">{m.full_name}</span>
                    {!m.is_active && (
                      <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-500">Inactive</span>
                    )}
                  </div>
                  <div className="text-sm text-stone-400 truncate">{m.email}</div>
                  {m.last_login_at && (
                    <div className="text-xs text-stone-300">
                      Last login: {new Date(m.last_login_at).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Role selector */}
                <select
                  value={m.role}
                  onChange={(e) => handleRoleChange(m.id, e.target.value)}
                  disabled={actionLoading === m.id}
                  className="h-8 rounded-md border border-stone-200 bg-stone-50 px-2 text-xs outline-none focus:border-orange-400"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleResetPassword(m.id)}
                    disabled={actionLoading === m.id}
                    className="rounded px-2 py-1 text-xs text-stone-400 hover:bg-stone-100 hover:text-stone-600 disabled:opacity-50"
                    title="Send password reset email"
                  >
                    Reset pw
                  </button>
                  <button
                    onClick={() => handleToggleActive(m)}
                    disabled={actionLoading === m.id}
                    className={`rounded px-2 py-1 text-xs disabled:opacity-50 ${
                      m.is_active
                        ? "text-red-400 hover:bg-red-50 hover:text-red-600"
                        : "text-green-500 hover:bg-green-50 hover:text-green-700"
                    }`}
                  >
                    {m.is_active ? "Deactivate" : "Reactivate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
