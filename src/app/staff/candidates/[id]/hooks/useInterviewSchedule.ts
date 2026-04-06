"use client";

import { useState } from "react";
import {
  listAssignableManagers,
  scheduleInterview,
  rescheduleInterview,
  cancelInterview,
  type AssignableManager,
  type InterviewRecord,
} from "../../actions";

export interface ScheduleForm {
  managerId: string;
  datetime: string;
  type: "zoom" | "in_person";
  location: string;
  zoomLink: string;
}

export interface UseInterviewScheduleReturn {
  // Schedule
  showSchedule: boolean;
  setShowSchedule: (show: boolean) => void;
  scheduleManagers: AssignableManager[];
  scheduleForm: ScheduleForm;
  setScheduleForm: React.Dispatch<React.SetStateAction<ScheduleForm>>;
  scheduling: boolean;
  scheduleError: string;
  handleOpenSchedule: () => Promise<void>;
  handleScheduleInterview: (e: React.FormEvent) => Promise<void>;
  // Reschedule
  rescheduleTarget: InterviewRecord | null;
  rescheduleForm: ScheduleForm;
  setRescheduleForm: React.Dispatch<React.SetStateAction<ScheduleForm>>;
  rescheduling: boolean;
  rescheduleError: string;
  handleOpenReschedule: (interview: InterviewRecord) => void;
  handleCloseReschedule: () => void;
  handleRescheduleInterview: (e: React.FormEvent) => Promise<void>;
  // Cancel
  cancellingId: string | null;
  confirmCancelId: string | null;
  cancelError: string;
  handleConfirmCancel: (interviewId: string) => void;
  handleCancelInterview: (interviewId: string) => Promise<void>;
  handleDismissCancel: () => void;
}

const EMPTY_FORM: ScheduleForm = {
  managerId: "",
  datetime: "",
  type: "zoom",
  location: "",
  zoomLink: "",
};

export function useInterviewSchedule(
  candidateId: string,
  onSuccess: () => void,
): UseInterviewScheduleReturn {
  // ── Schedule state ──
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleManagers, setScheduleManagers] = useState<AssignableManager[]>([]);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(EMPTY_FORM);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  // ── Reschedule state ──
  const [rescheduleTarget, setRescheduleTarget] = useState<InterviewRecord | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState<ScheduleForm>(EMPTY_FORM);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");

  // ── Cancel state ──
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState("");

  // ── Schedule handlers ──

  async function handleOpenSchedule() {
    setShowSchedule(true);
    setScheduleForm(EMPTY_FORM);
    setScheduleError("");
    setRescheduleTarget(null); // close reschedule if open
    const result = await listAssignableManagers();
    if (result.success && result.managers) {
      setScheduleManagers(result.managers);
    }
  }

  async function handleScheduleInterview(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduleForm.managerId || !scheduleForm.datetime) {
      setScheduleError("Interviewer and date/time are required.");
      return;
    }
    setScheduling(true);
    setScheduleError("");
    const result = await scheduleInterview(candidateId, {
      managerId: scheduleForm.managerId,
      datetime: new Date(scheduleForm.datetime).toISOString(),
      type: scheduleForm.type,
      location: scheduleForm.location || undefined,
      zoomLink: scheduleForm.zoomLink || undefined,
    });
    setScheduling(false);
    if (result.success) {
      setShowSchedule(false);
      onSuccess();
    } else {
      setScheduleError(result.error || "Failed to schedule interview.");
    }
  }

  // ── Reschedule handlers ──

  function handleOpenReschedule(interview: InterviewRecord) {
    setShowSchedule(false); // close schedule form
    setRescheduleTarget(interview);
    setRescheduleError("");
    // Pre-fill from current interview values
    const dt = new Date(interview.datetime);
    // Format for datetime-local input: YYYY-MM-DDTHH:mm
    const pad = (n: number) => n.toString().padStart(2, "0");
    const localDt = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    setRescheduleForm({
      managerId: interview.manager_id,
      datetime: localDt,
      type: (interview.type as "zoom" | "in_person") || "zoom",
      location: interview.location || "",
      zoomLink: interview.zoom_link || "",
    });
  }

  function handleCloseReschedule() {
    setRescheduleTarget(null);
    setRescheduleError("");
  }

  async function handleRescheduleInterview(e: React.FormEvent) {
    e.preventDefault();
    if (!rescheduleTarget) return;
    if (!rescheduleForm.datetime) {
      setRescheduleError("Date/time is required.");
      return;
    }
    setRescheduling(true);
    setRescheduleError("");
    const result = await rescheduleInterview(rescheduleTarget.id, {
      datetime: new Date(rescheduleForm.datetime).toISOString(),
      type: rescheduleForm.type,
      location: rescheduleForm.location || undefined,
      zoomLink: rescheduleForm.zoomLink || undefined,
    });
    setRescheduling(false);
    if (result.success) {
      setRescheduleTarget(null);
      onSuccess();
    } else {
      setRescheduleError(result.error || "Failed to reschedule interview.");
    }
  }

  // ── Cancel handlers ──

  function handleConfirmCancel(interviewId: string) {
    setConfirmCancelId(interviewId);
    setCancelError("");
  }

  function handleDismissCancel() {
    setConfirmCancelId(null);
    setCancelError("");
  }

  async function handleCancelInterview(interviewId: string) {
    setCancellingId(interviewId);
    setCancelError("");
    const result = await cancelInterview(interviewId);
    setCancellingId(null);
    setConfirmCancelId(null);
    if (result.success) {
      onSuccess();
    } else {
      setCancelError(result.error || "Failed to cancel interview.");
    }
  }

  return {
    showSchedule,
    setShowSchedule,
    scheduleManagers,
    scheduleForm,
    setScheduleForm,
    scheduling,
    scheduleError,
    handleOpenSchedule,
    handleScheduleInterview,
    rescheduleTarget,
    rescheduleForm,
    setRescheduleForm,
    rescheduling,
    rescheduleError,
    handleOpenReschedule,
    handleCloseReschedule,
    handleRescheduleInterview,
    cancellingId,
    confirmCancelId,
    cancelError,
    handleConfirmCancel,
    handleCancelInterview,
    handleDismissCancel,
  };
}
