"use client";

import type {
  MilestoneRow,
  PaperAttemptRow,
  PrepCourseRow,
} from "../../actions";

// ─── Paper requirement derivation ─────────────────────────────────────────────
// Mirrors resolveRequirement() in lyfe-app/hooks/useCandidateProgression.ts.
// Four UI requirements map to six paper codes via equivalencies. A requirement
// is "passed" iff some attempt for an accepted code has result='passed'.

type PaperCode = "M9" | "M9A" | "M5" | "RES5" | "HI" | "CM_LIP";
type RequirementStatus = "passed" | "failed" | "scheduled" | "not_started";

const REQUIREMENT_DEFS: { code: string; label: string; accepted: PaperCode[] }[] = [
  { code: "life_1", label: "Life Insurance 1", accepted: ["M9", "CM_LIP"] },
  { code: "life_2", label: "Life Insurance 2", accepted: ["M9A", "CM_LIP"] },
  { code: "rules_ethics", label: "Rules & Ethics", accepted: ["M5", "RES5"] },
  { code: "health_insurance", label: "Health Insurance", accepted: ["HI"] },
];

function resolveRequirement(
  def: (typeof REQUIREMENT_DEFS)[number],
  allAttempts: PaperAttemptRow[]
): { status: RequirementStatus; latest: PaperAttemptRow | null; passedAttempt: PaperAttemptRow | null } {
  const acceptedSet = new Set<string>(def.accepted);
  const attempts = allAttempts
    .filter((a) => acceptedSet.has(a.paper_code))
    // Newest first; mirror mobile ordering (exam_at desc, fall back to created_at).
    .sort((a, b) => {
      const at = a.exam_at ?? a.created_at;
      const bt = b.exam_at ?? b.created_at;
      return bt.localeCompare(at);
    });
  const latest = attempts[0] ?? null;
  const passedAttempt = attempts.find((a) => a.result === "passed") ?? null;
  let status: RequirementStatus;
  if (passedAttempt) status = "passed";
  else if (!latest) status = "not_started";
  else if (latest.result === "failed") status = "failed";
  else status = "scheduled";
  return { status, latest, passedAttempt };
}

// ─── Milestone + prep course display order ────────────────────────────────────

const MILESTONE_DISPLAY: { code: string; label: string; hint?: string }[] = [
  { code: "bdm", label: "BDM Interview", hint: "Principal formality" },
  { code: "bes_induction", label: "BES Induction" },
  { code: "soar", label: "SOAR", hint: "Optional" },
  { code: "rnf", label: "RNF" },
  { code: "sales_authority", label: "Sales Authority" },
];

const PREP_COURSE_DISPLAY: { code: string; label: string }[] = [
  { code: "M9_M9A", label: "M9 / M9A Prep" },
  { code: "RES5", label: "RES5 Prep" },
  { code: "HI", label: "HI Prep" },
];

// ─── Formatters + badge helpers ───────────────────────────────────────────────

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-SG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function requirementBadge(status: RequirementStatus): { label: string; className: string } {
  switch (status) {
    case "passed":
      return { label: "Passed", className: "bg-green-50 text-green-700 border-green-200" };
    case "failed":
      return { label: "Failed", className: "bg-red-50 text-red-700 border-red-200" };
    case "scheduled":
      return { label: "Scheduled", className: "bg-amber-50 text-amber-700 border-amber-200" };
    default:
      return { label: "Not Started", className: "bg-stone-100 text-stone-500 border-stone-200" };
  }
}

function milestoneBadge(status: string | undefined): { label: string; className: string } {
  switch (status) {
    case "completed":
      return { label: "Completed", className: "bg-green-50 text-green-700 border-green-200" };
    case "issued":
      return { label: "Issued", className: "bg-green-50 text-green-700 border-green-200" };
    case "scheduled":
      return { label: "Scheduled", className: "bg-amber-50 text-amber-700 border-amber-200" };
    case "lodged_to_mas":
      return { label: "Lodged to MAS", className: "bg-blue-50 text-blue-700 border-blue-200" };
    default:
      return { label: "Not Started", className: "bg-stone-100 text-stone-500 border-stone-200" };
  }
}

interface Props {
  attempts: PaperAttemptRow[];
  milestones: MilestoneRow[];
  prepCourses: PrepCourseRow[];
}

export default function ProgressionSections({ attempts, milestones, prepCourses }: Props) {
  const milestoneByCode = new Map(milestones.map((m) => [m.milestone_code, m]));
  const prepByCode = new Map(prepCourses.map((p) => [p.course_code, p]));
  const requirements = REQUIREMENT_DEFS.map((def) => ({ def, ...resolveRequirement(def, attempts) }));
  const passedCount = requirements.filter((r) => r.status === "passed").length;
  const milestonesCompletedCount = MILESTONE_DISPLAY.filter((m) => {
    const st = milestoneByCode.get(m.code)?.status;
    return st === "completed" || st === "issued";
  }).length;
  const prepAttendedCount = PREP_COURSE_DISPLAY.filter((c) => prepByCode.get(c.code)?.attended).length;

  return (
    <div className="space-y-4">
      {/* Papers */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5" data-testid="progression-papers">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-700">Papers</h2>
          <span className="text-xs text-stone-400">{passedCount}/{requirements.length}</span>
        </div>
        <div className="divide-y divide-stone-100">
          {requirements.map(({ def, status, latest, passedAttempt }) => {
            const badge = requirementBadge(status);
            const detailParts: string[] = [];
            if (passedAttempt) {
              const d = formatDate(passedAttempt.exam_at ?? passedAttempt.created_at);
              if (d) detailParts.push(`Passed ${passedAttempt.paper_code} · ${d}`);
            } else if (latest) {
              const d = formatDate(latest.exam_at ?? latest.created_at);
              if (d) detailParts.push(`${latest.paper_code} · ${d}`);
            }
            return (
              <div key={def.code} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-sm font-medium text-stone-700">{def.label}</div>
                  {detailParts.length > 0 && (
                    <div className="mt-0.5 text-xs text-stone-400">{detailParts.join(" · ")}</div>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Milestones */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5" data-testid="progression-milestones">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-700">Milestones</h2>
          <span className="text-xs text-stone-400">
            {milestonesCompletedCount}/{MILESTONE_DISPLAY.length}
          </span>
        </div>
        <div className="divide-y divide-stone-100">
          {MILESTONE_DISPLAY.map((m) => {
            const row = milestoneByCode.get(m.code);
            const badge = milestoneBadge(row?.status);
            const detailParts: string[] = [];
            if (row?.milestone_code === "rnf" && row.reference_number) {
              detailParts.push(`Ref ${row.reference_number}`);
            }
            if (row?.scheduled_date && row.status === "scheduled") {
              const d = formatDate(row.scheduled_date);
              if (d) detailParts.push(`Scheduled ${d}`);
            }
            if (row?.completed_date && (row.status === "completed" || row.status === "issued")) {
              const d = formatDate(row.completed_date);
              if (d)
                detailParts.push(row.status === "issued" ? `Issued ${d}` : `Completed ${d}`);
            }
            return (
              <div key={m.code} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-sm font-medium text-stone-700">
                    {m.label}
                    {m.hint && <span className="ml-2 text-xs font-normal text-stone-400">{m.hint}</span>}
                  </div>
                  {detailParts.length > 0 && (
                    <div className="mt-0.5 text-xs text-stone-400">{detailParts.join(" · ")}</div>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Prep courses */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5" data-testid="progression-prep">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-700">Prep Courses</h2>
          <span className="text-xs text-stone-400">
            {prepAttendedCount}/{PREP_COURSE_DISPLAY.length} attended
          </span>
        </div>
        <div className="divide-y divide-stone-100">
          {PREP_COURSE_DISPLAY.map((c) => {
            const row = prepByCode.get(c.code);
            const attended = !!row?.attended;
            const booked = !!row?.booked_date && !attended;
            const badge = attended
              ? { label: "Attended", className: "bg-green-50 text-green-700 border-green-200" }
              : booked
                ? { label: "Booked", className: "bg-amber-50 text-amber-700 border-amber-200" }
                : { label: "Not Booked", className: "bg-stone-100 text-stone-500 border-stone-200" };
            const bookedRange = row?.booked_date
              ? `${formatDate(row.booked_date)}${row.booked_end_date ? ` – ${formatDate(row.booked_end_date)}` : ""}`
              : null;
            return (
              <div key={c.code} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-sm font-medium text-stone-700">{c.label}</div>
                  {bookedRange && <div className="mt-0.5 text-xs text-stone-400">{bookedRange}</div>}
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
