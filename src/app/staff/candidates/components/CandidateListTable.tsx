"use client";

import Link from "next/link";
import { ProgressDisplay } from "../../components/ProgressDisplay";
import type { Invitation } from "../../actions";
import type { CandidateState } from "@/lib/supabase/progress-broadcast";

interface CandidateListTableProps {
  loading: boolean;
  tab: "all" | "invited" | "archived";
  acceptedInvitations: Invitation[];
  pendingInvitations: Invitation[];
  archivedInvitations: Invitation[];
  actionLoading: string | null;
  liveStates: Record<string, CandidateState>;
  staffRole?: string;
  onRevoke: (id: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string, name: string, isSynthetic?: boolean) => void;
  onDownloadPdf: (path: string) => void;
}

export function CandidateListTable({
  loading,
  tab,
  acceptedInvitations,
  pendingInvitations,
  archivedInvitations,
  actionLoading,
  liveStates,
  staffRole,
  onRevoke,
  onArchive,
  onUnarchive,
  onDelete,
  onDownloadPdf,
}: CandidateListTableProps) {
  const isManagerPlus = staffRole && ["manager", "director", "admin"].includes(staffRole);
  const isPaOrAbove = staffRole && ["pa", "manager", "director", "admin"].includes(staffRole);

  function progressDisplay(inv: Invitation) {
    return (
      <ProgressDisplay
        invitation={inv}
        liveState={inv.user_id ? liveStates[inv.user_id] : undefined}
      />
    );
  }

  function renderInvitationRow(inv: Invitation) {
    const isLoading = actionLoading === inv.id;
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
              <button onClick={() => onDownloadPdf(inv.profile_pdf_path!)} title="Application PDF"
                className="text-stone-300 hover:text-orange-500">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </button>
            )}
            {inv.disc_pdf_path && (
              <button onClick={() => onDownloadPdf(inv.disc_pdf_path!)} title="DISC PDF"
                className="text-stone-300 hover:text-purple-500">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </button>
            )}
          </span>
        </td>
        <td className="px-4 py-3 text-stone-500">{inv.email}</td>
        <td className="px-4 py-3 text-stone-500">{inv.position_applied || "—"}</td>
        <td className="px-4 py-3">
          {progressDisplay(inv)}
        </td>
        <td className="px-4 py-3 text-xs text-stone-400">
          <div>{new Date(inv.created_at).toLocaleDateString()}</div>
          {inv.invited_by && inv.invited_by !== "staff" && (
            <div className="text-[10px] text-stone-300">by {inv.invited_by}</div>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            {!inv._synthetic && isManagerPlus && !inv.archived_at && (inv.status === "pending" && !isExpired || inv.status === "accepted") && (
              <button onClick={() => onRevoke(inv.id)} disabled={isLoading}
                title="Revoke" className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              </button>
            )}
            {!inv._synthetic && isPaOrAbove && !inv.archived_at && inv.progress?.quiz_completed && (
              <button onClick={() => onArchive(inv.id)} disabled={isLoading}
                title="Archive" className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 disabled:opacity-50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8 4-8-4m16 0v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7m16 0l-8-4-8 4" /></svg>
              </button>
            )}
            {!inv._synthetic && isPaOrAbove && inv.archived_at && (
              <button onClick={() => onUnarchive(inv.id)} disabled={isLoading}
                title="Unarchive" className="rounded p-1 text-stone-400 hover:bg-green-50 hover:text-green-600 disabled:opacity-50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
              </button>
            )}
            {isManagerPlus && (
              <button onClick={() => onDelete(inv.id, inv.candidate_name || inv.email, inv._synthetic)} disabled={isLoading}
                title="Delete" className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  function renderInvitationCard(inv: Invitation) {
    const isLoading = actionLoading === inv.id;
    const isExpired = inv.status === "pending" && new Date(inv.expires_at) < new Date();

    return (
      <div key={inv.id} className={`rounded-xl border border-stone-200 bg-white p-4 ${isLoading ? "opacity-50" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              {inv.candidate_record_id ? (
                <Link href={`/staff/candidates/${inv.candidate_record_id}`} className="font-medium text-orange-600 hover:underline">
                  {inv.candidate_name || "—"}
                </Link>
              ) : (
                <span className="font-medium text-stone-800">{inv.candidate_name || "—"}</span>
              )}
              {inv.profile_pdf_path && (
                <button onClick={() => onDownloadPdf(inv.profile_pdf_path!)} title="Application PDF"
                  className="text-stone-300 hover:text-orange-500">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </button>
              )}
              {inv.disc_pdf_path && (
                <button onClick={() => onDownloadPdf(inv.disc_pdf_path!)} title="DISC PDF"
                  className="text-stone-300 hover:text-purple-500">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </button>
              )}
            </span>
            <p className="mt-0.5 truncate text-xs text-stone-400">{inv.email}</p>
          </div>
          <div className="shrink-0">{progressDisplay(inv)}</div>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-stone-400">
            {inv.position_applied || "—"} &middot; {new Date(inv.created_at).toLocaleDateString()}
            {inv.invited_by && inv.invited_by !== "staff" && (
              <span className="text-stone-300"> &middot; by {inv.invited_by}</span>
            )}
          </p>
          <div className="flex items-center gap-1">
            {!inv._synthetic && isManagerPlus && !inv.archived_at && (inv.status === "pending" && !isExpired || inv.status === "accepted") && (
              <button onClick={() => onRevoke(inv.id)} disabled={isLoading}
                title="Revoke" className="rounded p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              </button>
            )}
            {!inv._synthetic && isPaOrAbove && !inv.archived_at && inv.progress?.quiz_completed && (
              <button onClick={() => onArchive(inv.id)} disabled={isLoading}
                title="Archive" className="rounded p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 disabled:opacity-50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8 4-8-4m16 0v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7m16 0l-8-4-8 4" /></svg>
              </button>
            )}
            {!inv._synthetic && isPaOrAbove && inv.archived_at && (
              <button onClick={() => onUnarchive(inv.id)} disabled={isLoading}
                title="Unarchive" className="rounded p-1.5 text-stone-400 hover:bg-green-50 hover:text-green-600 disabled:opacity-50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
              </button>
            )}
            {isManagerPlus && (
              <button onClick={() => onDelete(inv.id, inv.candidate_name || inv.email, inv._synthetic)} disabled={isLoading}
                title="Delete" className="rounded p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <>
        {/* Desktop loading skeleton */}
        <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-left text-xs font-medium text-stone-400">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Progress</th>
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
        {/* Mobile loading skeleton */}
        <div className="space-y-3 md:hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="mb-2 h-4 w-32 animate-pulse rounded bg-stone-100" />
              <div className="mb-1 h-3 w-48 animate-pulse rounded bg-stone-100" />
              <div className="h-3 w-24 animate-pulse rounded bg-stone-100" />
            </div>
          ))}
        </div>
      </>
    );
  }

  const isEmpty =
    (tab === "all" && acceptedInvitations.length === 0) ||
    (tab === "invited" && pendingInvitations.length === 0) ||
    (tab === "archived" && archivedInvitations.length === 0);

  return (
    <>
      {/* Desktop: Table */}
      <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 text-left text-xs font-medium text-stone-400">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {tab === "all" && acceptedInvitations.map((inv) => renderInvitationRow(inv))}
            {tab === "invited" && pendingInvitations.map((inv) => renderInvitationRow(inv))}
            {tab === "archived" && archivedInvitations.map((inv) => renderInvitationRow(inv))}

            {isEmpty && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-stone-400">No candidates found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Mobile: Cards */}
      <div className="space-y-3 md:hidden">
        {tab === "all" && acceptedInvitations.map((inv) => renderInvitationCard(inv))}
        {tab === "invited" && pendingInvitations.map((inv) => renderInvitationCard(inv))}
        {tab === "archived" && archivedInvitations.map((inv) => renderInvitationCard(inv))}

        {isEmpty && (
          <p className="py-12 text-center text-sm text-stone-400">No candidates found.</p>
        )}
      </div>
    </>
  );
}
