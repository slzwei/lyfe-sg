"use client";

import { useState, useEffect, useCallback } from "react";
import { useRealtimeProgress } from "../hooks/useRealtimeProgress";
import { ProgressDisplay } from "../components/ProgressDisplay";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  listInvitations,
  getProgressForUser,
  getPdfUrl,
  backfillPdfs,
  getStaffUser,
  type Invitation,
} from "../actions";
import { listAssignableManagers, type AssignableManager } from "../candidates/actions";
import { useInviteForm } from "./hooks/useInviteForm";
import { useInviteActions } from "./hooks/useInviteActions";
import { SendInvitationForm } from "./components/SendInvitationForm";
import { CandidateList } from "./components/CandidateList";

export default function InviteClient() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staffRole, setStaffRole] = useState<string>("");
  const [assignableManagers, setAssignableManagers] = useState<AssignableManager[]>([]);

  const fetchInvitations = useCallback(async () => {
    const result = await listInvitations();
    if (result.success && result.data) {
      setInvitations(result.data);
    }
    setLoadingList(false);
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

  // Realtime progress tracking via shared hook
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

  // Fallback poll every 30s in case broadcast is missed
  useEffect(() => {
    const interval = setInterval(fetchInvitations, 30_000);
    return () => clearInterval(interval);
  }, [fetchInvitations]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchInvitations();
    setRefreshing(false);
  }

  // ─── Hooks ──────────────────────────────────────────────────────────────────

  const inviteForm = useInviteForm({ onRefresh: fetchInvitations });
  const inviteActions = useInviteActions({ onRefresh: fetchInvitations, staffRole });

  // ─── Helpers ────────────────────────────────────────────────────────────────

  async function handleDownloadPdf(path: string) {
    const result = await getPdfUrl(path);
    if (result.success && result.url) {
      window.open(result.url, "_blank");
    }
  }

  function progressDisplay(inv: Invitation) {
    return (
      <ProgressDisplay
        invitation={inv}
        liveState={inv.user_id ? liveStates[inv.user_id] : undefined}
        onDownloadDiscPdf={handleDownloadPdf}
      />
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 sm:space-y-8">
      <SendInvitationForm
        {...inviteForm}
        assignableManagers={assignableManagers}
        staffRole={staffRole}
      />

      <CandidateList
        invitations={invitations}
        loadingList={loadingList}
        live={live}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        getActions={inviteActions.getActions}
        actionLoading={inviteActions.actionLoading}
        progressDisplay={progressDisplay}
        onDownloadPdf={handleDownloadPdf}
      />

      {inviteActions.confirmDialog && (
        <ConfirmDialog
          dialog={inviteActions.confirmDialog}
          input={inviteActions.confirmInput}
          setInput={inviteActions.setConfirmInput}
          setDialog={inviteActions.setConfirmDialog}
        />
      )}
    </div>
  );
}
