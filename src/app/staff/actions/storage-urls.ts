"use server";

import { requireStaff } from "./auth";
import { getSignedPdfUrl, getSignedResumeUrl, getSignedDocUrl } from "@/lib/supabase/storage";

export async function getPdfUrl(filePath: string): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  const url = await getSignedPdfUrl(filePath);
  if (!url) return { success: false, error: "Failed to generate download URL." };

  return { success: true, url };
}

export async function getInviteFileUrl(storagePath: string): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  if (!storagePath.startsWith("invitations/")) {
    return { success: false, error: "Invalid file path." };
  }

  const url = await getSignedResumeUrl(storagePath);
  if (!url) return { success: false, error: "Failed to generate download URL." };

  return { success: true, url };
}

export async function getCandidateDocUrl(storagePath: string): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "Not authenticated." };

  if (!storagePath.startsWith("candidates/")) {
    return { success: false, error: "Invalid file path." };
  }

  const url = await getSignedDocUrl(storagePath);
  if (!url) return { success: false, error: "Failed to generate download URL." };

  return { success: true, url };
}
