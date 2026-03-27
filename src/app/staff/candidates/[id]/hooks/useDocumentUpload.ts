"use client";

import { useState } from "react";
import { deleteDocument, type CandidateDocument } from "../../actions";

export interface UseDocumentUploadReturn {
  showUpload: boolean;
  setShowUpload: (show: boolean) => void;
  uploadLabel: string;
  setUploadLabel: (label: string) => void;
  uploadFile: File | null;
  setUploadFile: (file: File | null) => void;
  uploading: boolean;
  uploadError: string;
  deletingDocId: string | null;
  handleUploadDoc: (e: React.FormEvent) => Promise<void>;
  handleDeleteDoc: (docId: string) => Promise<void>;
}

export function useDocumentUpload(
  candidateId: string,
  onSuccess: () => void,
  setDocuments: React.Dispatch<React.SetStateAction<CandidateDocument[]>>,
): UseDocumentUploadReturn {
  const [showUpload, setShowUpload] = useState(false);
  const [uploadLabel, setUploadLabel] = useState("Resume");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  async function handleUploadDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("candidateId", candidateId);
    formData.append("label", uploadLabel);
    formData.append("file", uploadFile);

    const res = await fetch("/api/upload-candidate-doc", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok || !data.success) {
      setUploadError(data.error || "Upload failed.");
    } else {
      setShowUpload(false);
      setUploadFile(null);
      setUploadLabel("Resume");
      onSuccess();
    }
    setUploading(false);
  }

  async function handleDeleteDoc(docId: string) {
    if (!confirm("Delete this document?")) return;
    setDeletingDocId(docId);
    const result = await deleteDocument(docId);
    if (result.success) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    }
    setDeletingDocId(null);
  }

  return {
    showUpload,
    setShowUpload,
    uploadLabel,
    setUploadLabel,
    uploadFile,
    setUploadFile,
    uploading,
    uploadError,
    deletingDocId,
    handleUploadDoc,
    handleDeleteDoc,
  };
}
