"use client";

import type { Invitation } from "../../actions";
import type { ActionDef } from "../hooks/useInviteActions";

interface InvitationRowProps {
  invitation: Invitation;
  actions: ActionDef[];
  actionLoading: string | null;
  progressDisplay: React.ReactNode;
  onDownloadPdf: (path: string) => void;
}

export function InvitationRow({ invitation: inv, actions, actionLoading, progressDisplay, onDownloadPdf }: InvitationRowProps) {
  const isLoading = actionLoading === inv.id;

  return (
    <tr
      className={`text-stone-600 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
    >
      <td className="py-2.5 pr-4 font-medium text-stone-800">
        <span className="flex items-center gap-1.5">
          {inv.candidate_name || "—"}
          {inv.profile_pdf_path && (
            <button
              type="button"
              onClick={() => onDownloadPdf(inv.profile_pdf_path!)}
              title="Download Application PDF"
              className="text-stone-300 transition-colors hover:text-orange-500"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </button>
          )}
        </span>
      </td>
      <td className="py-2.5 pr-4">
        <span className="flex items-center gap-1.5">
          {inv.email}
          {inv.attached_files && inv.attached_files.length > 0 && (
            <span className="flex items-center gap-0.5 text-stone-400" title={`${inv.attached_files.length} file(s) attached`}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
              <span className="text-[10px]">{inv.attached_files.length}</span>
            </span>
          )}
        </span>
      </td>
      <td className="py-2.5 pr-4">
        {inv.position_applied || "—"}
      </td>
      <td className="py-2.5 pr-4">{progressDisplay}</td>
      <td className="py-2.5 pr-4 text-stone-400">
        <div>{new Date(inv.created_at).toLocaleDateString()}</div>
        {inv.invited_by && inv.invited_by !== "staff" && (
          <div className="text-[10px] text-stone-300">by {inv.invited_by}</div>
        )}
      </td>
      <td className="py-2.5">
        <div className="flex items-center gap-1.5">
          {actions.map((a) => (
            <button
              key={a.key}
              onClick={a.onClick}
              disabled={!a.canUseWhileLoading && isLoading}
              title={a.label}
              aria-label={a.label}
              className={`rounded p-1.5 text-stone-400 transition-colors disabled:opacity-50 ${a.hoverClass}`}
            >
              {a.icon}
            </button>
          ))}
        </div>
      </td>
    </tr>
  );
}
