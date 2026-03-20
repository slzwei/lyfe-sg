import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

// Pre-read the font as a Buffer so it works on Vercel serverless
const PACIFICO_FONT = fs.readFileSync(
  path.join(process.cwd(), "src/lib/fonts/Pacifico-Regular.ttf")
);

// ─── Types ──────────────────────────────────────────────────────────────────

interface EducationData {
  currently_studying: boolean;
  current_qualification?: string;
  current_institution?: string;
  current_year_commenced?: string;
  current_expected_end_date?: string;
  highest_qualification: string;
  highest_institution: string;
  highest_year_completed: string;
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
  education: EducationData;
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
    doc.registerFont("Pacifico", PACIFICO_FONT);
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
    const edu = profile.education as EducationData | undefined;
    if (edu) {
      sectionHeader("Education");

      // Currently studying
      if (edu.currently_studying && edu.current_qualification) {
        if (y > 710) {
          doc.addPage();
          y = MARGIN;
        }
        doc
          .fontSize(10)
          .fillColor(DARK)
          .text(`Currently Studying: ${edu.current_qualification}`, MARGIN, y);
        y = doc.y + 2;
        const currentLine = [
          edu.current_institution,
          edu.current_year_commenced
            ? `From ${edu.current_year_commenced}`
            : null,
          edu.current_expected_end_date
            ? `Expected completion: ${edu.current_expected_end_date}`
            : null,
        ]
          .filter(Boolean)
          .join("  ·  ");
        doc.fontSize(9).fillColor(MUTED).text(currentLine, MARGIN, y);
        y = doc.y + 10;
      }

      // Highest attained
      if (edu.highest_qualification) {
        if (y > 710) {
          doc.addPage();
          y = MARGIN;
        }
        doc
          .fontSize(10)
          .fillColor(DARK)
          .text(
            `Highest Attained: ${edu.highest_qualification}`,
            MARGIN,
            y
          );
        y = doc.y + 2;
        const highestLine = [
          edu.highest_institution,
          edu.highest_year_completed
            ? `Completed ${edu.highest_year_completed}`
            : null,
        ]
          .filter(Boolean)
          .join("  ·  ");
        doc.fontSize(9).fillColor(MUTED).text(highestLine, MARGIN, y);
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
    function decl(question: string, value: boolean, detail: string | null) {
      if (y > 720) {
        doc.addPage();
        y = MARGIN;
      }
      // Question text — full width, muted
      doc
        .fontSize(9)
        .fillColor(MUTED)
        .text(question, MARGIN, y, { width: CONTENT_W });
      y = doc.y + 3;
      // Answer — bold color
      const answer = yesNo(value) + (value && detail ? ` — ${detail}` : "");
      doc
        .fontSize(10)
        .fillColor(DARK)
        .text(answer, MARGIN + 12, y, { width: CONTENT_W - 12 });
      y = doc.y + 10;
    }
    decl("Have you been or are you suffering from any disease / illness / major medical condition / mental disorder or physical impairment?", profile.additional_health, profile.additional_health_detail);
    decl("Have you been discharged or dismissed from the service of your previous employer/s?", profile.additional_dismissed, profile.additional_dismissed_detail);
    decl("Have you been convicted in a court of law in any country?", profile.additional_convicted, profile.additional_convicted_detail);
    decl("Have you ever been served with a garnishee order or been declared a bankrupt?", profile.additional_bankrupt, profile.additional_bankrupt_detail);
    decl("Do you have any relatives currently employed by the Company?", profile.additional_relatives, profile.additional_relatives_detail);
    decl("Have you previously applied for employment with the Company?", profile.additional_prev_applied, profile.additional_prev_applied_detail);
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

// ─── DISC Result Types ──────────────────────────────────────────────────────

export interface DiscPdfData {
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
  typeInfo: {
    fullName: string;
    motto: string;
    descriptors: string[];
    description: string;
    strengths: string[];
    blindSpots: string[];
  };
}

const DISC_COLORS: Record<string, string> = {
  D: "#2B8C8C",
  I: "#7B5EA7",
  S: "#D4876C",
  C: "#4A7FB5",
};

const DISC_LABELS: Record<string, string> = {
  D: "Drive",
  I: "Influence",
  S: "Support",
  C: "Clarity",
};

const DISC_DESCS: Record<string, string> = {
  D: "Decisive, competitive, results-oriented",
  I: "Enthusiastic, optimistic, people-oriented",
  S: "Patient, reliable, team-oriented",
  C: "Analytical, precise, quality-focused",
};

const PRIORITY_DEFS: { name: string; angle: number; dimension: string }[] = [
  { name: "Collaboration", angle: 0, dimension: "I" },
  { name: "Enthusiasm", angle: 45, dimension: "I" },
  { name: "Action", angle: 90, dimension: "D" },
  { name: "Results", angle: 135, dimension: "D" },
  { name: "Challenge", angle: 180, dimension: "C" },
  { name: "Accuracy", angle: 225, dimension: "C" },
  { name: "Stability", angle: 270, dimension: "S" },
  { name: "Support", angle: 315, dimension: "S" },
];

// ─── Circumflex Chart Drawing ───────────────────────────────────────────────

function drawCircumplexChart(
  doc: InstanceType<typeof PDFDocument>,
  centerX: number,
  centerY: number,
  outerR: number,
  scores: { D: number; I: number; S: number; C: number },
  angle: number,
  priorities: string[],
  strengthPct: number
) {
  // Quadrant definitions: startAngle, endAngle (math convention, CCW from +x)
  const quadrants: {
    key: string;
    start: number;
    end: number;
    labelX: number;
    labelY: number;
  }[] = [
    { key: "I", start: 0, end: 90, labelX: 0.42, labelY: -0.42 },
    { key: "D", start: 90, end: 180, labelX: -0.42, labelY: -0.42 },
    { key: "C", start: 180, end: 270, labelX: -0.42, labelY: 0.48 },
    { key: "S", start: 270, end: 360, labelX: 0.42, labelY: 0.48 },
  ];

  // Helper to draw a wedge (pie slice)
  function drawWedge(
    cx: number,
    cy: number,
    r: number,
    startDeg: number,
    endDeg: number,
    fillColor: string,
    fillOpacity: number
  ) {
    const startRad = (startDeg * Math.PI) / 180;
    const endRad = (endDeg * Math.PI) / 180;
    const steps = 60;
    const angleDelta = (endRad - startRad) / steps;

    doc.save();
    doc.opacity(fillOpacity);

    // Build the path manually: center -> arc -> center
    doc.moveTo(cx, cy);
    for (let j = 0; j <= steps; j++) {
      const a = startRad + angleDelta * j;
      const px = cx + r * Math.cos(a);
      // SVG: y1 = cy - r*sin(a), but PDF y-axis is flipped
      const py = cy - r * Math.sin(a);
      doc.lineTo(px, py);
    }
    doc.lineTo(cx, cy);
    doc.fillColor(fillColor).fill();
    doc.restore();
  }

  // 1. Background quadrant tints
  for (const q of quadrants) {
    drawWedge(
      centerX,
      centerY,
      outerR,
      q.start,
      q.end,
      DISC_COLORS[q.key],
      0.06
    );
  }

  // 2. Outer circle
  doc
    .save()
    .circle(centerX, centerY, outerR)
    .lineWidth(1.2)
    .strokeColor("#d6d3d1")
    .stroke()
    .restore();

  // 3. Reference circles (dashed)
  for (const f of [0.33, 0.66]) {
    doc
      .save()
      .circle(centerX, centerY, outerR * f)
      .lineWidth(0.5)
      .strokeColor("#e7e5e4")
      .dash(3, { space: 3 })
      .stroke()
      .restore();
  }

  // 4. Axis lines
  doc
    .save()
    .moveTo(centerX - outerR, centerY)
    .lineTo(centerX + outerR, centerY)
    .lineWidth(0.75)
    .strokeColor("#d6d3d1")
    .stroke()
    .restore();

  doc
    .save()
    .moveTo(centerX, centerY - outerR)
    .lineTo(centerX, centerY + outerR)
    .lineWidth(0.75)
    .strokeColor("#d6d3d1")
    .stroke()
    .restore();

  // 5. Quadrant letters
  for (const q of quadrants) {
    const lx = centerX + outerR * q.labelX;
    const ly = centerY + outerR * q.labelY;
    doc
      .save()
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor(DISC_COLORS[q.key])
      .opacity(0.8)
      .text(q.key, lx - 8, ly - 8, { width: 16, align: "center" })
      .restore();
  }

  // 6. Priority labels around the outside
  const activePriorities = new Set(priorities);
  for (const p of PRIORITY_DEFS) {
    const isActive = activePriorities.has(p.name);
    const labelR = outerR + 18;
    const pRad = (p.angle * Math.PI) / 180;
    const lx = centerX + labelR * Math.cos(pRad);
    const ly = centerY - labelR * Math.sin(pRad);

    const dimColor = DISC_COLORS[p.dimension] || MUTED;
    const fontSize = isActive ? 6.5 : 6;
    const fontName = isActive ? "Helvetica-Bold" : "Helvetica";
    const color = isActive ? dimColor : MUTED;
    const labelW = 60;

    doc.save().font(fontName).fontSize(fontSize).fillColor(color);

    // Determine text alignment based on angle position
    if (p.angle === 0) {
      // Right
      doc.text(p.name, lx + 2, ly - fontSize / 2, { width: labelW, align: "left" });
    } else if (p.angle === 180) {
      // Left
      doc.text(p.name, lx - labelW - 2, ly - fontSize / 2, { width: labelW, align: "right" });
    } else if (p.angle === 90) {
      // Top
      doc.text(p.name, lx - labelW / 2, ly - fontSize - 2, { width: labelW, align: "center" });
    } else if (p.angle === 270) {
      // Bottom
      doc.text(p.name, lx - labelW / 2, ly + 2, { width: labelW, align: "center" });
    } else if (p.angle > 0 && p.angle < 180) {
      // Upper half
      if (p.angle < 90) {
        // Upper-right
        doc.text(p.name, lx + 2, ly - fontSize / 2, { width: labelW, align: "left" });
      } else {
        // Upper-left
        doc.text(p.name, lx - labelW - 2, ly - fontSize / 2, { width: labelW, align: "right" });
      }
    } else {
      // Lower half
      if (p.angle > 270) {
        // Lower-right
        doc.text(p.name, lx + 2, ly - fontSize / 2, { width: labelW, align: "left" });
      } else {
        // Lower-left
        doc.text(p.name, lx - labelW - 2, ly - fontSize / 2, { width: labelW, align: "right" });
      }
    }

    doc.restore();
  }

  // 7. User position dot
  const normalizedMag = Math.min(strengthPct / 100, 1);
  const dotR = outerR * (0.15 + normalizedMag * 0.7);
  const dotAngleRad = (angle * Math.PI) / 180;
  const dotX = centerX + dotR * Math.cos(dotAngleRad);
  const dotY = centerY - dotR * Math.sin(dotAngleRad);

  doc
    .save()
    .circle(dotX, dotY, 6)
    .fillAndStroke("white", "#292524")
    .restore();
  doc
    .save()
    .lineWidth(2)
    .circle(dotX, dotY, 6)
    .strokeColor("#292524")
    .stroke()
    .restore();
  doc.save().circle(dotX, dotY, 2.5).fillColor("#292524").fill().restore();
}

// ─── Score Bar Drawing ──────────────────────────────────────────────────────

function drawScoreBar(
  doc: InstanceType<typeof PDFDocument>,
  x: number,
  y: number,
  width: number,
  label: string,
  pct: number,
  color: string,
  trackColor: string
) {
  const barH = 10;
  const labelW = 60;
  const pctW = 36;
  const barW = width - labelW - pctW - 8;

  // Label
  doc
    .save()
    .font("Helvetica")
    .fontSize(9)
    .fillColor(MUTED)
    .text(label, x, y + 1, { width: labelW })
    .restore();

  // Track
  const barX = x + labelW;
  doc
    .save()
    .roundedRect(barX, y, barW, barH, 5)
    .fillColor(trackColor)
    .fill()
    .restore();

  // Fill
  const fillW = Math.max(0, (pct / 100) * barW);
  if (fillW > 0) {
    doc
      .save()
      .roundedRect(barX, y, fillW, barH, 5)
      .fillColor(color)
      .fill()
      .restore();
  }

  // Percentage
  doc
    .save()
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(DARK)
    .text(`${pct}%`, x + width - pctW, y, { width: pctW, align: "right" })
    .restore();
}

// ─── DISC PDF Builder ───────────────────────────────────────────────────────

export async function generateDiscPdf(data: DiscPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, bottom: 40, left: MARGIN, right: MARGIN },
      info: {
        Title: `DISC Profile - ${data.full_name}`,
        Author: "Lyfe Candidate Portal",
      },
    });

    const chunks: Uint8Array[] = [];
    doc.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let y = doc.y;
    const primaryDim = data.disc_type.charAt(0).toUpperCase();
    const primaryColor = DISC_COLORS[primaryDim] || DISC_COLORS.D;
    const isBalanced = data.profile_strength === "balanced";
    const displayName = isBalanced ? "Balanced" : data.typeInfo.fullName;
    const displayColor = isBalanced ? "#78716c" : primaryColor;

    // ── Header (logo left, subtitle right, same line) ───────────────────
    doc.registerFont("Pacifico", PACIFICO_FONT);
    const headerY = y;
    doc
      .font("Pacifico")
      .fontSize(22)
      .fillColor(ORANGE)
      .text("Lyfe", MARGIN, headerY);

    // Orange accent line under logo
    const accentY = doc.y + 4;
    doc
      .moveTo(MARGIN, accentY)
      .lineTo(MARGIN + 24, accentY)
      .lineWidth(2)
      .strokeColor(ORANGE)
      .stroke();

    // Subtitle aligned right, vertically centered with logo
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(MUTED)
      .text("DISC PERSONALITY PROFILE", MARGIN, headerY + 8, {
        width: CONTENT_W,
        align: "right",
        characterSpacing: 1.2,
      });

    y = accentY + 12;

    // ── Hero Section (two-column: info left, description bubble right) ──
    const heroPad = 16;
    const heroTopY = y;
    const heroGap = 14;
    const leftColW = CONTENT_W * 0.48;
    const rightColW = CONTENT_W - leftColW - heroGap;
    const leftX = MARGIN + heroPad;
    const rightX = MARGIN + leftColW + heroGap;

    // ── Left column: name, type, motto, descriptors, strength ──
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor(DARK)
      .text(data.full_name, leftX, heroTopY + 14, { width: leftColW - heroPad });

    // Type name + code
    const typeLineY = doc.y + 2;
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(displayColor)
      .text(displayName, leftX, typeLineY, { width: leftColW - heroPad });

    if (!isBalanced) {
      // Place code inline after the type name if it fits, otherwise on same line right-aligned
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(MUTED)
        .text(`(${data.disc_type})`, leftX, typeLineY + 4, { width: leftColW - heroPad });
    }

    doc
      .font("Helvetica-Oblique")
      .fontSize(8)
      .fillColor(MUTED)
      .text(`"${data.typeInfo.motto}"`, leftX, doc.y + 3, { width: leftColW - heroPad });

    const descriptorLine = data.typeInfo.descriptors.join("  ·  ");
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(displayColor)
      .text(descriptorLine, leftX, doc.y + 4, { width: leftColW - heroPad });

    // Strength dots
    const strengthLabel =
      data.profile_strength === "strong" ? "Strong inclination"
        : data.profile_strength === "moderate" ? "Moderate inclination"
          : "Balanced profile";
    if (isBalanced) {
      // No dots for balanced — just the label
      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor(MUTED)
        .text(strengthLabel, leftX, doc.y + 6, { width: 120 });
    } else {
      const filledCount = data.profile_strength === "strong" ? 3 : 2;
      const dotSpacing = 9;
      const dotSize = 2.5;
      const dotBaseY = doc.y + 7;

      for (let idx = 0; idx < 3; idx++) {
        const dcx = leftX + idx * dotSpacing + dotSize;
        const dcy = dotBaseY + dotSize;
        if (idx < filledCount) {
          doc.save().circle(dcx, dcy, dotSize).fillColor(displayColor).fill().restore();
        } else {
          doc.save().circle(dcx, dcy, dotSize).lineWidth(0.7).strokeColor(MUTED).stroke().restore();
        }
      }
      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor(MUTED)
        .text(strengthLabel, leftX + 3 * dotSpacing + 4, dotBaseY - 0.5, { width: 120 });
    }

    let leftBottomY = doc.y;

    // Closest style for balanced
    if (isBalanced) {
      const closestName = DISC_LABELS[data.disc_type.charAt(0)] || data.disc_type;
      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor(MUTED)
        .text(`Closest style: ${closestName}`, leftX, doc.y + 3, { width: leftColW - heroPad });
      leftBottomY = doc.y;
    }

    // ── Right column: description bubble ──
    const bubblePad = 12;
    const bubbleX = rightX;
    const bubbleY = heroTopY + 14;
    const bubbleW = rightColW;

    // Render description text to measure height
    doc.font("Helvetica").fontSize(7.5);
    const descH = doc.heightOfString(data.typeInfo.description, {
      width: bubbleW - bubblePad * 2,
      lineGap: 2,
    });
    const bubbleH = descH + bubblePad * 2;

    // Draw bubble background
    doc
      .save()
      .roundedRect(bubbleX, bubbleY, bubbleW, bubbleH, 6)
      .fillColor(displayColor)
      .opacity(0.06)
      .fill()
      .restore();

    // Bubble border
    doc
      .save()
      .roundedRect(bubbleX, bubbleY, bubbleW, bubbleH, 6)
      .lineWidth(0.5)
      .strokeColor(displayColor)
      .opacity(0.15)
      .stroke()
      .restore();

    // Description text inside bubble
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(DARK)
      .text(data.typeInfo.description, bubbleX + bubblePad, bubbleY + bubblePad, {
        width: bubbleW - bubblePad * 2,
        lineGap: 2,
      });

    const heroBottomY = Math.max(leftBottomY, bubbleY + bubbleH) + 10;
    const heroH = heroBottomY - heroTopY;

    // Draw outer hero card background behind everything
    doc
      .save()
      .roundedRect(MARGIN, heroTopY, CONTENT_W, heroH, 8)
      .fillColor(displayColor)
      .opacity(0.04)
      .fill()
      .restore();

    // Colored accent line at left edge of hero
    doc
      .save()
      .moveTo(MARGIN, heroTopY + 8)
      .lineTo(MARGIN, heroTopY + heroH - 8)
      .lineWidth(3)
      .strokeColor(displayColor)
      .stroke()
      .restore();

    y = heroBottomY + 4;

    // Thin divider
    doc
      .moveTo(MARGIN, y)
      .lineTo(PAGE_W - MARGIN, y)
      .lineWidth(0.5)
      .strokeColor(LIGHT_LINE)
      .stroke();
    y += 14;

    // ── Personality Map (full width, centered) ──────────────────────────
    const chartSize = 70;
    const chartCenterX = MARGIN + CONTENT_W / 2;
    y += 20; // room for "Action" label above the circle

    // Draw the circumflex chart
    drawCircumplexChart(
      doc,
      chartCenterX,
      y + chartSize,
      chartSize,
      { D: data.d_pct, I: data.i_pct, S: data.s_pct, C: data.c_pct },
      data.angle,
      data.priorities,
      data.strength_pct
    );

    y = y + chartSize * 2 + 30;

    // ── Style Tendencies (4 bars in a row below chart) ──────────────────
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(MUTED)
      .text("STYLE TENDENCIES", MARGIN, y, { characterSpacing: 1 });
    y += 12;

    const scores = [
      { key: "D", pct: data.d_pct },
      { key: "I", pct: data.i_pct },
      { key: "S", pct: data.s_pct },
      { key: "C", pct: data.c_pct },
    ].sort((a, b) => b.pct - a.pct);

    const TRACK_BG: Record<string, string> = {
      D: "#E6F3F3",
      I: "#F0EBF5",
      S: "#FAF0EC",
      C: "#E9F0F7",
    };

    for (let idx = 0; idx < scores.length; idx++) {
      const s = scores[idx];
      drawScoreBar(
        doc,
        MARGIN,
        y + idx * 18,
        CONTENT_W,
        DISC_LABELS[s.key],
        s.pct,
        DISC_COLORS[s.key],
        TRACK_BG[s.key]
      );
    }

    y = y + scores.length * 18 + 6;

    // ── Priorities ──────────────────────────────────────────────────────
    doc.font("Helvetica").fontSize(8).fillColor(MUTED)
      .text("YOUR PRIORITIES", MARGIN, y, { characterSpacing: 1 });
    y = doc.y + 6;
    doc.font("Helvetica").fontSize(8).fillColor(DARK)
      .text(data.priorities.slice(0, 3).join("  \u00B7  "), MARGIN, y);
    y = doc.y + 2;
    if (data.priorities.length > 3) {
      doc.font("Helvetica").fontSize(7).fillColor(MUTED)
        .text(`Also: ${data.priorities.slice(3).join(", ")}`, MARGIN, y);
      y = doc.y + 2;
    }
    y += 6;

    // ── Strengths & Blind Spots ─────────────────────────────────────────
    // Thin divider
    doc
      .moveTo(MARGIN, y)
      .lineTo(PAGE_W - MARGIN, y)
      .lineWidth(0.5)
      .strokeColor(LIGHT_LINE)
      .stroke();
    y += 8;

    const colW = (CONTENT_W - 14) / 2;
    const strengthsColor = "#059669";
    const strengthsBg = "#ecfdf5";
    const blindColor = "#d97706";
    const blindBg = "#fffbeb";
    const cardPad = 8;
    const textW = colW - cardPad * 2;

    const sTopY = y;

    // Measure actual heights using PDFKit
    function measureListHeight(items: string[]): number {
      let h = 0;
      doc.font("Helvetica-Bold").fontSize(8);
      h += doc.heightOfString("Header", { width: textW }) + 3; // header
      doc.font("Helvetica").fontSize(7);
      for (const item of items) {
        h += doc.heightOfString(`•  ${item}`, { width: textW, lineGap: 1 }) + 1;
      }
      return h;
    }

    const sContentH = measureListHeight(data.typeInfo.strengths);
    const bContentH = measureListHeight(data.typeInfo.blindSpots);
    const cardH = Math.max(sContentH, bContentH) + cardPad * 2;

    // Strengths card
    doc
      .save()
      .roundedRect(MARGIN, y, colW, cardH, 6)
      .fillColor(strengthsBg)
      .fill()
      .restore();

    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(strengthsColor)
      .text("Strengths", MARGIN + cardPad, y + cardPad, { width: textW });
    let sy = doc.y + 3;

    doc.font("Helvetica").fontSize(7).fillColor("#065f46");
    for (const s of data.typeInfo.strengths) {
      doc.text(`•  ${s}`, MARGIN + cardPad, sy, { width: textW, lineGap: 1 });
      sy = doc.y + 1;
    }

    // Blind Spots card
    const bsX = MARGIN + colW + 14;
    doc
      .save()
      .roundedRect(bsX, y, colW, cardH, 6)
      .fillColor(blindBg)
      .fill()
      .restore();

    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(blindColor)
      .text("Blind Spots", bsX + cardPad, y + cardPad, { width: textW });
    let by = doc.y + 3;

    doc.font("Helvetica").fontSize(7).fillColor("#92400e");
    for (const b of data.typeInfo.blindSpots) {
      doc.text(`•  ${b}`, bsX + cardPad, by, { width: textW, lineGap: 1 });
      by = doc.y + 1;
    }

    y += cardH + 8;

    // ── Understanding the DISC Model ────────────────────────────────────
    doc
      .moveTo(MARGIN, y)
      .lineTo(PAGE_W - MARGIN, y)
      .lineWidth(0.5)
      .strokeColor(LIGHT_LINE)
      .stroke();
    y += 6;

    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(MUTED)
      .text("UNDERSTANDING THE DISC MODEL", MARGIN, y, {
        characterSpacing: 0.8,
      });
    y = doc.y + 4;

    doc.font("Helvetica").fontSize(7).fillColor(DARK);
    doc.text(
      "The DISC model measures four independent behavioural dimensions. Each score reflects how strongly you exhibit that trait — scores are independent (not forced to sum to 100%). Above 50% indicates stronger expression relative to the general population.",
      MARGIN,
      y,
      { width: CONTENT_W, lineGap: 1.5 }
    );
    y = doc.y + 6;

    // Compact inline dimension legend
    const dimLegend = ["D", "I", "S", "C"]
      .map((k) => `${DISC_LABELS[k]}: ${DISC_DESCS[k]}`)
      .join("   |   ");
    doc.font("Helvetica").fontSize(6.5).fillColor(MUTED);
    doc.text(dimLegend, MARGIN, y, { width: CONTENT_W });
    y = doc.y + 6;

    if (isBalanced) {
      doc.font("Helvetica").fontSize(7).fillColor(MUTED)
        .text("Note: This candidate shows a balanced profile across all four dimensions, suggesting high adaptability.", MARGIN, y, { width: CONTENT_W });
      y = doc.y + 4;
    }

    // ── Footer ──────────────────────────────────────────────────────────
    y = Math.max(y, doc.y) + 16;
    if (y > 770) {
      doc.addPage();
      y = 48;
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
      .text("Lyfe Candidate Portal  ·  DISC Personality Profile  ·  Confidential", MARGIN, y);

    doc.end();
  });
}
