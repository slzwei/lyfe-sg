import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

const NOTIFY_TO = process.env.NOTIFY_EMAIL || "shawnleejob@gmail.com";
const NOTIFY_BCC = process.env.NOTIFY_BCC || "";

export async function POST(req: NextRequest) {
  // Verify service-role key
  const auth = req.headers.get("authorization");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { candidate_name, deleted_by } = body;

  if (!candidate_name) {
    return NextResponse.json({ error: "Missing candidate_name" }, { status: 400 });
  }

  const timestamp = new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Singapore",
  }).format(new Date());

  await sendEmail({
    to: NOTIFY_TO,
    bcc: NOTIFY_BCC || undefined,
    subject: `ALERT: Candidate "${candidate_name}" was deleted`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px;">
        <h2 style="color: #dc2626; margin-bottom: 8px;">Candidate Deleted</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 8px 12px; color: #78716c; font-size: 14px;">Candidate</td>
            <td style="padding: 8px 12px; font-weight: 600; font-size: 14px;">${candidate_name}</td>
          </tr>
          <tr style="background: #fafaf9;">
            <td style="padding: 8px 12px; color: #78716c; font-size: 14px;">Deleted by</td>
            <td style="padding: 8px 12px; font-weight: 600; font-size: 14px;">${deleted_by || "Unknown"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #78716c; font-size: 14px;">Time</td>
            <td style="padding: 8px 12px; font-size: 14px;">${timestamp}</td>
          </tr>
        </table>
        <p style="margin-top: 16px; font-size: 13px; color: #a8a29e;">
          You can restore this record from the <strong>Audit Log</strong> page on the staff portal.
        </p>
      </div>
    `,
  });

  return NextResponse.json({ success: true });
}
