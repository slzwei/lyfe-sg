import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/app/staff/actions";
import { uploadCandidateDocument, deleteCandidateDocFiles } from "@/lib/supabase/storage";
import { addDocument } from "@/app/staff/candidates/actions";

const ALLOWED_LABELS = [
  "Resume", "RES5", "M5", "M9", "M9A", "HI", "M8", "M8A", "ComGI", "BCP", "PGI", "Other",
];

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (matches bucket config)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Magic byte signatures for server-side file type validation
const MAGIC_BYTES: Record<string, number[][]> = {
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
  "image/jpeg": [[0xFF, 0xD8, 0xFF]],
  "image/png": [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  "application/msword": [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [[0x50, 0x4B, 0x03, 0x04]],
};

function validateMagicBytes(buffer: Buffer, claimedType: string): boolean {
  const signatures = MAGIC_BYTES[claimedType];
  if (!signatures) return false;
  return signatures.some((sig) =>
    sig.every((byte, i) => buffer.length > i && buffer[i] === byte)
  );
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.{2,}/g, ".");
}

export async function POST(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const formData = await req.formData();
  const candidateId = formData.get("candidateId") as string;
  const label = formData.get("label") as string;
  const file = formData.get("file") as File | null;

  if (!candidateId || !label || !file) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (!UUID_RE.test(candidateId)) {
    return NextResponse.json({ error: "Invalid candidate ID." }, { status: 400 });
  }
  if (!ALLOWED_LABELS.includes(label)) {
    return NextResponse.json({ error: "Invalid document label." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PDF, JPEG, PNG, and Word documents are allowed." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File must be under 10 MB." }, { status: 400 });
  }

  // Upload to storage
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validateMagicBytes(buffer, file.type)) {
    return NextResponse.json({ error: "File content does not match declared type." }, { status: 400 });
  }
  const safeName = sanitizeFileName(file.name);
  const storagePath = await uploadCandidateDocument(candidateId, safeName, buffer, file.type);
  if (!storagePath) {
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }

  // Save metadata to candidate_documents table
  const result = await addDocument(candidateId, {
    label,
    fileName: safeName,
    fileUrl: storagePath,
  });

  if (!result.success) {
    await deleteCandidateDocFiles([storagePath]); // cleanup on failure
    return NextResponse.json({ error: result.error || "Failed to save document." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
