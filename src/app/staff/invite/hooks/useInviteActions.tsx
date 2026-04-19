"use client";

import { useState } from "react";
import {
  revokeInvitation,
  resetApplication,
  resetQuiz,
  archiveInvitation,
  deleteCandidate,
  type Invitation,
} from "../../actions";

interface UseInviteActionsOptions {
  onRefresh: () => void;
}

export interface ActionDef {
  key: string;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  hoverClass: string;
  canUseWhileLoading?: boolean;
}

export function useInviteActions({ onRefresh }: UseInviteActionsOptions) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    phrase: string;
    onConfirm: () => void;
  } | null>(null);
  const [confirmInput, setConfirmInput] = useState("");

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
        if (result.success) onRefresh();
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
        if (result.success) onRefresh();
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
        if (result.success) onRefresh();
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
        if (result.success) onRefresh();
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
        if (result.success) onRefresh();
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

  function getActions(inv: Invitation, showArchive: boolean): ActionDef[] {
    const isExpired = inv.status === "pending" && new Date(inv.expires_at) < new Date();
    const isAccepted = inv.status === "accepted";

    const actions: ActionDef[] = [];

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
        icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7.5V18a2 2 0 01-2 2H6a2 2 0 01-2-2V7.5m16 0h-16m16 0l-1.5-3h-13l-1.5 3m8 4v4m0 0l-2-2m2 2l2-2" /></svg>,
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

  return {
    actionLoading,
    copiedId,
    confirmDialog,
    setConfirmDialog,
    confirmInput,
    setConfirmInput,
    handleRevoke,
    handleResetApp,
    handleResetQuiz,
    handleArchive,
    handleDelete,
    handleCopyLink,
    requireConfirm,
    getActions,
  };
}

export type UseInviteActionsReturn = ReturnType<typeof useInviteActions>;
