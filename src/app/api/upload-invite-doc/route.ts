import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/app/staff/actions";
import { getAdminClient } from "@/lib/supabase/admin";
import { uploadInviteDocument, deleteResumeFiles } from "@/lib/supabase/storage";

const ALLOWED_LABELS = [
  "Resume", "RES5", "M5", "M9", "M9A", "HI", "M8", "M8A", "ComGI", "BCP", "PGI", "Other",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 20;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.{2,}/g, ".");
}

export async function POST(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const formData = await req.formData();
  const invitationId = formData.get("invitationId") as string;
  const label = formData.get("label") as string;
  const file = formData.get("file") as File | null;

  if (!invitationId || !label || !file) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (!UUID_RE.test(invitationId)) {
    return NextResponse.json({ error: "Invalid invitation ID." }, { status: 400 });
  }
  if (!ALLOWED_LABELS.includes(label)) {
    return NextResponse.json({ error: "Invalid document label." }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File must be under 5 MB." }, { status: 400 });
  }

  const admin = getAdminClient();

  // Verify invitation exists and staff is authorized
  const { data: invitation } = await admin
    .from("invitations")
    .select("id, invited_by_user_id")
    .eq("id", invitationId)
    .single();

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  }

  // Only the inviting staff or managers+ can attach files
  const isOwner = staff.id === invitation.invited_by_user_id;
  const isManager = ["manager", "director", "admin"].includes(staff.role);
  if (!isOwner && !isManager) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  // Upload to storage
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!PDF_MAGIC.every((byte, i) => buffer.length > i && buffer[i] === byte)) {
    return NextResponse.json({ error: "File is not a valid PDF." }, { status: 400 });
  }
  const safeName = sanitizeFileName(file.name);
  const storagePath = await uploadInviteDocument(invitationId, safeName, buffer);
  if (!storagePath) {
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }

  // Atomic append via RPC (row-locked to prevent concurrent overwrites)
  const newEntry = { label, file_name: safeName, storage_path: storagePath };
  const { error: rpcErr } = await admin.rpc("append_invitation_file", {
    p_invitation_id: invitationId,
    p_file: newEntry,
    p_max_files: MAX_FILES,
  });

  if (rpcErr) {
    await deleteResumeFiles([storagePath]); // best-effort cleanup
    if (rpcErr.message?.includes("max_files_exceeded")) {
      return NextResponse.json({ error: `Maximum ${MAX_FILES} files allowed.` }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save file metadata." }, { status: 500 });
  }

  return NextResponse.json({ success: true, file: newEntry });
}
