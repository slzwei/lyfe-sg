import { getAdminClient } from "./admin";

const BUCKET = "candidate-pdfs";
const RESUMES_BUCKET = "candidate-resumes";
const DOCS_BUCKET = "candidate-documents";

/**
 * Upload a candidate PDF to Supabase Storage and return the file path.
 * Uses upsert so re-submissions overwrite the previous file.
 */
export async function uploadCandidatePdf(
  userId: string,
  type: "application" | "disc-profile" | "enneagram-profile",
  pdfBuffer: Buffer
): Promise<string | null> {
  const admin = getAdminClient();
  const filePath = `${userId}/${type}.pdf`;

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(filePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    console.error(`[storage] Failed to upload ${type} PDF:`, error);
    return null;
  }

  console.log(`[storage] Uploaded ${type} PDF (${pdfBuffer.length} bytes)`);
  return filePath;
}

/**
 * Create a short-lived signed URL for staff to download a candidate PDF.
 */
export async function getSignedPdfUrl(
  filePath: string,
  expiresIn = 300
): Promise<string | null> {
  const admin = getAdminClient();

  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    console.error("[storage] Failed to create signed URL:", error);
    return null;
  }

  return data.signedUrl;
}

// ─── Candidate Resumes Bucket ─────────────────────────────────────────────

/**
 * Upload a document to the candidate-resumes bucket.
 * At invite time, files go under invitations/{invitationId}/docs/{timestamp}_{filename}
 */
export async function uploadInviteDocument(
  invitationId: string,
  fileName: string,
  fileBuffer: Buffer
): Promise<string | null> {
  const admin = getAdminClient();
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `invitations/${invitationId}/docs/${timestamp}_${safeName}`;

  const { error } = await admin.storage
    .from(RESUMES_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) {
    console.error("[storage] Failed to upload invite doc:", error);
    return null;
  }

  return storagePath;
}

/**
 * Create a signed URL for a file in the candidate-resumes bucket.
 */
export async function getSignedResumeUrl(
  filePath: string,
  expiresIn = 300
): Promise<string | null> {
  const admin = getAdminClient();
  const { data, error } = await admin.storage
    .from(RESUMES_BUCKET)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    console.error("[storage] Failed to create resume signed URL:", error);
    return null;
  }

  return data.signedUrl;
}

// ─── Candidate Documents Bucket ──────────────────────────────────────────

/**
 * Upload a document to the candidate-documents bucket.
 * Path: candidates/{candidateId}/{timestamp}_{filename}
 */
export async function uploadCandidateDocument(
  candidateId: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<string | null> {
  const admin = getAdminClient();
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `candidates/${candidateId}/${timestamp}_${safeName}`;

  const { error } = await admin.storage
    .from(DOCS_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    console.error("[storage] Failed to upload candidate doc:", error);
    return null;
  }

  return storagePath;
}

/**
 * Create a signed URL for a file in the candidate-documents bucket.
 */
export async function getSignedDocUrl(
  filePath: string,
  expiresIn = 300
): Promise<string | null> {
  const admin = getAdminClient();
  const { data, error } = await admin.storage
    .from(DOCS_BUCKET)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    console.error("[storage] Failed to create doc signed URL:", error);
    return null;
  }

  return data.signedUrl;
}

/**
 * Delete files from the candidate-documents bucket.
 */
export async function deleteCandidateDocFiles(paths: string[]): Promise<boolean> {
  if (paths.length === 0) return true;
  const admin = getAdminClient();
  const { error } = await admin.storage.from(DOCS_BUCKET).remove(paths);

  if (error) {
    console.error("[storage] Failed to delete candidate doc files:", error);
    return false;
  }
  return true;
}

/**
 * Delete files from the candidate-pdfs bucket.
 */
export async function deletePdfFiles(paths: string[]): Promise<boolean> {
  if (paths.length === 0) return true;
  const admin = getAdminClient();
  const { error } = await admin.storage.from(BUCKET).remove(paths);

  if (error) {
    console.error("[storage] Failed to delete PDF files:", error);
    return false;
  }
  return true;
}

/**
 * Delete files from the candidate-resumes bucket.
 */
export async function deleteResumeFiles(paths: string[]): Promise<boolean> {
  if (paths.length === 0) return true;
  const admin = getAdminClient();
  const { error } = await admin.storage.from(RESUMES_BUCKET).remove(paths);

  if (error) {
    console.error("[storage] Failed to delete resume files:", error);
    return false;
  }
  return true;
}
