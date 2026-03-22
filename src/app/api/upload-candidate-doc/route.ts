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
  const storagePath = await uploadCandidateDocument(candidateId, file.name, buffer, file.type);
  if (!storagePath) {
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }

  // Save metadata to candidate_documents table
  const result = await addDocument(candidateId, {
    label,
    fileName: file.name,
    fileUrl: storagePath,
  });

  if (!result.success) {
    await deleteCandidateDocFiles([storagePath]); // cleanup on failure
    return NextResponse.json({ error: result.error || "Failed to save document." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
