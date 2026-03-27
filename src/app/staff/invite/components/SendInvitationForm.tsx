"use client";

import type { UseInviteFormReturn } from "../hooks/useInviteForm";
import type { AssignableManager } from "../../candidates/actions";

const DOCUMENT_LABELS = [
  "Resume", "RES5", "M5", "M9", "M9A", "HI", "M8", "M8A", "ComGI", "BCP", "PGI", "Other",
] as const;

interface SendInvitationFormProps extends UseInviteFormReturn {
  assignableManagers: AssignableManager[];
  staffRole: string;
}

export function SendInvitationForm({
  email,
  setEmail,
  candidateName,
  setCandidateName,
  position,
  setPosition,
  sending,
  message,
  lastInvitationId,
  setLastInvitationId,
  attachedFiles,
  setAttachedFiles,
  uploading,
  uploadLabel,
  setUploadLabel,
  fileInputRef,
  selectedManagerId,
  setSelectedManagerId,
  handleSend,
  handleUploadFile,
  handleRemoveFile,
  handleDownloadInviteFile,
  assignableManagers,
  staffRole,
}: SendInvitationFormProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
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
            className="h-11 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-base outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100 sm:h-10"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              className="h-11 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-base outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100 sm:h-10"
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
              className="h-11 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-base outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100 sm:h-10"
            />
          </div>
        </div>

        {/* Manager assignment picker -- required for PAs, optional for managers+ */}
        {assignableManagers.length > 0 && (
          <div>
            <label
              htmlFor="assignManager"
              className="mb-1.5 block text-sm font-medium text-stone-700"
            >
              Assign to Manager{staffRole === "pa" && <span className="text-red-400"> *</span>}
            </label>
            <select
              id="assignManager"
              value={selectedManagerId}
              onChange={(e) => setSelectedManagerId(e.target.value)}
              required={staffRole === "pa"}
              className="h-11 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-base outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100 sm:h-10"
            >
              <option value="">{staffRole === "pa" ? "Select a manager..." : "Myself (default)"}</option>
              {assignableManagers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.role})
                </option>
              ))}
            </select>
          </div>
        )}

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
          disabled={sending || !email || (staffRole === "pa" && !selectedManagerId)}
          className="h-11 w-full rounded-xl bg-orange-500 px-6 font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-auto"
        >
          {sending ? "Sending..." : "Send Invitation"}
        </button>
      </form>

      {/* Attach Documents (after successful send) */}
      {lastInvitationId && (
        <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-700">
              <svg className="mr-1.5 inline h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
              Attach Documents
            </h3>
            <button
              type="button"
              onClick={() => { setLastInvitationId(null); setAttachedFiles([]); }}
              className="text-xs text-stone-400 hover:text-stone-600"
            >
              Done
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-stone-500">Label</label>
              <select
                value={uploadLabel}
                onChange={(e) => setUploadLabel(e.target.value)}
                className="h-10 rounded-lg border border-stone-200 bg-white px-3 text-base outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              >
                {DOCUMENT_LABELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-xs text-stone-500">PDF file (max 5 MB)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleUploadFile}
                disabled={uploading}
                className="w-full text-sm text-stone-600 file:mr-2 file:rounded-lg file:border-0 file:bg-orange-500 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white file:transition-colors hover:file:bg-orange-600 disabled:opacity-50"
              />
            </div>
            {uploading && (
              <span className="flex items-center gap-1.5 text-xs text-stone-400">
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Uploading...
              </span>
            )}
          </div>
          {attachedFiles.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {attachedFiles.map((f) => (
                <li key={f.storage_path} className="flex items-center gap-2 text-sm text-stone-600">
                  <span className="shrink-0 rounded bg-stone-200 px-1.5 py-0.5 text-xs font-medium text-stone-600">{f.label}</span>
                  <span className="min-w-0 truncate">{f.file_name}</span>
                  <button
                    type="button"
                    onClick={() => handleDownloadInviteFile(f.storage_path)}
                    title="Download"
                    className="shrink-0 text-stone-300 transition-colors hover:text-blue-500"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(f.storage_path)}
                    title="Remove"
                    className="shrink-0 text-stone-300 transition-colors hover:text-red-500"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
