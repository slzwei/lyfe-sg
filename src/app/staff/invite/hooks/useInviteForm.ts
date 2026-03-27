"use client";

import { useState, useRef } from "react";
import {
  sendInvite,
  removeInviteFile,
  getInviteFileUrl,
  type AttachedFile,
} from "../../actions";

interface UseInviteFormOptions {
  onRefresh: () => void;
}

export function useInviteForm({ onRefresh }: UseInviteFormOptions) {
  const [email, setEmail] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [position, setPosition] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [lastInvitationId, setLastInvitationId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadLabel, setUploadLabel] = useState<string>("Resume");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");

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
      onRefresh();
    } else {
      setMessage({ type: "error", text: result.error || "Failed to send." });
    }
    setSending(false);
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

  return {
    email,
    setEmail,
    candidateName,
    setCandidateName,
    position,
    setPosition,
    sending,
    message,
    setMessage,
    lastInvitationId,
    setLastInvitationId,
    attachedFiles,
    setAttachedFiles,
    uploading,
    uploadLabel,
    setUploadLabel,
    fileInputRef,
    selectedManagerId,
    setSelectedManagerId,
    handleSend,
    handleUploadFile,
    handleRemoveFile,
    handleDownloadInviteFile,
  };
}

export type UseInviteFormReturn = ReturnType<typeof useInviteForm>;
