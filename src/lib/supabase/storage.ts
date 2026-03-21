import { getAdminClient } from "./admin";

const BUCKET = "candidate-pdfs";

/**
 * Upload a candidate PDF to Supabase Storage and return the file path.
 * Uses upsert so re-submissions overwrite the previous file.
 */
export async function uploadCandidatePdf(
  userId: string,
  type: "application" | "disc-profile",
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
