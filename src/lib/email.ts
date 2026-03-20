import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { generateProfilePdf, type FullProfileData } from "./pdf";

// ─── Transporter (cached) ────────────────────────────────────────────────────

let _transporter: Transporter | null = null;
let _configured = false;

function getTransporter(): Transporter | null {
  if (_transporter) return _transporter;

  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || "587", 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (!host || !user || !pass) {
    _configured = false;
    return null;
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  _configured = true;
  return _transporter;
}

function getFrom(): string {
  return process.env.EMAIL_FROM || process.env.EMAIL_USER || "noreply@lyfe.sg";
}

// ─── HTML template wrapper ───────────────────────────────────────────────────

function wrapHtml(body: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

</head>
<body style="margin:0;padding:0;background-color:#FAF9F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FAF9F7;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border:1px solid #EEECE8;border-radius:12px;">
          <!--[if mso]><tr><td><![endif]-->

          <!-- Header: Wordmark + accent line -->
          <tr>
            <td style="padding:36px 40px 0 40px;">
              <img src="https://lyfe.sg/email-logo.png" alt="Lyfe" width="120" height="50" style="display:block;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:14px 40px 0 40px;">
              <div style="width:32px;height:2px;background-color:#f97316;border-radius:1px;"></div>
            </td>
          </tr>

          <!-- Body content -->
          <tr>
            <td style="padding:28px 40px 40px 40px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background-color:#EEECE8;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 28px 40px;">
              <p style="margin:0;font-size:11px;color:#B8B3AA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;letter-spacing:0.2px;">
                Lyfe Candidate Portal &middot; Automated notification
              </p>
            </td>
          </tr>

          <!--[if mso]></td></tr><![endif]-->
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Core sendEmail ──────────────────────────────────────────────────────────

interface Attachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

interface SendEmailParams {
  to: string;
  bcc?: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Attachment[];
}

export async function sendEmail({
  to,
  bcc,
  subject,
  html,
  text,
  attachments,
}: SendEmailParams): Promise<{ success: boolean; message?: string }> {
  const transporter = getTransporter();

  if (!transporter || !_configured) {
    console.log("[email] Mailer not configured. Would have sent:");
    console.log(`  To: ${to}${bcc ? `, Bcc: ${bcc}` : ""}`);
    console.log(`  Subject: ${subject}`);
    if (text) console.log(`  Body: ${text.slice(0, 200)}...`);
    return { success: false, message: "Mailer not configured" };
  }

  try {
    console.log(`[email] Sending to ${to}${bcc ? ` (bcc: ${bcc})` : ""}: "${subject}"`);
    await transporter.sendMail({
      from: getFrom(),
      to,
      bcc,
      subject,
      html,
      text,
      attachments,
    });
    console.log(`[email] Sent successfully to ${to}`);
    return { success: true };
  } catch (error) {
    console.error(`[email] Failed to send to ${to}:`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Send failed",
    };
  }
}

// ─── Specialized: Profile Submission ─────────────────────────────────────────

const NOTIFY_TO = "shawnleejob@gmail.com";
const NOTIFY_BCC = "";

function profileRow(label: string, value: string): string {
  return `
              <tr>
                <td style="padding:10px 0;font-size:13px;color:#A09B93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;vertical-align:top;width:130px;font-weight:400;letter-spacing:0.1px;">${label}</td>
                <td style="padding:10px 0;font-size:14px;color:#2C2925;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:500;">${value}</td>
              </tr>`;
}

export async function sendProfileSubmissionEmail(profile: FullProfileData) {
  if (!profile.full_name) {
    console.log("[email] Skipping profile email — no candidate name");
    return;
  }

  console.log(
    `[email] Preparing profile submission email for ${profile.full_name}`
  );

  // Generate PDF attachment
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generateProfilePdf(profile);
    console.log(`[email] PDF generated (${pdfBuffer.length} bytes)`);
  } catch (err) {
    console.error("[email] PDF generation failed:", err);
  }

  const body = `
              <!-- Greeting -->
              <p style="margin:0 0 6px 0;font-size:15px;color:#2C2925;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:600;line-height:1.5;">
                A new candidate just applied.
              </p>
              <p style="margin:0 0 28px 0;font-size:13px;color:#A09B93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:400;line-height:1.5;">
                Here are their details at a glance.${pdfBuffer ? " Full application attached." : ""}
              </p>

              <!-- Candidate name highlight -->
              <p style="margin:0 0 24px 0;font-size:22px;color:#2C2925;font-family:'Georgia','Times New Roman',serif;font-weight:normal;line-height:1.3;letter-spacing:-0.3px;">
                ${profile.full_name}
              </p>

              <!-- Thin divider -->
              <div style="height:1px;background-color:#EEECE8;margin-bottom:4px;"></div>

              <!-- Details table -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                ${profileRow("Position", profile.position_applied)}
                ${profileRow("Expected Salary", `$${profile.expected_salary} / ${profile.salary_period}`)}
                ${profileRow("Available From", profile.date_available || "Not specified")}
                ${profileRow("Nationality", profile.nationality)}
                ${profileRow("Phone", profile.contact_number)}
                ${profileRow("Email", profile.email)}
              </table>

  `;

  const attachments = pdfBuffer
    ? [
        {
          filename: `${profile.full_name.replace(/\s+/g, "_")}_Application.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ]
    : undefined;

  await sendEmail({
    to: NOTIFY_TO,
    bcc: NOTIFY_BCC,
    subject: `New Application: ${profile.full_name} — ${profile.position_applied}`,
    html: wrapHtml(body),
    text: `New candidate application from ${profile.full_name} for ${profile.position_applied}. Phone: ${profile.contact_number}, Email: ${profile.email}`,
    attachments,
  });
}

// ─── Specialized: DISC Results ───────────────────────────────────────────────

interface DiscResultData {
  full_name: string;
  disc_type: string;
  d_pct: number;
  i_pct: number;
  s_pct: number;
  c_pct: number;
  results_email: string;
  contact_number: string;
}

const TYPE_NAMES: Record<string, string> = {
  D: "Drive",
  I: "Influence",
  S: "Support",
  C: "Clarity",
  Di: "Drive/influence",
  Dc: "Drive/clarity",
  Id: "Influence/drive",
  Is: "Influence/support",
  Si: "Support/influence",
  Sc: "Support/clarity",
  Cs: "Clarity/support",
  Cd: "Clarity/drive",
};

const TYPE_COLORS: Record<string, string> = {
  D: "#2B8C8C",
  I: "#7B5EA7",
  S: "#D4876C",
  C: "#4A7FB5",
};

/*
 * Score bars use a table-based layout for email client compatibility.
 * The bar itself is an outer table cell (track) with an inner colored cell (fill).
 * Height: 8px, fully rounded via border-radius.
 * Soft pastel track backgrounds derived from each DISC color.
 */
const TRACK_COLORS: Record<string, string> = {
  D: "#E6F3F3",
  I: "#F0EBF5",
  S: "#FAF0EC",
  C: "#E9F0F7",
};

function scoreBar(label: string, pct: number, dimension: string): string {
  const color = TYPE_COLORS[dimension] || "#999";
  const track = TRACK_COLORS[dimension] || "#F2F0ED";

  return `
              <tr>
                <td style="padding:8px 0;font-size:12px;color:#A09B93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;width:70px;vertical-align:middle;letter-spacing:0.2px;font-weight:400;">
                  ${label}
                </td>
                <td style="padding:8px 0;vertical-align:middle;">
                  <!--[if mso]>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
                    <td width="${pct}%" style="background:${color};height:8px;font-size:0;line-height:0;">&nbsp;</td>
                    <td width="${100 - pct}%" style="background:${track};height:8px;font-size:0;line-height:0;">&nbsp;</td>
                  </tr></table>
                  <![endif]-->
                  <!--[if !mso]><!-->
                  <div style="width:100%;height:8px;background-color:${track};border-radius:4px;overflow:hidden;">
                    <div style="width:${pct}%;height:8px;background-color:${color};border-radius:4px;"></div>
                  </div>
                  <!--<![endif]-->
                </td>
                <td style="padding:8px 0 8px 12px;font-size:13px;color:#2C2925;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;width:42px;text-align:right;vertical-align:middle;font-weight:600;">
                  ${pct}%
                </td>
              </tr>`;
}

function discInfoRow(label: string, value: string): string {
  return `
              <tr>
                <td style="padding:10px 0;font-size:13px;color:#A09B93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;vertical-align:top;width:130px;font-weight:400;letter-spacing:0.1px;">${label}</td>
                <td style="padding:10px 0;font-size:14px;color:#2C2925;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:500;">${value}</td>
              </tr>`;
}

export async function sendDiscResultsEmail(result: DiscResultData) {
  if (!result.full_name) {
    console.log("[email] Skipping DISC email — no candidate name");
    return;
  }

  const typeName = TYPE_NAMES[result.disc_type] || result.disc_type;
  const primaryDimension = result.disc_type.charAt(0).toUpperCase();
  const primaryColor = TYPE_COLORS[primaryDimension] || "#2C2925";

  console.log(
    `[email] Preparing DISC results email for ${result.full_name} (${typeName})`
  );

  const body = `
              <!-- Greeting -->
              <p style="margin:0 0 6px 0;font-size:15px;color:#2C2925;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:600;line-height:1.5;">
                New personality assessment completed.
              </p>
              <p style="margin:0 0 28px 0;font-size:13px;color:#A09B93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:400;line-height:1.5;">
                DISC profile results are ready for review.
              </p>

              <!-- Candidate name -->
              <p style="margin:0 0 4px 0;font-size:22px;color:#2C2925;font-family:'Georgia','Times New Roman',serif;font-weight:normal;line-height:1.3;letter-spacing:-0.3px;">
                ${result.full_name}
              </p>

              <!-- DISC type label -->
              <p style="margin:0 0 24px 0;font-size:14px;color:${primaryColor};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:600;letter-spacing:0.3px;">
                ${typeName} <span style="font-weight:400;color:#A09B93;">(${result.disc_type})</span>
              </p>

              <!-- Thin divider -->
              <div style="height:1px;background-color:#EEECE8;margin-bottom:4px;"></div>

              <!-- Contact info -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                ${discInfoRow("Phone", result.contact_number)}
                ${discInfoRow("Email", result.results_email || "Not provided")}
              </table>

              <!-- Score section -->
              <p style="margin:28px 0 16px 0;font-size:11px;color:#A09B93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-transform:uppercase;letter-spacing:1px;font-weight:600;">
                Score Breakdown
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                ${scoreBar("Drive", result.d_pct, "D")}
                ${scoreBar("Influence", result.i_pct, "I")}
                ${scoreBar("Support", result.s_pct, "S")}
                ${scoreBar("Clarity", result.c_pct, "C")}
              </table>

  `;

  await sendEmail({
    to: NOTIFY_TO,
    bcc: NOTIFY_BCC,
    subject: `DISC Result: ${result.full_name} — ${typeName} (${result.disc_type})`,
    html: wrapHtml(body),
    text: `DISC quiz completed by ${result.full_name}. Type: ${typeName}. D:${result.d_pct}% I:${result.i_pct}% S:${result.s_pct}% C:${result.c_pct}%`,
  });
}
