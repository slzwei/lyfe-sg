"use client";

interface InviteFormFields {
  email: string;
  candidateName: string;
  position: string;
}

interface InlineInviteFormProps {
  showInvite: boolean;
  setShowInvite: (show: boolean) => void;
  inviteForm: InviteFormFields;
  setInviteForm: (form: InviteFormFields) => void;
  sending: boolean;
  message: { type: "success" | "error"; text: string } | null;
  onSubmit: (e: React.FormEvent) => void;
}

export function InlineInviteForm({
  showInvite,
  setShowInvite,
  inviteForm,
  setInviteForm,
  sending,
  message,
  onSubmit,
}: InlineInviteFormProps) {
  return (
    <>
      {showInvite && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
              {sending ? "Sending..." : "Send Invite"}
            </button>
          </form>
        </div>
      )}

      {message && (
        <p className={`rounded-lg px-3 py-2 text-sm ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {message.text}
        </p>
      )}
    </>
  );
}
