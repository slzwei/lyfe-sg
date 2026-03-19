import PDFDocument from "pdfkit";
import path from "path";

const PACIFICO_PATH = path.join(process.cwd(), "src/lib/fonts/Pacifico-Regular.ttf");

// ─── Types ──────────────────────────────────────────────────────────────────

interface EducationRow {
  qualification: string;
  institution: string;
  year_commenced?: string;
  year_completed?: string;
  expected_graduation?: string;
  remarks?: string;
}

interface LanguageRow {
  language: string;
  spoken: string;
  written: string;
}

interface EmploymentRow {
  from?: string;
  to?: string;
  is_current?: boolean;
  company?: string;
  position?: string;
  salary?: string;
  reason_leaving?: string;
}

export interface FullProfileData {
  full_name: string;
  position_applied: string;
  expected_salary: string;
  salary_period: string;
  date_available: string | null;
  date_of_birth: string | null;
  place_of_birth: string;
  nationality: string;
  race: string;
  gender: string;
  marital_status: string;
  address_block: string;
  address_street: string;
  address_unit: string | null;
  address_postal: string;
  contact_number: string;
  email: string;
  ns_enlistment_date: string | null;
  ns_ord_date: string | null;
  ns_service_status: string | null;
  ns_status: string | null;
  ns_exemption_reason: string | null;
  emergency_name: string;
  emergency_relationship: string;
  emergency_contact: string;
  education: EducationRow[];
  software_competencies: string | null;
  shorthand_wpm: number | null;
  typing_wpm: number | null;
  languages: LanguageRow[];
  employment_history: EmploymentRow[];
  additional_health: boolean;
  additional_health_detail: string | null;
  additional_dismissed: boolean;
  additional_dismissed_detail: string | null;
  additional_convicted: boolean;
  additional_convicted_detail: string | null;
  additional_bankrupt: boolean;
  additional_bankrupt_detail: string | null;
  additional_relatives: boolean;
  additional_relatives_detail: string | null;
  additional_prev_applied: boolean;
  additional_prev_applied_detail: string | null;
  declaration_agreed: boolean;
  declaration_date: string;
}

// ─── Colors & constants ─────────────────────────────────────────────────────

const ORANGE = "#f97316";
const DARK = "#2C2925";
const MUTED = "#8A857D";
const LIGHT_LINE = "#E5E2DD";
const MARGIN = 48;
const PAGE_W = 595.28; // A4
const CONTENT_W = PAGE_W - MARGIN * 2;

// ─── Helpers ────────────────────────────────────────────────────────────────

function val(v: string | number | null | undefined, fallback = "-"): string {
  if (v === null || v === undefined || v === "") return fallback;
  return String(v);
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function yesNo(v: boolean): string {
  return v ? "Yes" : "No";
}

// ─── PDF Builder ────────────────────────────────────────────────────────────

export async function generateProfilePdf(
  profile: FullProfileData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 48, bottom: 48, left: MARGIN, right: MARGIN },
      info: {
        Title: `Application - ${profile.full_name}`,
        Author: "Lyfe Candidate Portal",
      },
    });

    const chunks: Uint8Array[] = [];
    doc.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let y = doc.y;

    // ── Header ────────────────────────────────────────────────────────────
    doc.registerFont("Pacifico", PACIFICO_PATH);
    doc.font("Pacifico").fontSize(26).fillColor(ORANGE).text("Lyfe", MARGIN, y);
    doc.font("Helvetica"); // reset to default
    y = doc.y + 8;
    doc
      .moveTo(MARGIN, y)
      .lineTo(MARGIN + 28, y)
      .lineWidth(2)
      .strokeColor(ORANGE)
      .stroke();
    y += 20;

    doc
      .fontSize(9)
      .fillColor(MUTED)
      .text("CANDIDATE APPLICATION", MARGIN, y, { characterSpacing: 1.5 });
    y = doc.y + 6;
    doc.fontSize(18).fillColor(DARK).text(profile.full_name, MARGIN, y);
    y = doc.y + 4;
    doc
      .fontSize(10)
      .fillColor(MUTED)
      .text(
        `${profile.position_applied}  ·  Submitted ${new Date(profile.declaration_date).toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" })}`,
        MARGIN,
        y
      );
    y = doc.y + 16;

    // Thin line
    doc
      .moveTo(MARGIN, y)
      .lineTo(PAGE_W - MARGIN, y)
      .lineWidth(0.5)
      .strokeColor(LIGHT_LINE)
      .stroke();
    y += 20;

    // ── Helper: section header ────────────────────────────────────────────
    function sectionHeader(title: string) {
      if (y > 720) {
        doc.addPage();
        y = MARGIN;
      }
      doc
        .fontSize(9)
        .fillColor(MUTED)
        .text(title.toUpperCase(), MARGIN, y, { characterSpacing: 1.2 });
      y = doc.y + 10;
    }

    // ── Helper: key-value row ─────────────────────────────────────────────
    function row(label: string, value: string) {
      if (y > 750) {
        doc.addPage();
        y = MARGIN;
      }
      doc.fontSize(9).fillColor(MUTED).text(label, MARGIN, y, { width: 140 });
      const labelBottom = doc.y;
      doc
        .fontSize(10)
        .fillColor(DARK)
        .text(value, MARGIN + 145, y, { width: CONTENT_W - 145 });
      y = Math.max(labelBottom, doc.y) + 4;
    }

    function spacer(h = 16) {
      y += h;
    }

    // ── 1. Position & Availability ────────────────────────────────────────
    sectionHeader("Position & Availability");
    row("Position Applied", profile.position_applied);
    row(
      "Expected Salary",
      `$${profile.expected_salary} / ${profile.salary_period}`
    );
    row("Available From", fmtDate(profile.date_available));
    spacer();

    // ── 2. Personal Information ───────────────────────────────────────────
    sectionHeader("Personal Information");
    row("Full Name", profile.full_name);
    row("Date of Birth", fmtDate(profile.date_of_birth));
    row("Place of Birth", profile.place_of_birth);
    row("Nationality", profile.nationality);
    row("Race", profile.race);
    row("Gender", profile.gender);
    row("Marital Status", profile.marital_status);
    spacer();

    // ── 3. Address ────────────────────────────────────────────────────────
    sectionHeader("Address");
    const addrParts = [
      profile.address_unit ? `#${profile.address_unit}` : null,
      `Blk ${profile.address_block}`,
      profile.address_street,
      `Singapore ${profile.address_postal}`,
    ]
      .filter(Boolean)
      .join(", ");
    row("Address", addrParts);
    spacer();

    // ── 4. Contact ────────────────────────────────────────────────────────
    sectionHeader("Contact");
    row("Phone", profile.contact_number);
    row("Email", profile.email);
    spacer();

    // ── 5. NS (if applicable) ─────────────────────────────────────────────
    if (profile.ns_status || profile.ns_service_status) {
      sectionHeader("National Service");
      row("NS Status", val(profile.ns_status));
      row("Service Status", val(profile.ns_service_status));
      row("Enlistment Date", fmtDate(profile.ns_enlistment_date));
      row("ORD Date", fmtDate(profile.ns_ord_date));
      if (profile.ns_exemption_reason) {
        row("Exemption Reason", profile.ns_exemption_reason);
      }
      spacer();
    }

    // ── 6. Emergency Contact ──────────────────────────────────────────────
    sectionHeader("Emergency Contact");
    row("Name", profile.emergency_name);
    row("Relationship", profile.emergency_relationship);
    row("Contact", profile.emergency_contact);
    spacer();

    // ── 7. Education ──────────────────────────────────────────────────────
    const edu = (profile.education || []) as EducationRow[];
    if (edu.length > 0) {
      sectionHeader("Education");
      for (const e of edu) {
        if (y > 710) {
          doc.addPage();
          y = MARGIN;
        }
        doc.fontSize(10).fillColor(DARK).text(e.qualification, MARGIN, y);
        y = doc.y + 2;
        doc
          .fontSize(9)
          .fillColor(MUTED)
          .text(
            `${e.institution}  ·  ${val(e.year_commenced, "?")} - ${val(e.year_completed, "?")}`,
            MARGIN,
            y
          );
        if (e.expected_graduation) {
          y = doc.y + 2;
          doc
            .fontSize(9)
            .fillColor(MUTED)
            .text(`Expected graduation: ${e.expected_graduation}`, MARGIN, y);
        }
        if (e.remarks) {
          y = doc.y + 2;
          doc
            .fontSize(9)
            .fillColor(MUTED)
            .text(`Remarks: ${e.remarks}`, MARGIN, y);
        }
        y = doc.y + 10;
      }
      spacer(6);
    }

    // ── 8. Skills & Languages ─────────────────────────────────────────────
    sectionHeader("Skills & Languages");
    if (profile.software_competencies) {
      row("Software", profile.software_competencies);
    }
    if (profile.typing_wpm) {
      row("Typing", `${profile.typing_wpm} WPM`);
    }
    if (profile.shorthand_wpm) {
      row("Shorthand", `${profile.shorthand_wpm} WPM`);
    }

    const langs = (profile.languages || []) as LanguageRow[];
    if (langs.length > 0) {
      spacer(6);
      doc
        .fontSize(9)
        .fillColor(MUTED)
        .text("Languages", MARGIN, y, { underline: false });
      y = doc.y + 6;
      for (const l of langs) {
        if (y > 740) {
          doc.addPage();
          y = MARGIN;
        }
        doc
          .fontSize(10)
          .fillColor(DARK)
          .text(l.language, MARGIN, y, { continued: false });
        doc
          .fontSize(9)
          .fillColor(MUTED)
          .text(
            `Spoken: ${l.spoken}  ·  Written: ${l.written}`,
            MARGIN + 145,
            y
          );
        y = Math.max(doc.y, y + 14) + 2;
      }
    }
    spacer();

    // ── 9. Employment History ─────────────────────────────────────────────
    const jobs = (profile.employment_history || []) as EmploymentRow[];
    if (jobs.length > 0 && jobs.some((j) => j.company)) {
      sectionHeader("Employment History");
      for (const j of jobs) {
        if (!j.company) continue;
        if (y > 700) {
          doc.addPage();
          y = MARGIN;
        }
        doc
          .fontSize(10)
          .fillColor(DARK)
          .text(val(j.position, "Untitled role"), MARGIN, y);
        y = doc.y + 2;
        const period = j.is_current
          ? `${val(j.from, "?")} - Present`
          : `${val(j.from, "?")} - ${val(j.to, "?")}`;
        doc
          .fontSize(9)
          .fillColor(MUTED)
          .text(`${j.company}  ·  ${period}`, MARGIN, y);
        if (j.salary) {
          y = doc.y + 2;
          doc
            .fontSize(9)
            .fillColor(MUTED)
            .text(`Salary: $${j.salary}`, MARGIN, y);
        }
        if (j.reason_leaving) {
          y = doc.y + 2;
          doc
            .fontSize(9)
            .fillColor(MUTED)
            .text(`Reason for leaving: ${j.reason_leaving}`, MARGIN, y);
        }
        y = doc.y + 12;
      }
      spacer(4);
    }

    // ── 10. Additional Declarations ───────────────────────────────────────
    sectionHeader("Additional Declarations");
    function decl(label: string, value: boolean, detail: string | null) {
      row(label, yesNo(value));
      if (value && detail) {
        row("  Details", detail);
      }
    }
    decl("Health conditions", profile.additional_health, profile.additional_health_detail);
    decl("Previously dismissed", profile.additional_dismissed, profile.additional_dismissed_detail);
    decl("Criminal convictions", profile.additional_convicted, profile.additional_convicted_detail);
    decl("Bankruptcy", profile.additional_bankrupt, profile.additional_bankrupt_detail);
    decl("Relatives in company", profile.additional_relatives, profile.additional_relatives_detail);
    decl("Previously applied", profile.additional_prev_applied, profile.additional_prev_applied_detail);
    spacer();

    // ── 11. Declaration ───────────────────────────────────────────────────
    sectionHeader("Declaration");
    row("Agreed", yesNo(profile.declaration_agreed));
    row(
      "Date",
      new Date(profile.declaration_date).toLocaleDateString("en-SG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );

    // ── Footer line ───────────────────────────────────────────────────────
    y = doc.y + 20;
    if (y > 770) {
      doc.addPage();
      y = MARGIN;
    }
    doc
      .moveTo(MARGIN, y)
      .lineTo(PAGE_W - MARGIN, y)
      .lineWidth(0.5)
      .strokeColor(LIGHT_LINE)
      .stroke();
    y += 10;
    doc
      .fontSize(8)
      .fillColor(MUTED)
      .text("Lyfe Candidate Portal  -  Confidential", MARGIN, y);

    doc.end();
  });
}
