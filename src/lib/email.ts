import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { generateProfilePdf, generateDiscPdf, type FullProfileData, type DiscPdfData } from "./pdf";

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

// ─── HTML escaping (prevent XSS in email templates) ─────────────────────────

export function esc(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
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
            <td style="padding:32px 40px 0 40px;">
              <img src="https://lyfe.sg/email-logo.png" alt="Lyfe" width="120" style="display:block;border:0;height:auto;" />
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

// ─── Specialized: Invitation Email ───────────────────────────────────────────

interface InvitationEmailParams {
  email: string;
  candidateName?: string;
  position?: string;
  token: string;
}

export async function sendInvitationEmail({
  email,
  candidateName,
  position,
  token,
}: InvitationEmailParams) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lyfe.sg";
  const link = `${baseUrl}/candidate/login?token=${token}`;

  const greeting = candidateName
    ? `Hi ${esc(candidateName)},`
    : "Hi,";

  const positionLine = position
    ? `<p style="margin:0 0 20px 0;font-size:14px;color:#57534e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;">
        You&rsquo;ve been invited to apply for <strong>${esc(position)}</strong> at Lyfe.
      </p>`
    : `<p style="margin:0 0 20px 0;font-size:14px;color:#57534e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;">
        You&rsquo;ve been invited to apply at Lyfe.
      </p>`;

  const body = `
              <p style="margin:0 0 6px 0;font-size:15px;color:#2C2925;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:600;line-height:1.5;">
                ${greeting}
              </p>

              ${positionLine}

              <p style="margin:0 0 24px 0;font-size:14px;color:#57534e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;">
                Click the button below to start your application.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                <tr>
                  <td style="background-color:#ffffff;border-radius:10px;border:2px solid #f97316;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${link}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="20%" fillcolor="#ffffff" strokecolor="#f97316" strokeweight="2px">
                      <w:anchorlock/>
                      <center style="color:#f97316;font-family:sans-serif;font-size:15px;font-weight:bold;">Start Application &rarr;</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${link}" style="display:inline-block;padding:14px 32px;background-color:#ffffff;color:#f97316;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;">
                      Start Application &rarr;
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#A09B93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;">
                This link expires in 14 days. If you have any questions, reply to this email.
              </p>
  `;

  const subject = position
    ? `You're invited to apply for ${position} at Lyfe`
    : "You're invited to apply at Lyfe";

  return sendEmail({
    to: email,
    subject,
    html: wrapHtml(body),
    text: `${greeting} You've been invited to apply${position ? ` for ${position}` : ""} at Lyfe. Click here to start: ${link} — This link expires in 14 days.`,
  });
}

// ─── Specialized: Profile Submission ─────────────────────────────────────────

const NOTIFY_TO = process.env.NOTIFY_EMAIL;
const NOTIFY_BCC = process.env.NOTIFY_BCC;

function profileRow(label: string, value: string): string {
  return `
              <tr>
                <td style="padding:10px 0;font-size:13px;color:#A09B93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;vertical-align:top;width:130px;font-weight:400;letter-spacing:0.1px;">${label}</td>
                <td style="padding:10px 0;font-size:14px;color:#2C2925;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:500;">${value}</td>
              </tr>`;
}

export async function sendProfileSubmissionEmail(profile: FullProfileData) {
  if (!NOTIFY_TO) {
    console.warn("[email] Skipping profile email — NOTIFY_EMAIL env var not set");
    return;
  }
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
                ${esc(profile.full_name)}
              </p>

              <!-- Thin divider -->
              <div style="height:1px;background-color:#EEECE8;margin-bottom:4px;"></div>

              <!-- Details table -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                ${profileRow("Position", esc(profile.position_applied))}
                ${profileRow("Expected Salary", esc(`$${profile.expected_salary} / ${profile.salary_period}`))}
                ${profileRow("Available From", esc(profile.date_available || "Not specified"))}
                ${profileRow("Nationality", esc(profile.nationality))}
                ${profileRow("Phone", esc(profile.contact_number))}
                ${profileRow("Email", esc(profile.email))}
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
  angle: number;
  profile_strength: "strong" | "moderate" | "balanced";
  strength_pct: number;
  priorities: string[];
  results_email: string;
  contact_number: string;
  /** Pre-generated PDF buffer to attach instead of regenerating */
  pdfBuffer?: Buffer;
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
  if (!NOTIFY_TO) {
    console.warn("[email] Skipping DISC email — NOTIFY_EMAIL env var not set");
    return;
  }
  if (!result.full_name) {
    console.log("[email] Skipping DISC email — no candidate name");
    return;
  }

  const typeName = TYPE_NAMES[result.disc_type] || result.disc_type;
  const primaryDimension = result.disc_type.charAt(0).toUpperCase();
  const primaryColor = TYPE_COLORS[primaryDimension] || "#2C2925";
  const bgTint = `${primaryColor}08`;
  const borderTint = `${primaryColor}20`;

  const isBalanced = result.profile_strength === "balanced";

  const displayName = isBalanced ? "Balanced" : typeName;
  const displayColor = isBalanced ? "#78716c" : primaryColor; // stone-500 for balanced
  const displayBgTint = isBalanced ? "#f5f5f408" : bgTint;
  const displayBorderTint = isBalanced ? "#d6d3d120" : borderTint;

  console.log(
    `[email] Preparing DISC results email for ${result.full_name} (${typeName})`
  );

  // Import type info for email body content
  const { DISC_TYPE_INFO } = await import("@/app/candidate/disc-quiz/scoring");
  const typeInfo = DISC_TYPE_INFO[result.disc_type];
  const displayTypeInfo = isBalanced ? DISC_TYPE_INFO["Balanced"] : typeInfo;

  // Use pre-generated PDF if provided, otherwise generate one
  let pdfBuffer: Buffer | null = result.pdfBuffer || null;
  if (!pdfBuffer && typeInfo) {
    try {
      pdfBuffer = await generateDiscPdf({
        full_name: result.full_name,
        disc_type: result.disc_type,
        d_pct: result.d_pct,
        i_pct: result.i_pct,
        s_pct: result.s_pct,
        c_pct: result.c_pct,
        angle: result.angle,
        profile_strength: result.profile_strength,
        strength_pct: result.strength_pct,
        priorities: result.priorities,
        typeInfo: displayTypeInfo || typeInfo,
      });
      console.log(`[email] DISC PDF generated (${pdfBuffer.length} bytes)`);
    } catch (err) {
      console.error("[email] DISC PDF generation failed:", err);
    }
  }

  // Build descriptor pills HTML
  const descriptorPills = displayTypeInfo
    ? displayTypeInfo.descriptors
        .map(
          (d: string) =>
            `<span style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;color:${displayColor};background-color:${displayBgTint};border:1px solid ${displayBorderTint};margin:0 4px 4px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${d}</span>`
        )
        .join("")
    : "";

  // Build strengths list
  const strengthsList = displayTypeInfo
    ? displayTypeInfo.strengths
        .map(
          (s: string) =>
            `<tr><td style="padding:4px 0 4px 0;vertical-align:top;width:16px;"><span style="display:inline-block;width:6px;height:6px;border-radius:3px;background-color:#34d399;margin-top:5px;"></span></td><td style="padding:4px 0;font-size:12px;color:#065f46;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.5;">${s}</td></tr>`
        )
        .join("")
    : "";

  // Build blind spots list
  const blindSpotsList = displayTypeInfo
    ? displayTypeInfo.blindSpots
        .map(
          (b: string) =>
            `<tr><td style="padding:4px 0 4px 0;vertical-align:top;width:16px;"><span style="display:inline-block;width:6px;height:6px;border-radius:3px;background-color:#fbbf24;margin-top:5px;"></span></td><td style="padding:4px 0;font-size:12px;color:#92400e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.5;">${b}</td></tr>`
        )
        .join("")
    : "";

  const body = `
              <!-- Greeting -->
              <p style="margin:0 0 6px 0;font-size:15px;color:#2C2925;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:600;line-height:1.5;">
                New personality assessment completed.
              </p>
              <p style="margin:0 0 28px 0;font-size:13px;color:#A09B93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:400;line-height:1.5;">
                DISC profile results are ready for review.${pdfBuffer ? " Full report attached as PDF." : ""}
              </p>

              <!-- Hero card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:24px;background-color:${displayBgTint};border-radius:12px;border:1px solid ${displayBorderTint};">
                    <!-- Candidate name -->
                    <p style="margin:0 0 4px 0;font-size:22px;color:#2C2925;font-family:'Georgia','Times New Roman',serif;font-weight:normal;line-height:1.3;letter-spacing:-0.3px;">
                      ${esc(result.full_name)}
                    </p>

                    <!-- DISC type -->
                    <p style="margin:0 0 2px 0;font-size:18px;color:${displayColor};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:700;letter-spacing:0.3px;">
                      ${displayName}
                    </p>
                    ${isBalanced ? `
                    <p style="margin:4px 0 0 0;font-size:11px;color:#A09B93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                      Closest style: ${typeName}
                    </p>` : ""}

                    ${displayTypeInfo ? `
                    <!-- Motto -->
                    <p style="margin:0 0 12px 0;font-size:13px;color:#A09B93;font-family:'Georgia','Times New Roman',serif;font-style:italic;">
                      &ldquo;${displayTypeInfo.motto}&rdquo;
                    </p>

                    <!-- Descriptor pills -->
                    <div style="margin:0 0 0 0;">
                      ${descriptorPills}
                    </div>

                    <!-- Strength indicator -->
                    <p style="margin:8px 0 0 0;font-size:11px;color:${displayColor};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:500;">
                      ${result.profile_strength === "strong" ? "\u25CF\u25CF\u25CF Strong inclination" : result.profile_strength === "moderate" ? "\u25CF\u25CF\u25CB Moderate inclination" : "\u25CB\u25CB\u25CB Balanced profile"}
                    </p>
                    ` : ""}
                  </td>
                </tr>
              </table>

              ${displayTypeInfo ? `
              <!-- Description -->
              <p style="margin:20px 0 0 0;font-size:13px;color:#57534e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;">
                ${displayTypeInfo.description}
              </p>
              ` : ""}

              <!-- Thin divider -->
              <div style="height:1px;background-color:#EEECE8;margin:24px 0 4px 0;"></div>

              <!-- Contact info -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                ${discInfoRow("Phone", result.contact_number)}
                ${discInfoRow("Email", result.results_email || "Not provided")}
              </table>

              <!-- Score section -->
              <p style="margin:28px 0 16px 0;font-size:11px;color:#A09B93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-transform:uppercase;letter-spacing:1px;font-weight:600;">
                Style Tendencies
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                ${scoreBar("Drive", result.d_pct, "D")}
                ${scoreBar("Influence", result.i_pct, "I")}
                ${scoreBar("Support", result.s_pct, "S")}
                ${scoreBar("Clarity", result.c_pct, "C")}
              </table>

              <!-- Priorities -->
              <p style="margin:28px 0 12px 0;font-size:11px;color:#A09B93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-transform:uppercase;letter-spacing:1px;font-weight:600;">
                Priorities
              </p>
              <p style="margin:0 0 4px 0;font-size:12px;color:#57534e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;">
                ${result.priorities.slice(0, 3).join("  \u00B7  ")}
              </p>
              ${result.priorities.length > 3 ? `
              <p style="margin:0;font-size:11px;color:#A09B93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                Also: ${result.priorities.slice(3).join(", ")}
              </p>` : ""}

              ${displayTypeInfo ? `
              <!-- Strengths & Blind Spots -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:28px;">
                <tr>
                  <td width="48%" style="vertical-align:top;padding-right:8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#ecfdf5;border-radius:8px;border:1px solid #d1fae5;">
                      <tr>
                        <td style="padding:14px 16px 4px 16px;">
                          <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#059669;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                            Strengths
                          </p>
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                            ${strengthsList}
                          </table>
                        </td>
                      </tr>
                      <tr><td style="height:10px;"></td></tr>
                    </table>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="vertical-align:top;padding-left:8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#fffbeb;border-radius:8px;border:1px solid #fef3c7;">
                      <tr>
                        <td style="padding:14px 16px 4px 16px;">
                          <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#d97706;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                            Blind Spots
                          </p>
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                            ${blindSpotsList}
                          </table>
                        </td>
                      </tr>
                      <tr><td style="height:10px;"></td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              ` : ""}

              ${pdfBuffer ? `
              <!-- PDF note -->
              <p style="margin:24px 0 0 0;font-size:12px;color:#A09B93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;font-style:italic;">
                Full personality profile report with diagram attached as PDF.
              </p>
              ` : ""}

  `;

  const attachments = pdfBuffer
    ? [
        {
          filename: `${result.full_name.replace(/\s+/g, "_")}_DISC_Profile.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ]
    : undefined;

  const subjectType = isBalanced ? `Balanced (closest: ${typeName})` : `${typeName} (${result.disc_type})`;

  await sendEmail({
    to: NOTIFY_TO,
    bcc: NOTIFY_BCC,
    subject: `DISC Result: ${result.full_name} — ${subjectType}`,
    html: wrapHtml(body),
    text: `DISC quiz completed by ${result.full_name}. Type: ${typeName}. D:${result.d_pct}% I:${result.i_pct}% S:${result.s_pct}% C:${result.c_pct}%`,
    attachments,
  });

  // Send results to the candidate if they provided an email
  if (result.results_email) {
    const candidateBody = `
              <p style="margin:0 0 6px 0;font-size:15px;color:#2C2925;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:600;line-height:1.5;">
                Hi ${esc(result.full_name)}, here are your DISC results!
              </p>
              <p style="margin:0 0 28px 0;font-size:13px;color:#A09B93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:400;line-height:1.5;">
                Thank you for completing the personality assessment.${pdfBuffer ? " Your full report is attached as a PDF." : ""}
              </p>

              <!-- Hero card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:24px;background-color:${displayBgTint};border-radius:12px;border:1px solid ${displayBorderTint};">
                    <p style="margin:0 0 2px 0;font-size:18px;color:${displayColor};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:700;letter-spacing:0.3px;">
                      ${displayName}
                    </p>
                    ${isBalanced ? `
                    <p style="margin:4px 0 0 0;font-size:11px;color:#A09B93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                      Closest style: ${typeName}
                    </p>` : ""}

                    ${displayTypeInfo ? `
                    <p style="margin:0 0 12px 0;font-size:13px;color:#A09B93;font-family:'Georgia','Times New Roman',serif;font-style:italic;">
                      &ldquo;${displayTypeInfo.motto}&rdquo;
                    </p>
                    <div style="margin:0 0 0 0;">
                      ${descriptorPills}
                    </div>
                    ` : ""}
                  </td>
                </tr>
              </table>

              ${displayTypeInfo ? `
              <p style="margin:20px 0 0 0;font-size:13px;color:#57534e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;">
                ${displayTypeInfo.description}
              </p>
              ` : ""}

              <!-- Score section -->
              <p style="margin:28px 0 16px 0;font-size:11px;color:#A09B93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-transform:uppercase;letter-spacing:1px;font-weight:600;">
                Your Style Tendencies
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                ${scoreBar("Drive", result.d_pct, "D")}
                ${scoreBar("Influence", result.i_pct, "I")}
                ${scoreBar("Support", result.s_pct, "S")}
                ${scoreBar("Clarity", result.c_pct, "C")}
              </table>

              ${displayTypeInfo ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:28px;">
                <tr>
                  <td width="48%" style="vertical-align:top;padding-right:8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#ecfdf5;border-radius:8px;border:1px solid #d1fae5;">
                      <tr>
                        <td style="padding:14px 16px 4px 16px;">
                          <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#059669;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                            Strengths
                          </p>
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                            ${strengthsList}
                          </table>
                        </td>
                      </tr>
                      <tr><td style="height:10px;"></td></tr>
                    </table>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="vertical-align:top;padding-left:8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#fffbeb;border-radius:8px;border:1px solid #fef3c7;">
                      <tr>
                        <td style="padding:14px 16px 4px 16px;">
                          <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#d97706;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                            Blind Spots
                          </p>
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                            ${blindSpotsList}
                          </table>
                        </td>
                      </tr>
                      <tr><td style="height:10px;"></td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              ` : ""}

              ${pdfBuffer ? `
              <p style="margin:24px 0 0 0;font-size:12px;color:#A09B93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;font-style:italic;">
                Full personality profile report attached as PDF.
              </p>
              ` : ""}
    `;

    await sendEmail({
      to: result.results_email,
      subject: `Your DISC Personality Profile — ${displayName}`,
      html: wrapHtml(candidateBody),
      text: `Hi ${result.full_name}, your DISC personality type is ${displayName}. D:${result.d_pct}% I:${result.i_pct}% S:${result.s_pct}% C:${result.c_pct}%`,
      attachments,
    });
  }
}

// ─── Specialized: Candidate Assigned ─────────────────────────────────────────

interface CandidateAssignedEmailParams {
  to: string;
  managerName: string;
  candidateName: string;
  assignedBy?: string;
  candidateId: string;
}

export async function sendCandidateAssignedEmail({
  to,
  managerName,
  candidateName,
  assignedBy,
  candidateId,
}: CandidateAssignedEmailParams) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lyfe.sg";
  const link = `${baseUrl}/staff/candidates/${candidateId}`;

  const assignedLine = assignedBy
    ? ` by <strong>${esc(assignedBy)}</strong>`
    : "";

  const body = `
              <p style="margin:0 0 6px 0;font-size:15px;color:#2C2925;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:600;line-height:1.5;">
                Hi ${esc(managerName)},
              </p>

              <p style="margin:0 0 20px 0;font-size:14px;color:#57534e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;">
                <strong>${esc(candidateName)}</strong> has been assigned to you${assignedLine}.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                <tr>
                  <td style="background-color:#ffffff;border-radius:10px;border:2px solid #f97316;">
                    <a href="${link}" style="display:inline-block;padding:14px 32px;background-color:#ffffff;color:#f97316;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;">
                      View Candidate &rarr;
                    </a>
                  </td>
                </tr>
              </table>
  `;

  return sendEmail({
    to,
    subject: `New candidate assigned: ${candidateName}`,
    html: wrapHtml(body),
    text: `Hi ${managerName}, ${candidateName} has been assigned to you${assignedBy ? ` by ${assignedBy}` : ""}. View: ${link}`,
  });
}

// ─── Specialized: Candidate Reassigned ───────────────────────────────────────

interface CandidateReassignedEmailParams {
  to: string;
  managerName: string;
  candidateName: string;
  newManagerName: string;
  reassignedBy: string;
  candidateId: string;
}

export async function sendCandidateReassignedEmail({
  to,
  managerName,
  candidateName,
  newManagerName,
  reassignedBy,
  candidateId,
}: CandidateReassignedEmailParams) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lyfe.sg";
  const link = `${baseUrl}/staff/candidates/${candidateId}`;

  const body = `
              <p style="margin:0 0 6px 0;font-size:15px;color:#2C2925;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:600;line-height:1.5;">
                Hi ${esc(managerName)},
              </p>

              <p style="margin:0 0 20px 0;font-size:14px;color:#57534e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;">
                <strong>${esc(candidateName)}</strong> has been reassigned to <strong>${esc(newManagerName)}</strong> by <strong>${esc(reassignedBy)}</strong>.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                <tr>
                  <td style="background-color:#ffffff;border-radius:10px;border:2px solid #f97316;">
                    <a href="${link}" style="display:inline-block;padding:14px 32px;background-color:#ffffff;color:#f97316;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;">
                      View Candidate &rarr;
                    </a>
                  </td>
                </tr>
              </table>
  `;

  return sendEmail({
    to,
    subject: `Candidate reassigned: ${esc(candidateName)}`,
    html: wrapHtml(body),
    text: `Hi ${managerName}, ${candidateName} has been reassigned to ${newManagerName} by ${reassignedBy}. View: ${link}`,
  });
}
