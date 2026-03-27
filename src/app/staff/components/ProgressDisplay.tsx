"use client";

import type { CandidateState } from "@/lib/supabase/progress-broadcast";
import type { Invitation } from "../actions";

interface ProgressDisplayProps {
  invitation: Invitation;
  liveState?: CandidateState;
  /** If provided, renders a download button next to the DISC result. */
  onDownloadDiscPdf?: (path: string) => void;
}

export function ProgressDisplay({ invitation: inv, liveState, onDownloadDiscPdf }: ProgressDisplayProps) {
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
          DISC{onDownloadDiscPdf ? " Result" : ""}: <span className="font-semibold text-stone-600">{discType}</span>
          {onDownloadDiscPdf && inv.disc_pdf_path && (
            <button
              type="button"
              onClick={() => onDownloadDiscPdf(inv.disc_pdf_path!)}
              title="Download DISC PDF"
              className="ml-0.5 text-stone-300 transition-colors hover:text-blue-500"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </button>
          )}
        </p>
      )}
    </div>
  );
}
