"use client";

import type { Invitation } from "../../actions";
import type { ActionDef } from "../hooks/useInviteActions";

interface InvitationCardProps {
  invitation: Invitation;
  actions: ActionDef[];
  actionLoading: string | null;
  progressDisplay: React.ReactNode;
  onDownloadPdf: (path: string) => void;
}

export function InvitationCard({ invitation: inv, actions, actionLoading, progressDisplay, onDownloadPdf }: InvitationCardProps) {
  const isLoading = actionLoading === inv.id;

  return (
    <div
      className={`rounded-xl border border-stone-200 bg-white p-4 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
    >
      {/* Header: Name + Progress */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate font-medium text-stone-800">
            {inv.candidate_name || "—"}
            {inv.profile_pdf_path && (
              <button
                type="button"
                onClick={() => onDownloadPdf(inv.profile_pdf_path!)}
                title="Download Application PDF"
                className="shrink-0 text-stone-300 transition-colors hover:text-orange-500"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </button>
            )}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-stone-500">
            {inv.email}
            {inv.attached_files && inv.attached_files.length > 0 && (
              <span className="flex items-center gap-0.5 text-stone-400" title={`${inv.attached_files.length} file(s) attached`}>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                <span className="text-[10px]">{inv.attached_files.length}</span>
              </span>
            )}
          </p>
        </div>
        <div className="shrink-0">{progressDisplay}</div>
      </div>

      {/* Meta: Position + Date */}
      <p className="mt-2 text-xs text-stone-400">
        {inv.position_applied || "—"} &middot; {new Date(inv.created_at).toLocaleDateString()}
      </p>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-stone-100 pt-3">
        {actions.map((a) => (
          <button
            key={a.key}
            onClick={a.onClick}
            disabled={!a.canUseWhileLoading && isLoading}
            title={a.label}
            aria-label={a.label}
            className={`rounded-lg p-2.5 text-stone-400 transition-colors disabled:opacity-50 ${a.hoverClass}`}
          >
            {a.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
