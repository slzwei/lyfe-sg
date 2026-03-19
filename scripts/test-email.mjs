/**
 * Test script: sends both redesigned email templates via Ethereal
 * with PDF attachment on the profile email.
 *
 * Usage: node scripts/test-email.mjs
 */
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";

// ─── Full sample data (all fields) ─────────────────────────────────────────

const sampleProfile = {
  full_name: "Sarah Chen",
  position_applied: "Senior UX Designer",
  expected_salary: "5,800",
  salary_period: "month",
  date_available: "2026-04-01",
  date_of_birth: "1995-06-15",
  place_of_birth: "Singapore",
  nationality: "Singaporean",
  race: "Chinese",
  gender: "Female",
  marital_status: "Single",
  address_block: "123",
  address_street: "Orchard Road",
  address_unit: "08-15",
  address_postal: "238888",
  contact_number: "+6591234567",
  email: "sarah.chen@email.com",
  ns_status: null,
  ns_service_status: null,
  ns_enlistment_date: null,
  ns_ord_date: null,
  ns_exemption_reason: null,
  emergency_name: "David Chen",
  emergency_relationship: "Father",
  emergency_contact: "+6598765432",
  education: [
    {
      qualification: "Bachelor of Design (Honours)",
      institution: "National University of Singapore",
      year_commenced: "2013",
      year_completed: "2017",
      remarks: "First Class Honours",
    },
    {
      qualification: "GCE 'A' Level",
      institution: "Raffles Junior College",
      year_commenced: "2011",
      year_completed: "2012",
    },
  ],
  software_competencies: "Figma, Sketch, Adobe Creative Suite, HTML/CSS, Protopie",
  shorthand_wpm: null,
  typing_wpm: 85,
  languages: [
    { language: "English", spoken: "Excellent", written: "Excellent" },
    { language: "Mandarin", spoken: "Good", written: "Fair" },
  ],
  employment_history: [
    {
      from: "2022-01",
      to: null,
      is_current: true,
      company: "Grab Holdings",
      position: "UX Designer",
      salary: "5,200",
      reason_leaving: "Seeking new challenges",
    },
    {
      from: "2019-06",
      to: "2021-12",
      is_current: false,
      company: "Shopee Pte Ltd",
      position: "Junior UX Designer",
      salary: "3,800",
      reason_leaving: "Career growth",
    },
    {
      from: "2017-07",
      to: "2019-05",
      is_current: false,
      company: "DBS Bank",
      position: "Design Intern / Associate Designer",
      salary: "2,800",
      reason_leaving: "End of contract",
    },
  ],
  additional_health: false,
  additional_health_detail: null,
  additional_dismissed: false,
  additional_dismissed_detail: null,
  additional_convicted: false,
  additional_convicted_detail: null,
  additional_bankrupt: false,
  additional_bankrupt_detail: null,
  additional_relatives: false,
  additional_relatives_detail: null,
  additional_prev_applied: true,
  additional_prev_applied_detail: "Applied for Visual Designer role in January 2024",
  declaration_agreed: true,
  declaration_date: new Date().toISOString(),
};

const sampleDisc = {
  full_name: "Sarah Chen",
  disc_type: "Is",
  d_pct: 18,
  i_pct: 42,
  s_pct: 28,
  c_pct: 12,
  results_email: "sarah.chen@email.com",
  contact_number: "+65 9123 4567",
};

// ─── PDF Generator (mirrors src/lib/pdf.ts) ────────────────────────────────

const ORANGE = "#f97316";
const DARK = "#2C2925";
const MUTED = "#8A857D";
const LIGHT_LINE = "#E5E2DD";
const PDF_MARGIN = 48;
const PAGE_W = 595.28;
const CONTENT_W = PAGE_W - PDF_MARGIN * 2;

function fmtDate(val) {
  if (!val) return "-";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" });
}

function v(val, fallback = "-") {
  if (val === null || val === undefined || val === "") return fallback;
  return String(val);
}

function yesNo(val) {
  return val ? "Yes" : "No";
}

function generateProfilePdf(profile) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 48, bottom: 48, left: PDF_MARGIN, right: PDF_MARGIN },
      info: {
        Title: `Application - ${profile.full_name}`,
        Author: "Lyfe Candidate Portal",
      },
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let y = doc.y;

    // Header
    const pacificoPath = new URL("../src/lib/fonts/Pacifico-Regular.ttf", import.meta.url).pathname;
    doc.registerFont("Pacifico", pacificoPath);
    doc.font("Pacifico").fontSize(26).fillColor(ORANGE).text("Lyfe", PDF_MARGIN, y);
    doc.font("Helvetica");
    y = doc.y + 8;
    doc.moveTo(PDF_MARGIN, y).lineTo(PDF_MARGIN + 28, y).lineWidth(2).strokeColor(ORANGE).stroke();
    y += 20;

    doc.fontSize(9).fillColor(MUTED).text("CANDIDATE APPLICATION", PDF_MARGIN, y, { characterSpacing: 1.5 });
    y = doc.y + 6;
    doc.fontSize(18).fillColor(DARK).text(profile.full_name, PDF_MARGIN, y);
    y = doc.y + 4;
    doc.fontSize(10).fillColor(MUTED).text(
      `${profile.position_applied}  ·  Submitted ${new Date(profile.declaration_date).toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" })}`,
      PDF_MARGIN, y
    );
    y = doc.y + 16;
    doc.moveTo(PDF_MARGIN, y).lineTo(PAGE_W - PDF_MARGIN, y).lineWidth(0.5).strokeColor(LIGHT_LINE).stroke();
    y += 20;

    function sectionHeader(title) {
      if (y > 720) { doc.addPage(); y = PDF_MARGIN; }
      doc.fontSize(9).fillColor(MUTED).text(title.toUpperCase(), PDF_MARGIN, y, { characterSpacing: 1.2 });
      y = doc.y + 10;
    }

    function row(label, value) {
      if (y > 750) { doc.addPage(); y = PDF_MARGIN; }
      doc.fontSize(9).fillColor(MUTED).text(label, PDF_MARGIN, y, { width: 140 });
      const labelBottom = doc.y;
      doc.fontSize(10).fillColor(DARK).text(value, PDF_MARGIN + 145, y, { width: CONTENT_W - 145 });
      y = Math.max(labelBottom, doc.y) + 4;
    }

    function spacer(h = 16) { y += h; }

    // Sections
    sectionHeader("Position & Availability");
    row("Position Applied", profile.position_applied);
    row("Expected Salary", `$${profile.expected_salary} / ${profile.salary_period}`);
    row("Available From", fmtDate(profile.date_available));
    spacer();

    sectionHeader("Personal Information");
    row("Full Name", profile.full_name);
    row("Date of Birth", fmtDate(profile.date_of_birth));
    row("Place of Birth", profile.place_of_birth);
    row("Nationality", profile.nationality);
    row("Race", profile.race);
    row("Gender", profile.gender);
    row("Marital Status", profile.marital_status);
    spacer();

    sectionHeader("Address");
    const addrParts = [
      profile.address_unit ? `#${profile.address_unit}` : null,
      `Blk ${profile.address_block}`,
      profile.address_street,
      `Singapore ${profile.address_postal}`,
    ].filter(Boolean).join(", ");
    row("Address", addrParts);
    spacer();

    sectionHeader("Contact");
    row("Phone", profile.contact_number);
    row("Email", profile.email);
    spacer();

    if (profile.ns_status || profile.ns_service_status) {
      sectionHeader("National Service");
      row("NS Status", v(profile.ns_status));
      row("Service Status", v(profile.ns_service_status));
      row("Enlistment Date", v(profile.ns_enlistment_date));
      row("ORD Date", v(profile.ns_ord_date));
      if (profile.ns_exemption_reason) row("Exemption Reason", profile.ns_exemption_reason);
      spacer();
    }

    sectionHeader("Emergency Contact");
    row("Name", profile.emergency_name);
    row("Relationship", profile.emergency_relationship);
    row("Contact", profile.emergency_contact);
    spacer();

    const edu = profile.education || [];
    if (edu.length > 0) {
      sectionHeader("Education");
      for (const e of edu) {
        if (y > 710) { doc.addPage(); y = PDF_MARGIN; }
        doc.fontSize(10).fillColor(DARK).text(e.qualification, PDF_MARGIN, y);
        y = doc.y + 2;
        doc.fontSize(9).fillColor(MUTED).text(`${e.institution}  ·  ${v(e.year_commenced, "?")} - ${v(e.year_completed, "?")}`, PDF_MARGIN, y);
        if (e.expected_graduation) { y = doc.y + 2; doc.fontSize(9).fillColor(MUTED).text(`Expected graduation: ${e.expected_graduation}`, PDF_MARGIN, y); }
        if (e.remarks) { y = doc.y + 2; doc.fontSize(9).fillColor(MUTED).text(`Remarks: ${e.remarks}`, PDF_MARGIN, y); }
        y = doc.y + 10;
      }
      spacer(6);
    }

    sectionHeader("Skills & Languages");
    if (profile.software_competencies) row("Software", profile.software_competencies);
    if (profile.typing_wpm) row("Typing", `${profile.typing_wpm} WPM`);
    if (profile.shorthand_wpm) row("Shorthand", `${profile.shorthand_wpm} WPM`);

    const langs = profile.languages || [];
    if (langs.length > 0) {
      spacer(6);
      doc.fontSize(9).fillColor(MUTED).text("Languages", PDF_MARGIN, y);
      y = doc.y + 6;
      for (const l of langs) {
        if (y > 740) { doc.addPage(); y = PDF_MARGIN; }
        doc.fontSize(10).fillColor(DARK).text(l.language, PDF_MARGIN, y);
        doc.fontSize(9).fillColor(MUTED).text(`Spoken: ${l.spoken}  ·  Written: ${l.written}`, PDF_MARGIN + 145, y);
        y = Math.max(doc.y, y + 14) + 2;
      }
    }
    spacer();

    const jobs = profile.employment_history || [];
    if (jobs.length > 0 && jobs.some((j) => j.company)) {
      sectionHeader("Employment History");
      for (const j of jobs) {
        if (!j.company) continue;
        if (y > 700) { doc.addPage(); y = PDF_MARGIN; }
        doc.fontSize(10).fillColor(DARK).text(v(j.position, "Untitled role"), PDF_MARGIN, y);
        y = doc.y + 2;
        const period = j.is_current ? `${v(j.from, "?")} - Present` : `${v(j.from, "?")} - ${v(j.to, "?")}`;
        doc.fontSize(9).fillColor(MUTED).text(`${j.company}  ·  ${period}`, PDF_MARGIN, y);
        if (j.salary) { y = doc.y + 2; doc.fontSize(9).fillColor(MUTED).text(`Salary: $${j.salary}`, PDF_MARGIN, y); }
        if (j.reason_leaving) { y = doc.y + 2; doc.fontSize(9).fillColor(MUTED).text(`Reason for leaving: ${j.reason_leaving}`, PDF_MARGIN, y); }
        y = doc.y + 12;
      }
      spacer(4);
    }

    sectionHeader("Additional Declarations");
    function decl(label, value, detail) {
      row(label, yesNo(value));
      if (value && detail) row("  Details", detail);
    }
    decl("Health conditions", profile.additional_health, profile.additional_health_detail);
    decl("Previously dismissed", profile.additional_dismissed, profile.additional_dismissed_detail);
    decl("Criminal convictions", profile.additional_convicted, profile.additional_convicted_detail);
    decl("Bankruptcy", profile.additional_bankrupt, profile.additional_bankrupt_detail);
    decl("Relatives in company", profile.additional_relatives, profile.additional_relatives_detail);
    decl("Previously applied", profile.additional_prev_applied, profile.additional_prev_applied_detail);
    spacer();

    sectionHeader("Declaration");
    row("Agreed", yesNo(profile.declaration_agreed));
    row("Date", new Date(profile.declaration_date).toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" }));

    y = doc.y + 20;
    if (y > 770) { doc.addPage(); y = PDF_MARGIN; }
    doc.moveTo(PDF_MARGIN, y).lineTo(PAGE_W - PDF_MARGIN, y).lineWidth(0.5).strokeColor(LIGHT_LINE).stroke();
    y += 10;
    doc.fontSize(8).fillColor(MUTED).text("Lyfe Candidate Portal  -  Confidential", PDF_MARGIN, y);

    doc.end();
  });
}

// ─── Email HTML builders ────────────────────────────────────────────────────

function wrapHtml(body) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>@import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');</style>
</head>
<body style="margin:0;padding:0;background-color:#FAF9F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FAF9F7;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border:1px solid #EEECE8;border-radius:12px;">
          <tr>
            <td style="padding:36px 40px 0 40px;">
              <span style="font-family:'Pacifico','Georgia',cursive;font-size:26px;font-weight:normal;color:#f97316;letter-spacing:1px;">Lyfe</span>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 40px 0 40px;">
              <div style="width:32px;height:2px;background-color:#f97316;border-radius:1px;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 40px 40px;">
              ${body}
            </td>
          </tr>
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
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function profileRow(label, value) {
  return `
    <tr>
      <td style="padding:10px 0;font-size:13px;color:#A09B93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;vertical-align:top;width:130px;font-weight:400;letter-spacing:0.1px;">${label}</td>
      <td style="padding:10px 0;font-size:14px;color:#2C2925;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:500;">${value}</td>
    </tr>`;
}

function buildProfileHtml(profile) {
  const body = `
    <p style="margin:0 0 6px 0;font-size:15px;color:#2C2925;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:600;line-height:1.5;">
      A new candidate just applied.
    </p>
    <p style="margin:0 0 28px 0;font-size:13px;color:#A09B93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:400;line-height:1.5;">
      Here are their details at a glance. Full application attached.
    </p>
    <p style="margin:0 0 24px 0;font-size:22px;color:#2C2925;font-family:'Georgia','Times New Roman',serif;font-weight:normal;line-height:1.3;letter-spacing:-0.3px;">
      ${profile.full_name}
    </p>
    <div style="height:1px;background-color:#EEECE8;margin-bottom:4px;"></div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      ${profileRow("Position", profile.position_applied)}
      ${profileRow("Expected Salary", `$${profile.expected_salary} / ${profile.salary_period}`)}
      ${profileRow("Available From", profile.date_available || "Not specified")}
      ${profileRow("Nationality", profile.nationality)}
      ${profileRow("Phone", profile.contact_number)}
      ${profileRow("Email", profile.email)}
    </table>
`;
  return wrapHtml(body);
}

const TYPE_NAMES = {
  D: "Drive", I: "Influence", S: "Support", C: "Clarity",
  Di: "Drive/influence", Dc: "Drive/clarity", Id: "Influence/drive",
  Is: "Influence/support", Si: "Support/influence", Sc: "Support/clarity",
  Cs: "Clarity/support", Cd: "Clarity/drive",
};
const TYPE_COLORS = { D: "#2B8C8C", I: "#7B5EA7", S: "#D4876C", C: "#4A7FB5" };
const TRACK_COLORS = { D: "#E6F3F3", I: "#F0EBF5", S: "#FAF0EC", C: "#E9F0F7" };

function scoreBar(label, pct, dimension) {
  const color = TYPE_COLORS[dimension] || "#999";
  const track = TRACK_COLORS[dimension] || "#F2F0ED";
  return `
    <tr>
      <td style="padding:8px 0;font-size:12px;color:#A09B93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;width:70px;vertical-align:middle;letter-spacing:0.2px;font-weight:400;">
        ${label}
      </td>
      <td style="padding:8px 0;vertical-align:middle;">
        <div style="width:100%;height:8px;background-color:${track};border-radius:4px;overflow:hidden;">
          <div style="width:${pct}%;height:8px;background-color:${color};border-radius:4px;"></div>
        </div>
      </td>
      <td style="padding:8px 0 8px 12px;font-size:13px;color:#2C2925;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;width:42px;text-align:right;vertical-align:middle;font-weight:600;">
        ${pct}%
      </td>
    </tr>`;
}

function discInfoRow(label, value) {
  return `
    <tr>
      <td style="padding:10px 0;font-size:13px;color:#A09B93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;vertical-align:top;width:130px;font-weight:400;letter-spacing:0.1px;">${label}</td>
      <td style="padding:10px 0;font-size:14px;color:#2C2925;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:500;">${value}</td>
    </tr>`;
}

function buildDiscHtml(result) {
  const typeName = TYPE_NAMES[result.disc_type] || result.disc_type;
  const primaryDimension = result.disc_type.charAt(0).toUpperCase();
  const primaryColor = TYPE_COLORS[primaryDimension] || "#2C2925";
  const body = `
    <p style="margin:0 0 6px 0;font-size:15px;color:#2C2925;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:600;line-height:1.5;">
      New personality assessment completed.
    </p>
    <p style="margin:0 0 28px 0;font-size:13px;color:#A09B93;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:400;line-height:1.5;">
      DISC profile results are ready for review.
    </p>
    <p style="margin:0 0 4px 0;font-size:22px;color:#2C2925;font-family:'Georgia','Times New Roman',serif;font-weight:normal;line-height:1.3;letter-spacing:-0.3px;">
      ${result.full_name}
    </p>
    <p style="margin:0 0 24px 0;font-size:14px;color:${primaryColor};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:600;letter-spacing:0.3px;">
      ${typeName} <span style="font-weight:400;color:#A09B93;">(${result.disc_type})</span>
    </p>
    <div style="height:1px;background-color:#EEECE8;margin-bottom:4px;"></div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      ${discInfoRow("Phone", result.contact_number)}
      ${discInfoRow("Email", result.results_email || "Not provided")}
    </table>
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
  return wrapHtml(body);
}

// ─── Send via Ethereal ──────────────────────────────────────────────────────

async function main() {
  console.log("Creating Ethereal test account...\n");
  const testAccount = await nodemailer.createTestAccount();

  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });

  // Generate PDF
  console.log("Generating PDF...");
  const pdfBuffer = await generateProfilePdf(sampleProfile);
  console.log(`PDF generated (${pdfBuffer.length} bytes)\n`);

  // Also save a local copy for inspection
  const fs = await import("fs");
  fs.writeFileSync("scripts/test-application.pdf", pdfBuffer);
  console.log("PDF saved to scripts/test-application.pdf\n");

  // Email 1: Profile Submission (with PDF attachment)
  const profileHtml = buildProfileHtml(sampleProfile);
  const profileResult = await transporter.sendMail({
    from: '"Lyfe" <noreply@lyfe.sg>',
    to: "shawnleejob@gmail.com",
    subject: `New Application: ${sampleProfile.full_name} — ${sampleProfile.position_applied}`,
    html: profileHtml,
    attachments: [
      {
        filename: `${sampleProfile.full_name.replace(/\s+/g, "_")}_Application.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });

  console.log("--- Profile Submission Email (with PDF) ---");
  console.log("Preview URL:", nodemailer.getTestMessageUrl(profileResult));
  console.log("");

  // Email 2: DISC Results (no PDF)
  const discHtml = buildDiscHtml(sampleDisc);
  const discResult = await transporter.sendMail({
    from: '"Lyfe" <noreply@lyfe.sg>',
    to: "shawnleejob@gmail.com",
    subject: `DISC Result: ${sampleDisc.full_name} — Influence/support (Is)`,
    html: discHtml,
  });

  console.log("--- DISC Results Email ---");
  console.log("Preview URL:", nodemailer.getTestMessageUrl(discResult));
  console.log("");
  console.log("Open the preview URLs in your browser to see the emails.");
  console.log("Open scripts/test-application.pdf to inspect the PDF locally.");
}

main().catch(console.error);
