"use client";

import { useState, useEffect, useCallback } from "react";
import { useRealtimeProgress } from "../hooks/useRealtimeProgress";
import { searchCandidates, type SearchResult } from "./actions";
import {
  sendInvite,
  listInvitations,
  getProgressForUser,
  revokeInvitation,
  archiveInvitation,
  unarchiveInvitation,
  deleteCandidate,
  getPdfUrl,
  type Invitation,
} from "../actions";
import { CandidateListTable } from "./components/CandidateListTable";
import { InlineInviteForm } from "./components/InlineInviteForm";

type Tab = "all" | "invited" | "archived";

export default function CandidatesClient({ staffRole }: { staffRole?: string }) {
  const [tab, setTab] = useState<Tab>("all");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [pipelineCandidates, setPipelineCandidates] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", candidateName: "", position: "" });
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [invResult, candResult] = await Promise.all([
      listInvitations(),
      searchCandidates({ query: query || undefined }),
    ]);
    if (invResult.success && invResult.data) setInvitations(invResult.data);
    if (candResult.success && candResult.data) setPipelineCandidates(candResult.data);
    setLoading(false);
  }, [query]);

  useEffect(() => {
    const timeout = setTimeout(fetchData, 300);
    return () => clearTimeout(timeout);
  }, [fetchData]);

  const handleRealtimeRefresh = useCallback(async (userId: string) => {
    const result = await getProgressForUser(userId);
    if (result.success && result.progress) {
      setInvitations((prev) =>
        prev.map((inv) =>
          inv.user_id === userId ? { ...inv, progress: result.progress! } : inv
        )
      );
    }
  }, []);
  const { live, liveStates } = useRealtimeProgress({ onRefresh: handleRealtimeRefresh, onListChanged: fetchData });

  // Accepted invitations (with or without candidates record) — shown on "All" tab with progress
  const acceptedInvitations = invitations.filter((inv) => !inv.archived_at && inv.status === "accepted");
  const acceptedCandidateIds = new Set(acceptedInvitations.map((inv) => inv.candidate_record_id).filter(Boolean));
  // Pipeline candidates not already covered by an invitation row
  const pipelineOnly = pipelineCandidates.filter((c) => !acceptedCandidateIds.has(c.id));
  // Invited = not yet signed up (pending/expired/revoked, no candidate_record_id)
  const pendingInvitations = invitations.filter((inv) => !inv.archived_at && inv.status !== "accepted" && !inv.candidate_record_id);
  const archivedInvitations = invitations.filter((inv) => inv.archived_at);

  // Search filter (for invitation tabs — candidates are already server-filtered by query)
  const filteredAccepted = query
    ? acceptedInvitations.filter((inv) =>
        inv.candidate_name?.toLowerCase().includes(query.toLowerCase()) ||
        inv.email.toLowerCase().includes(query.toLowerCase())
      )
    : acceptedInvitations;

  const filteredInvitations = query
    ? pendingInvitations.filter((inv) =>
        inv.candidate_name?.toLowerCase().includes(query.toLowerCase()) ||
        inv.email.toLowerCase().includes(query.toLowerCase())
      )
    : pendingInvitations;

  const filteredArchived = query
    ? archivedInvitations.filter((inv) =>
        inv.candidate_name?.toLowerCase().includes(query.toLowerCase()) ||
        inv.email.toLowerCase().includes(query.toLowerCase())
      )
    : archivedInvitations;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setMessage(null);
    const result = await sendInvite(inviteForm);
    if (result.success) {
      setMessage({ type: "success", text: `Invitation sent to ${inviteForm.email}` });
      setInviteForm({ email: "", candidateName: "", position: "" });
      setShowInvite(false);
      fetchData();
    } else {
      setMessage({ type: "error", text: result.error || "Failed." });
    }
    setSending(false);
  }

  async function handleAction(id: string, action: () => Promise<{ success: boolean }>) {
    setActionLoading(id);
    await action();
    fetchData();
    setActionLoading(null);
  }

  async function handleDownloadPdf(path: string) {
    const result = await getPdfUrl(path);
    if (result.success && result.url) window.open(result.url, "_blank");
  }

  return (
    <div className="space-y-4">
      {/* Header with search + invite button */}
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search candidates\u2026"
          className="h-10 flex-1 rounded-xl border border-stone-200 bg-white px-4 text-base outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="h-10 shrink-0 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          {showInvite ? "Cancel" : "Invite Candidate"}
        </button>
      </div>

      <InlineInviteForm
        showInvite={showInvite}
        setShowInvite={setShowInvite}
        inviteForm={inviteForm}
        setInviteForm={setInviteForm}
        sending={sending}
        message={message}
        onSubmit={handleInvite}
      />

      {/* Tabs + live indicator */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-stone-200">
        {([["all", "All"], ["invited", "Invited"], ["archived", "Archived"]] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
              tab === key ? "border-b-2 border-orange-500 text-orange-600" : "text-stone-400 hover:text-stone-600"
            }`}
          >
            {label}
          </button>
        ))}
        {live && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-green-600">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        )}
      </div>

      <CandidateListTable
        loading={loading}
        tab={tab}
        acceptedInvitations={filteredAccepted}
        pendingInvitations={filteredInvitations}
        archivedInvitations={filteredArchived}
        pipelineOnly={pipelineOnly}
        actionLoading={actionLoading}
        liveStates={liveStates}
        staffRole={staffRole}
        onRevoke={(id) => handleAction(id, () => revokeInvitation(id))}
        onArchive={(id) => handleAction(id, () => archiveInvitation(id))}
        onUnarchive={(id) => handleAction(id, () => unarchiveInvitation(id))}
        onDelete={(id) => handleAction(id, () => deleteCandidate(id))}
        onDownloadPdf={handleDownloadPdf}
      />
    </div>
  );
}
