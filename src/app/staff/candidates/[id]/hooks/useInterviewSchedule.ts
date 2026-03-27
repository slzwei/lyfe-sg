"use client";

import { useState } from "react";
import {
  listAssignableManagers,
  scheduleInterview,
  type AssignableManager,
} from "../../actions";

export interface ScheduleForm {
  managerId: string;
  datetime: string;
  type: "zoom" | "in_person";
  location: string;
  zoomLink: string;
}

export interface UseInterviewScheduleReturn {
  showSchedule: boolean;
  setShowSchedule: (show: boolean) => void;
  scheduleManagers: AssignableManager[];
  scheduleForm: ScheduleForm;
  setScheduleForm: React.Dispatch<React.SetStateAction<ScheduleForm>>;
  scheduling: boolean;
  scheduleError: string;
  handleOpenSchedule: () => Promise<void>;
  handleScheduleInterview: (e: React.FormEvent) => Promise<void>;
}

export function useInterviewSchedule(
  candidateId: string,
  onSuccess: () => void,
): UseInterviewScheduleReturn {
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleManagers, setScheduleManagers] = useState<AssignableManager[]>([]);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    managerId: "",
    datetime: "",
    type: "zoom",
    location: "",
    zoomLink: "",
  });
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  async function handleOpenSchedule() {
    setShowSchedule(true);
    setScheduleForm({ managerId: "", datetime: "", type: "zoom", location: "", zoomLink: "" });
    setScheduleError("");
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
  };
}
