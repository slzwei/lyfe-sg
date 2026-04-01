"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeProgress } from "../hooks/useRealtimeProgress";
import { searchCandidates, deleteCandidateById, type SearchResult } from "./actions";
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
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("all");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [pipelineCandidates, setPipelineCandidates] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [discFilter, setDiscFilter] = useState(searchParams.get("disc") || "");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; isSynthetic?: boolean } | null>(null);
  const [deleteText, setDeleteText] = useState("");

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", candidateName: "", position: "" });
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const initialLoadDone = useRef(false);
  const fetchData = useCallback(async () => {
    if (!initialLoadDone.current) setLoading(true);
    const [invResult, candResult] = await Promise.all([
      listInvitations(),
      searchCandidates({ query: query || undefined, discType: discFilter || undefined }),
    ]);
    if (invResult.success && invResult.data) setInvitations(invResult.data);
    if (candResult.success && candResult.data) setPipelineCandidates(candResult.data);
    setLoading(false);
    initialLoadDone.current = true;
  }, [query, discFilter]);

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
  const { live, liveStates } = useRealtimeProgress({ onRefresh: handleRealtimeRefresh });

  // Subscribe to invitation inserts/updates so new invites appear dynamically
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("invitations-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invitations" },
        () => { fetchData(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  // Merge: accepted invitations + pipeline-only candidates as synthetic invitations
  const acceptedInvitations = invitations.filter((inv) =>
    !inv.archived_at && inv.status === "accepted" &&
    (!discFilter || inv.progress?.disc_type === discFilter)
  );
  const acceptedCandidateIds = new Set(acceptedInvitations.map((inv) => inv.candidate_record_id).filter(Boolean));
  const pipelineOnly = pipelineCandidates.filter((c) => !acceptedCandidateIds.has(c.id));
  const syntheticInvitations: Invitation[] = pipelineOnly.map((c) => ({
    id: c.id,
    token: "",
    email: c.email || "",
    candidate_name: c.name,
    position_applied: c.position_applied,
    status: "accepted",
    user_id: c.user_id,
    invited_by: "",
    created_at: c.created_at || "",
    expires_at: "",
    accepted_at: c.created_at,
    archived_at: null,
    candidate_record_id: c.id,
    profile_pdf_path: c.profile_pdf_path,
    disc_pdf_path: c.disc_pdf_path,
    attached_files: null,
    progress: {
      profile_completed: c.profile_completed,
      onboarding_step: c.onboarding_step,
      quiz_answered: c.quiz_answered,
      quiz_completed: c.quiz_completed,
      disc_type: c.disc_type || undefined,
    },
    _synthetic: true,
  }));
  const allCandidates = [...acceptedInvitations, ...syntheticInvitations];

  // Invited = not yet signed up (pending/expired/revoked, no candidate_record_id)
  const pendingInvitations = invitations.filter((inv) => !inv.archived_at && inv.status !== "accepted" && !inv.candidate_record_id);
  const archivedInvitations = invitations.filter((inv) => inv.archived_at);

  // Search filter (for invitation tabs — candidates are already server-filtered by query)
  const filteredAll = query
    ? allCandidates.filter((inv) =>
        inv.candidate_name?.toLowerCase().includes(query.toLowerCase()) ||
        inv.email.toLowerCase().includes(query.toLowerCase())
      )
    : allCandidates;

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

  async function handleAction(id: string, action: () => Promise<{ success: boolean; error?: string }>) {
    setActionLoading(id);
    const result = await action();
    if (!result.success) {
      setMessage({ type: "error", text: result.error || "Action failed." });
    }
    fetchData();
    setActionLoading(null);
  }

  async function handleConfirmDelete() {
    if (!deleteConfirm) return;
    const { id, isSynthetic } = deleteConfirm;
    setDeleteConfirm(null);
    setDeleteText("");
    await handleAction(id, () =>
      isSynthetic ? deleteCandidateById(id) : deleteCandidate(id)
    );
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
          placeholder="Search candidates…"
          className="h-10 flex-1 rounded-xl border border-stone-200 bg-white px-4 text-base outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="h-10 shrink-0 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          {showInvite ? "Cancel" : "Invite Candidate"}
        </button>
      </div>

      {discFilter && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">Filtered by DISC type:</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-600">
            {discFilter}
            <button onClick={() => setDiscFilter("")} className="ml-0.5 text-purple-400 hover:text-purple-600">&times;</button>
          </span>
        </div>
      )}

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
        acceptedInvitations={filteredAll}
        pendingInvitations={filteredInvitations}
        archivedInvitations={filteredArchived}
        actionLoading={actionLoading}
        liveStates={liveStates}
        staffRole={staffRole}
        onRevoke={(id) => handleAction(id, () => revokeInvitation(id))}
        onArchive={(id) => handleAction(id, () => archiveInvitation(id))}
        onUnarchive={(id) => handleAction(id, () => unarchiveInvitation(id))}
        onDelete={(id, name, isSynthetic) => {
          setDeleteConfirm({ id, name, isSynthetic });
          setDeleteText("");
        }}
        onDownloadPdf={handleDownloadPdf}
      />

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setDeleteConfirm(null); setDeleteText(""); }}>
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-stone-800">Delete Candidate</h3>
            <p className="mt-2 text-sm text-stone-500">
              This will permanently delete <span className="font-semibold text-stone-700">{deleteConfirm.name}</span> and all associated data.
              Type <span className="font-semibold text-stone-700">&quot;delete&quot;</span> to confirm.
            </p>
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="delete"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") { setDeleteConfirm(null); setDeleteText(""); }
                if (e.key === "Enter" && deleteText.toLowerCase() === "delete") handleConfirmDelete();
              }}
              className="mt-3 h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-base outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setDeleteConfirm(null); setDeleteText(""); }}
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-500 hover:bg-stone-100">
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteText.toLowerCase() !== "delete"}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-30">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
