"use client";

import { useState } from "react";
import Link from "next/link";
import {
  updateCandidate,
  listAssignableManagers,
  reassignCandidate,
  type AssignableManager,
} from "../actions";
import { getPdfUrl, getInviteFileUrl, getCandidateDocUrl } from "../../actions";
import { useCandidateDetail } from "./hooks/useCandidateDetail";
import { useDocumentUpload } from "./hooks/useDocumentUpload";
import { useInterviewSchedule } from "./hooks/useInterviewSchedule";
import ActivityTimeline from "./components/ActivityTimeline";
import DocumentsSidebar from "./components/DocumentsSidebar";
import InterviewsSection from "./components/InterviewsSection";
import ProfileDetails from "./components/ProfileDetails";

export default function CandidateDetailClient({ candidateId }: { candidateId: string }) {
  const {
    candidate,
    activities,
    documents,
    setDocuments,
    profile,
    interviews,
    staffRole,
    staffId,
    loading,
    error,
    editForm,
    setEditForm,
    isManagerPlus,
    canSchedule,
    refetch,
  } = useCandidateDetail(candidateId);

  // Edit mode
  const [editing, setEditing] = useState(false);

  // Reassign
  const [showReassign, setShowReassign] = useState(false);
  const [reassignManagers, setReassignManagers] = useState<AssignableManager[]>([]);
  const [reassignTarget, setReassignTarget] = useState("");
  const [reassigning, setReassigning] = useState(false);

  const uploadHook = useDocumentUpload(candidateId, refetch, setDocuments);
  const scheduleHook = useInterviewSchedule(candidateId, refetch);

  async function handleDownloadPdf(path: string) {
    const result = await getPdfUrl(path);
    if (result.success && result.url) window.open(result.url, "_blank");
  }

  async function handleDownloadDoc(fileUrl: string) {
    if (fileUrl.startsWith("invitations/")) {
      const result = await getInviteFileUrl(fileUrl);
      if (result.success && result.url) window.open(result.url, "_blank");
    } else if (fileUrl.startsWith("candidates/")) {
      const result = await getCandidateDocUrl(fileUrl);
      if (result.success && result.url) window.open(result.url, "_blank");
    } else {
      window.open(fileUrl, "_blank");
    }
  }

  async function handleSaveEdit() {
    await updateCandidate(candidateId, editForm);
    setEditing(false);
    refetch();
  }

  async function handleOpenReassign() {
    setShowReassign(true);
    setReassignTarget("");
    const result = await listAssignableManagers();
    if (result.success && result.managers) {
      setReassignManagers(result.managers);
    }
  }

  async function handleReassign() {
    if (!reassignTarget) return;
    setReassigning(true);
    const result = await reassignCandidate(candidateId, reassignTarget);
    setReassigning(false);
    if (result.success) {
      setShowReassign(false);
      refetch();
    }
  }

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 animate-pulse rounded bg-stone-100" />
            <div className="h-7 w-40 animate-pulse rounded-lg bg-stone-200" />
            <div className="h-5 w-10 animate-pulse rounded bg-purple-100" />
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-3.5 w-36 animate-pulse rounded bg-stone-100" />
            <div className="h-3.5 w-24 animate-pulse rounded bg-stone-100" />
          </div>
        </div>
        <div className="h-8 w-16 animate-pulse rounded-lg bg-stone-100" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="h-3 w-14 animate-pulse rounded bg-stone-100" />
            <div className="mt-2 h-4 w-20 animate-pulse rounded bg-stone-200" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="mb-3 h-4 w-28 animate-pulse rounded bg-stone-200" />
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-stone-50" />
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white">
          <div className="border-b border-stone-100 px-5 py-3">
            <div className="h-4 w-24 animate-pulse rounded bg-stone-200" />
          </div>
          <div className="divide-y divide-stone-50">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="h-3.5 w-24 animate-pulse rounded bg-stone-200" />
                  <div className="mt-1.5 h-3 w-32 animate-pulse rounded bg-stone-100" />
                </div>
                <div className="h-4 w-4 animate-pulse rounded bg-stone-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
  if (!candidate) return <div className="py-12 text-center text-sm text-red-500">{error}</div>;

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link href="/staff/candidates" className="shrink-0 text-stone-400 hover:text-stone-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="truncate text-xl font-bold text-stone-800 sm:text-2xl">{candidate.name}</h1>
            {candidate.disc_type && (
              <span className="shrink-0 rounded bg-purple-50 px-2 py-0.5 text-sm font-semibold text-purple-600">
                {candidate.disc_type}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-7 text-sm text-stone-400 sm:pl-0">
            {candidate.email && <span className="truncate">{candidate.email}</span>}
            <span>{candidate.phone}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-500 hover:bg-stone-100"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Name</label>
              <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="h-9 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-base outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Email</label>
              <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="h-9 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-base outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Phone</label>
              <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="h-9 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-base outline-none focus:border-orange-400" />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-stone-500">Notes</label>
            <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              rows={2} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-base outline-none focus:border-orange-400" />
          </div>
          <button onClick={handleSaveEdit} className="mt-3 rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-orange-600">Save</button>
        </div>
      )}

      {/* Status cards row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="text-xs text-stone-400">Position</div>
          <div className="mt-1 text-sm font-medium text-stone-700">{profile?.position_applied || "—"}</div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="text-xs text-stone-400">Application</div>
          <div className="mt-1 text-sm font-medium text-stone-700">{candidate.profile_completed ? "Completed" : "Pending"}</div>
        </div>
      </div>

      {/* Profile details */}
      {profile && <ProfileDetails profile={profile} />}

      {/* Interviews section */}
      <InterviewsSection
        interviews={interviews}
        candidateId={candidateId}
        scheduleHook={scheduleHook}
        staffRole={staffRole}
        onRefetch={refetch}
      />

      <div className="grid min-w-0 gap-6 lg:grid-cols-3">
        {/* Activity timeline (2/3) */}
        <ActivityTimeline
          activities={activities}
          candidateId={candidateId}
          staffId={staffId}
          staffRole={staffRole}
          onRefetch={refetch}
        />

        {/* Documents sidebar (1/3) */}
        <DocumentsSidebar
          candidate={candidate}
          documents={documents}
          uploadHook={uploadHook}
          onDownloadPdf={handleDownloadPdf}
          onDownloadDoc={handleDownloadDoc}
        />
      </div>
    </div>
  );
}
