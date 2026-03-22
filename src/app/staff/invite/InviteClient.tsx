"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { onProgress, type CandidateState } from "@/lib/supabase/progress-broadcast";
import {
  sendInvite,
  listInvitations,
  getProgressForUser,
  revokeInvitation,
  resetApplication,
  resetQuiz,
  archiveInvitation,
  deleteCandidate,
  getPdfUrl,
  getInviteFileUrl,
  removeInviteFile,
  backfillPdfs,
  getStaffUser,
  type Invitation,
  type AttachedFile,
} from "../actions";
import { listAssignableManagers, type AssignableManager } from "../candidates/actions";

const DOCUMENT_LABELS = [
  "Resume", "RES5", "M5", "M9", "M9A", "HI", "M8", "M8A", "ComGI", "BCP", "PGI", "Other",
] as const;

export default function InviteClient() {
  const [email, setEmail] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [position, setPosition] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    phrase: string;
    onConfirm: () => void;
  } | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [pastOpen, setPastOpen] = useState(false);
  const [lastInvitationId, setLastInvitationId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadLabel, setUploadLabel] = useState<string>("Resume");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [live, setLive] = useState(false);
  const [liveStates, setLiveStates] = useState<Record<string, CandidateState>>({});
  const debounceMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [staffRole, setStaffRole] = useState<string>("");
  const [assignableManagers, setAssignableManagers] = useState<AssignableManager[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");

  const fetchInvitations = useCallback(async () => {
    const result = await listInvitations();
    if (result.success && result.data) {
      setInvitations(result.data);
    }
    setLoadingList(false);
    setLastRefreshed(new Date());
  }, []);

  useEffect(() => {
    fetchInvitations().then(() => {
      // One-time backfill: generate PDFs for candidates who completed before this feature
      backfillPdfs().then(({ generated }) => {
        if (generated > 0) fetchInvitations();
      });
    });
    // Fetch staff role and assignable managers for the picker
    getStaffUser().then((user) => {
      if (user) setStaffRole(user.role);
    });
    listAssignableManagers().then((result) => {
      if (result.success && result.managers) {
        setAssignableManagers(result.managers);
      }
    });
  }, [fetchInvitations]);

  // Targeted refresh: only fetch progress for the candidate that changed
  const refreshUser = useCallback((userId: string) => {
    const existing = debounceMap.current.get(userId);
    if (existing) clearTimeout(existing);

    debounceMap.current.set(userId, setTimeout(async () => {
      debounceMap.current.delete(userId);
      const result = await getProgressForUser(userId);
      if (result.success && result.progress) {
        setInvitations((prev) =>
          prev.map((inv) =>
            inv.user_id === userId ? { ...inv, progress: result.progress! } : inv
          )
        );
      }
    }, 500));
  }, []);

  // Listen for realtime broadcasts from candidate browsers
  useEffect(() => {
    const unsub = onProgress(
      (payload) => {
        if (payload.userId && payload.state) {
          setLiveStates((prev) => ({ ...prev, [payload.userId]: payload.state }));
          // Only fetch from DB for states that change data
          if (payload.state === "quiz" || payload.state === "form") {
            refreshUser(payload.userId);
          }
          // Auto-clear "signed-out" to "completed" after 1 minute
          if (payload.state === "signed-out") {
            setTimeout(() => {
              setLiveStates((prev) => {
                if (prev[payload.userId] !== "signed-out") return prev;
                const next = { ...prev };
                delete next[payload.userId];
                return next;
              });
            }, 60_000);
          }
        }
      },
      (connected) => setLive(connected)
    );

    // Browser knows immediately when network drops
    const goOffline = () => setLive(false);
    const goOnline = () => setLive(true);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    return () => {
      debounceMap.current.forEach((t) => clearTimeout(t));
      debounceMap.current.clear();
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      unsub();
    };
  }, [refreshUser]);

  // Fallback poll every 30s in case broadcast is missed
  useEffect(() => {
    const interval = setInterval(fetchInvitations, 30_000);
    return () => clearInterval(interval);
  }, [fetchInvitations]);

  const active = invitations.filter((inv) => !inv.archived_at);
  const archived = invitations.filter((inv) => inv.archived_at);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchInvitations();
    setRefreshing(false);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setMessage(null);

    const result = await sendInvite({
      email,
      candidateName: candidateName || undefined,
      position: position || undefined,
      assignedManagerId: selectedManagerId || undefined,
    });

    if (result.success) {
      setMessage({ type: "success", text: `Invitation sent to ${email}. You can now attach documents below.` });
      setLastInvitationId(result.invitationId || null);
      setAttachedFiles([]);
      setUploadLabel("Resume");
      setEmail("");
      setCandidateName("");
      setPosition("");
      setSelectedManagerId("");
      fetchInvitations();
    } else {
      setMessage({ type: "error", text: result.error || "Failed to send." });
    }
    setSending(false);
  }

  function requireConfirm(message: string, phrase: string, onConfirm: () => void) {
    setConfirmInput("");
    setConfirmDialog({ message, phrase, onConfirm });
  }

  function handleRevoke(id: string) {
    requireConfirm(
      "Revoke this invitation? The candidate will no longer be able to use it.",
      "revoke",
      async () => {
        setActionLoading(id);
        const result = await revokeInvitation(id);
        if (result.success) fetchInvitations();
        setActionLoading(null);
      }
    );
  }

  function handleResetApp(id: string) {
    requireConfirm(
      "Reset this candidate's application? Their form will be marked incomplete and quiz data will be cleared. They will need to re-submit.",
      "reopen form",
      async () => {
        setActionLoading(id);
        const result = await resetApplication(id);
        if (result.success) fetchInvitations();
        setActionLoading(null);
      }
    );
  }

  function handleResetQuiz(id: string) {
    requireConfirm(
      "Reset this candidate's quiz? They will need to retake the DISC personality test.",
      "reset quiz",
      async () => {
        setActionLoading(id);
        const result = await resetQuiz(id);
        if (result.success) fetchInvitations();
        setActionLoading(null);
      }
    );
  }

  function handleArchive(id: string) {
    requireConfirm(
      "Archive this candidate? They will be moved to Past Candidates.",
      "archive",
      async () => {
        setActionLoading(id);
        const result = await archiveInvitation(id);
        if (result.success) fetchInvitations();
        setActionLoading(null);
      }
    );
  }

  function handleDelete(id: string) {
    requireConfirm(
      "Permanently delete this candidate? This will remove their invitation, application, quiz data, and account.",
      "delete",
      async () => {
        setActionLoading(id);
        const result = await deleteCandidate(id);
        if (result.success) fetchInvitations();
        setActionLoading(null);
      }
    );
  }

  function handleCopyLink(inv: Invitation) {
    const link = `${window.location.origin}/candidate/login?token=${inv.token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDownloadPdf(path: string) {
    const result = await getPdfUrl(path);
    if (result.success && result.url) {
      window.open(result.url, "_blank");
    }
  }

  async function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !lastInvitationId) return;

    if (file.type !== "application/pdf") {
      setMessage({ type: "error", text: "Only PDF files are allowed." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "File must be under 5 MB." });
      return;
    }
    if (attachedFiles.length >= 20) {
      setMessage({ type: "error", text: "Maximum 20 files per candidate." });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("invitationId", lastInvitationId);
      formData.append("label", uploadLabel);
      formData.append("file", file);

      const res = await fetch("/api/upload-invite-doc", { method: "POST", body: formData });
      const data = await res.json();

      if (data.success) {
        setAttachedFiles((prev) => [...prev, data.file]);
        setMessage({ type: "success", text: `Uploaded ${file.name}` });
      } else {
        setMessage({ type: "error", text: data.error || "Upload failed." });
      }
    } catch {
      setMessage({ type: "error", text: "Upload failed. Please try again." });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleRemoveFile(storagePath: string) {
    if (!lastInvitationId) return;
    const result = await removeInviteFile(lastInvitationId, storagePath);
    if (result.success) {
      setAttachedFiles((prev) => prev.filter((f) => f.storage_path !== storagePath));
    }
  }

  async function handleDownloadInviteFile(storagePath: string) {
    const result = await getInviteFileUrl(storagePath);
    if (result.success && result.url) {
      window.open(result.url, "_blank");
    }
  }

  // ─── Shared action definitions ──────────────────────────────────────────────

  function getActions(inv: Invitation, showArchive: boolean) {
    const isExpired = inv.status === "pending" && new Date(inv.expires_at) < new Date();
    const isAccepted = inv.status === "accepted";

    const actions: {
      key: string;
      label: string;
      onClick: () => void;
      icon: React.ReactNode;
      hoverClass: string;
      canUseWhileLoading?: boolean;
    }[] = [];

    if (inv.status === "pending" && !isExpired) {
      actions.push({
        key: "copy",
        label: copiedId === inv.id ? "Copied!" : "Copy link",
        onClick: () => handleCopyLink(inv),
        icon: copiedId === inv.id
          ? <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
        hoverClass: "hover:bg-stone-100 hover:text-stone-600",
        canUseWhileLoading: true,
      });
    }

    if ((inv.status === "pending" && !isExpired) || isAccepted) {
      actions.push({
        key: "revoke",
        label: "Revoke",
        onClick: () => handleRevoke(inv.id),
        icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>,
        hoverClass: "hover:bg-red-50 hover:text-red-500",
      });
    }

    if (isAccepted && inv.progress?.quiz_completed) {
      actions.push({
        key: "reset-quiz",
        label: "Reset quiz",
        onClick: () => handleResetQuiz(inv.id),
        icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
        hoverClass: "hover:bg-blue-50 hover:text-blue-500",
      });
    }

    if (isAccepted && inv.progress?.profile_completed) {
      actions.push({
        key: "reset-app",
        label: "Reopen form",
        onClick: () => handleResetApp(inv.id),
        icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
        hoverClass: "hover:bg-orange-50 hover:text-orange-500",
      });
    }

    if (showArchive && !inv.archived_at && (inv.status === "revoked" || isExpired || (isAccepted && !!inv.progress?.quiz_completed))) {
      actions.push({
        key: "archive",
        label: "Archive",
        onClick: () => handleArchive(inv.id),
        icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8 4-8-4m16 0v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7m16 0l-8-4-8 4" /></svg>,
        hoverClass: "hover:bg-stone-100 hover:text-stone-600",
      });
    }

    actions.push({
      key: "delete",
      label: "Delete",
      onClick: () => handleDelete(inv.id),
      icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
      hoverClass: "hover:bg-red-50 hover:text-red-600",
    });

    return actions;
  }

  // ─── Progress display ───────────────────────────────────────────────────────

  function progressDisplay(inv: Invitation) {
    const isExpired =
      inv.status === "pending" && new Date(inv.expires_at) < new Date();

    // Non-accepted: simple pill badge
    if (isExpired || inv.status === "revoked" || inv.status === "pending") {
      const status = isExpired ? "expired" : inv.status;
      const styles: Record<string, string> = {
        pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
        expired: "bg-stone-50 text-stone-500 border-stone-200",
        revoked: "bg-red-50 text-red-600 border-red-200",
      };
      return (
        <span
          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
        >
          {status}
        </span>
      );
    }

    // Accepted: smooth progress bar
    const progress = inv.progress;
    const quizInProgress =
      progress && progress.quiz_answered > 0 && !progress.quiz_completed;

    // Calculate overall percentage: form = 0–50%, quiz = 50–100%
    let pct = 0;
    let label = "Starting";
    let detail = "";
    let barColor = "bg-stone-300";
    let textColor = "text-stone-500";

    // Check for live broadcast state
    const liveState = inv.user_id ? liveStates[inv.user_id] : undefined;

    if (liveState === "signed-out" && progress?.quiz_completed) {
      pct = 100;
      label = "Signed out";
      barColor = "bg-stone-400";
      textColor = "text-stone-500";
    } else if (liveState === "viewing-results" && progress?.quiz_completed) {
      pct = 100;
      label = "Viewing results";
      barColor = "bg-green-500";
      textColor = "text-green-700";
    } else if (progress?.quiz_completed) {
      pct = 100;
      label = "Completed";
      barColor = "bg-green-500";
      textColor = "text-green-700";
    } else if (progress?.profile_completed && quizInProgress) {
      pct = 50 + Math.round((progress.quiz_answered / 39) * 50);
      label = "Quiz";
      detail = `${progress.quiz_answered}/39`;
      barColor = "bg-blue-500";
      textColor = "text-blue-700";
    } else if (progress?.profile_completed) {
      pct = 50;
      label = "Form done";
      detail = "Quiz not started";
      barColor = "bg-orange-500";
      textColor = "text-orange-700";
    } else if (progress) {
      const s = progress.onboarding_step || 1;
      pct = Math.round((s / 6) * 50);
      label = "Form";
      detail = `${s}/6`;
      barColor = "bg-orange-400";
      textColor = "text-stone-600";
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
            DISC Result: <span className="font-semibold text-stone-600">{discType}</span>
            {inv.disc_pdf_path && (
              <button
                type="button"
                onClick={() => handleDownloadPdf(inv.disc_pdf_path!)}
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

  // ─── Row renderer (desktop table) ──────────────────────────────────────────

  function renderRow(inv: Invitation, showArchive: boolean) {
    const isLoading = actionLoading === inv.id;

    return (
      <tr
        key={inv.id}
        className={`text-stone-600 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <td className="py-2.5 pr-4 font-medium text-stone-800">
          <span className="flex items-center gap-1.5">
            {inv.candidate_name || "\u2014"}
            {inv.profile_pdf_path && (
              <button
                type="button"
                onClick={() => handleDownloadPdf(inv.profile_pdf_path!)}
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
          {inv.position_applied || "\u2014"}
        </td>
        <td className="py-2.5 pr-4">{progressDisplay(inv)}</td>
        <td className="py-2.5 pr-4 text-stone-400">
          <div>{new Date(inv.created_at).toLocaleDateString()}</div>
          {inv.invited_by && inv.invited_by !== "staff" && (
            <div className="text-[10px] text-stone-300">by {inv.invited_by}</div>
          )}
        </td>
        <td className="py-2.5">
          <div className="flex items-center gap-1.5">
            {getActions(inv, showArchive).map((a) => (
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

  // ─── Card renderer (mobile) ────────────────────────────────────────────────

  function renderCard(inv: Invitation, showArchive: boolean) {
    const isLoading = actionLoading === inv.id;

    return (
      <div
        key={inv.id}
        className={`rounded-xl border border-stone-200 bg-white p-4 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
      >
        {/* Header: Name + Progress */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate font-medium text-stone-800">
              {inv.candidate_name || "\u2014"}
              {inv.profile_pdf_path && (
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(inv.profile_pdf_path!)}
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
          <div className="shrink-0">{progressDisplay(inv)}</div>
        </div>

        {/* Meta: Position + Date */}
        <p className="mt-2 text-xs text-stone-400">
          {inv.position_applied || "\u2014"} &middot; {new Date(inv.created_at).toLocaleDateString()}
        </p>

        {/* Actions */}
        <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-stone-100 pt-3">
          {getActions(inv, showArchive).map((a) => (
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

  // ─── Candidate list sections ───────────────────────────────────────────────

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

  function renderCandidateSection(list: Invitation[], showArchive: boolean) {
    return (
      <>
        {/* Desktop: Table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            {tableHead}
            <tbody className="divide-y divide-stone-50">
              {list.map((inv) => renderRow(inv, showArchive))}
            </tbody>
          </table>
        </div>
        {/* Mobile: Cards */}
        <div className="space-y-3 md:hidden">
          {list.map((inv) => renderCard(inv, showArchive))}
        </div>
      </>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Send Invitation Form */}
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
              className="h-11 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100 sm:h-10"
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
                className="h-11 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100 sm:h-10"
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
                className="h-11 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100 sm:h-10"
              />
            </div>
          </div>

          {/* Manager assignment picker — required for PAs, optional for managers+ */}
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
                className="h-11 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100 sm:h-10"
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
                  className="h-10 rounded-lg border border-stone-200 bg-white px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
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

      {/* Candidate List */}
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
              onClick={handleRefresh}
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
                renderCandidateSection(active, true)
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
                    {renderCandidateSection(archived, false)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
            <p className="text-sm text-stone-700">{confirmDialog.message}</p>
            <p className="mt-4 text-xs text-stone-500">
              Type <span className="font-semibold text-stone-800">{confirmDialog.phrase}</span> to confirm:
            </p>
            <input
              autoFocus
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && confirmInput === confirmDialog.phrase) {
                  setConfirmDialog(null);
                  confirmDialog.onConfirm();
                }
              }}
              placeholder={confirmDialog.phrase}
              className="mt-2 h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmInput !== confirmDialog.phrase}
                onClick={() => {
                  setConfirmDialog(null);
                  confirmDialog.onConfirm();
                }}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-30"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
