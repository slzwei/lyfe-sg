"use client";

import { useState } from "react";
import type { Invitation } from "../../actions";
import type { ActionDef } from "../hooks/useInviteActions";
import { InvitationRow } from "./InvitationRow";
import { InvitationCard } from "./InvitationCard";

interface CandidateListProps {
  invitations: Invitation[];
  loadingList: boolean;
  live: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  getActions: (inv: Invitation, showArchive: boolean) => ActionDef[];
  actionLoading: string | null;
  progressDisplay: (inv: Invitation) => React.ReactNode;
  onDownloadPdf: (path: string) => void;
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

function CandidateSection({
  list,
  showArchive,
  getActions,
  actionLoading,
  progressDisplay,
  onDownloadPdf,
}: {
  list: Invitation[];
  showArchive: boolean;
  getActions: (inv: Invitation, showArchive: boolean) => ActionDef[];
  actionLoading: string | null;
  progressDisplay: (inv: Invitation) => React.ReactNode;
  onDownloadPdf: (path: string) => void;
}) {
  return (
    <>
      {/* Desktop: Table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          {tableHead}
          <tbody className="divide-y divide-stone-50">
            {list.map((inv) => (
              <InvitationRow
                key={inv.id}
                invitation={inv}
                actions={getActions(inv, showArchive)}
                actionLoading={actionLoading}
                progressDisplay={progressDisplay(inv)}
                onDownloadPdf={onDownloadPdf}
              />
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile: Cards */}
      <div className="space-y-3 md:hidden">
        {list.map((inv) => (
          <InvitationCard
            key={inv.id}
            invitation={inv}
            actions={getActions(inv, showArchive)}
            actionLoading={actionLoading}
            progressDisplay={progressDisplay(inv)}
            onDownloadPdf={onDownloadPdf}
          />
        ))}
      </div>
    </>
  );
}

function LoadingSkeleton() {
  return (
    <div>
      <div className="mb-3 h-3 w-28 animate-pulse rounded bg-stone-100" />
      {/* Desktop */}
      <div className="hidden md:block">
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
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td className="py-2.5 pr-4"><div className="h-4 w-24 animate-pulse rounded bg-stone-100" /></td>
                <td className="py-2.5 pr-4"><div className="h-4 w-36 animate-pulse rounded bg-stone-100" /></td>
                <td className="py-2.5 pr-4"><div className="h-4 w-28 animate-pulse rounded bg-stone-100" /></td>
                <td className="py-2.5 pr-4">
                  <div className="w-28">
                    <div className="h-3 w-16 animate-pulse rounded bg-stone-100" />
                    <div className="mt-1 h-1.5 w-full animate-pulse rounded-full bg-stone-100" />
                  </div>
                </td>
                <td className="py-2.5 pr-4"><div className="h-4 w-16 animate-pulse rounded bg-stone-100" /></td>
                <td className="py-2.5">
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="h-6 w-6 animate-pulse rounded bg-stone-100" />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="h-4 w-28 animate-pulse rounded bg-stone-200" />
                <div className="mt-1.5 h-3.5 w-40 animate-pulse rounded bg-stone-100" />
              </div>
              <div className="w-28">
                <div className="h-3 w-16 animate-pulse rounded bg-stone-100" />
                <div className="mt-1 h-1.5 w-full animate-pulse rounded-full bg-stone-100" />
              </div>
            </div>
            <div className="mt-2 h-3 w-36 animate-pulse rounded bg-stone-100" />
            <div className="mt-3 flex items-center gap-1 border-t border-stone-100 pt-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-8 w-8 animate-pulse rounded-lg bg-stone-100" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CandidateList({
  invitations,
  loadingList,
  live,
  refreshing,
  onRefresh,
  getActions,
  actionLoading,
  progressDisplay,
  onDownloadPdf,
}: CandidateListProps) {
  const [pastOpen, setPastOpen] = useState(false);

  const active = invitations.filter((inv) => !inv.archived_at);
  const archived = invitations.filter((inv) => inv.archived_at);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-800">
          Candidate List
        </h2>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 text-xs ${live ? "text-green-600" : "text-stone-400"}`}>
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${live ? "bg-green-500 animate-pulse" : "bg-stone-300"}`} />
            {live ? "Live" : "Offline"}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh"
            aria-label="Refresh candidate list"
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
        <LoadingSkeleton />
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
              <CandidateSection
                list={active}
                showArchive={true}
                getActions={getActions}
                actionLoading={actionLoading}
                progressDisplay={progressDisplay}
                onDownloadPdf={onDownloadPdf}
              />
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
                <div className="mt-2">
                  <CandidateSection
                    list={archived}
                    showArchive={false}
                    getActions={getActions}
                    actionLoading={actionLoading}
                    progressDisplay={progressDisplay}
                    onDownloadPdf={onDownloadPdf}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
