"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getCandidate,
  getInterviews,
  type CandidateDetail,
  type CandidateProfile,
  type Activity,
  type CandidateDocument,
  type InterviewRecord,
} from "../../actions";

export function useCandidateDetail(candidateId: string) {
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [documents, setDocuments] = useState<CandidateDocument[]>([]);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [staffRole, setStaffRole] = useState<string>("");
  const [staffId, setStaffId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", notes: "" });

  const isManagerPlus = staffRole && ["manager", "director", "admin"].includes(staffRole);
  const canSchedule = staffRole && ["pa", "manager", "director", "admin"].includes(staffRole);

  const fetchData = useCallback(async () => {
    const [candidateResult, interviewsResult] = await Promise.all([
      getCandidate(candidateId),
      getInterviews(candidateId),
    ]);
    if (candidateResult.success && candidateResult.candidate) {
      setCandidate(candidateResult.candidate);
      setActivities(candidateResult.activities || []);
      setDocuments(candidateResult.documents || []);
      setProfile(candidateResult.profile || null);
      setStaffRole(candidateResult.staffRole || "");
      setStaffId(candidateResult.staffId || "");
      setEditForm({
        name: candidateResult.candidate.name,
        email: candidateResult.candidate.email || "",
        phone: candidateResult.candidate.phone,
        notes: candidateResult.candidate.notes || "",
      });
    } else {
      setError(candidateResult.error || "Not found.");
    }
    if (interviewsResult.success) {
      setInterviews(interviewsResult.interviews || []);
    }
    setLoading(false);
  }, [candidateId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return {
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
    refetch: fetchData,
  };
}
