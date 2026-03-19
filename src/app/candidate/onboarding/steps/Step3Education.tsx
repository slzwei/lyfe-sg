"use client";

import { useState } from "react";

interface EducationRow {
  qualification: string;
  institution: string;
  year_commenced: string;
  year_completed: string;
  expected_graduation: string;
  remarks: string;
}

interface Step3Props {
  data: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  errors: Record<string, string>;
}

const INPUT_CLASS =
  "h-10 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
const SELECT_CLASS =
  "h-10 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
const LABEL_CLASS = "mb-1 block text-xs font-medium text-stone-600";

const CURRENT_YEAR = new Date().getFullYear();

const EMPTY_ROW: EducationRow = {
  qualification: "",
  institution: "",
  year_commenced: "",
  year_completed: "",
  expected_graduation: "",
  remarks: "",
};

function yearOptions(min: number, max: number) {
  const options = [];
  for (let y = max; y >= min; y--) {
    options.push(y);
  }
  return options;
}

export default function Step3Education({
  data,
  onChange,
  errors,
}: Step3Props) {
  const rows = (data.education as EducationRow[]) || [{ ...EMPTY_ROW }];

  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  function validateYears(row: EducationRow, index: number) {
    const key = `year_${index}`;
    const commenced = parseInt(row.year_commenced);
    const completed = row.year_completed;

    if (commenced && completed && completed !== "Present") {
      const completedNum = parseInt(completed);
      if (completedNum < commenced) {
        setRowErrors((prev) => ({
          ...prev,
          [key]: "Year completed cannot be before year commenced.",
        }));
        return;
      }
    }
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function updateRow(index: number, field: string, value: string) {
    const updated = rows.map((row, i) => {
      if (i !== index) return row;
      const newRow = { ...row, [field]: value };
      if (field === "year_completed" && value !== "Present") {
        newRow.expected_graduation = "";
      }
      return newRow;
    });
    onChange("education", updated);

    // Validate year logic after update
    const updatedRow = updated[index];
    validateYears(updatedRow, index);
  }

  function addRow() {
    onChange("education", [...rows, { ...EMPTY_ROW }]);
  }

  function removeRow(index: number) {
    if (rows.length <= 1) return;
    onChange(
      "education",
      rows.filter((_, i) => i !== index)
    );
  }

  const commencedYears = yearOptions(1970, CURRENT_YEAR);
  const completedYears = yearOptions(1970, CURRENT_YEAR + 6);
  const gradYears = yearOptions(CURRENT_YEAR + 1, CURRENT_YEAR + 8);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-stone-800">
          Educational Profile
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          List all post-secondary education (polytechnic, ITE, JC, university, etc.) and above.
          Start with your most recent qualification.
        </p>
      </div>

      {errors.education && (
        <p className="text-xs text-red-500">{errors.education}</p>
      )}

      {/* Education entries */}
      {rows.map((row, i) => (
        <div key={i}>
          {/* Entry card */}
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-stone-700">
                  {i === 0
                    ? "Most Recent Qualification"
                    : `Qualification ${i + 1}`}
                </span>
              </div>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL_CLASS}>Qualification *</label>
                <input
                  className={INPUT_CLASS}
                  value={row.qualification}
                  onChange={(e) =>
                    updateRow(i, "qualification", e.target.value)
                  }
                  placeholder="e.g. Diploma in Business"
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Institution / Country *</label>
                <input
                  className={INPUT_CLASS}
                  value={row.institution}
                  onChange={(e) =>
                    updateRow(i, "institution", e.target.value)
                  }
                  placeholder="e.g. Ngee Ann Polytechnic"
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Year Commenced</label>
                <select
                  className={SELECT_CLASS}
                  value={row.year_commenced}
                  onChange={(e) =>
                    updateRow(i, "year_commenced", e.target.value)
                  }
                >
                  <option value="">Select year</option>
                  {commencedYears.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS}>Year Completed</label>
                <select
                  className={SELECT_CLASS}
                  value={row.year_completed}
                  onChange={(e) =>
                    updateRow(i, "year_completed", e.target.value)
                  }
                >
                  <option value="">Select year</option>
                  <option value="Present">Present (still studying)</option>
                  {completedYears.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
                {rowErrors[`year_${i}`] && (
                  <p className="mt-1 text-xs text-red-500">
                    {rowErrors[`year_${i}`]}
                  </p>
                )}
              </div>
            </div>

            {row.year_completed === "Present" && (
              <div className="mt-3 max-w-xs">
                <label className={LABEL_CLASS}>
                  Expected Year of Graduation
                </label>
                <select
                  className={SELECT_CLASS}
                  value={row.expected_graduation || ""}
                  onChange={(e) =>
                    updateRow(i, "expected_graduation", e.target.value)
                  }
                >
                  <option value="">Select year</option>
                  {gradYears.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-3">
              <label className={LABEL_CLASS}>Remarks</label>
              <input
                className={INPUT_CLASS}
                value={row.remarks}
                onChange={(e) => updateRow(i, "remarks", e.target.value)}
                placeholder="e.g. Part-time, Dean's List, or any relevant detail"
              />
            </div>
          </div>

          {/* Add button below each entry — only show after the last entry */}
          {i === rows.length - 1 && (
            <button
              type="button"
              onClick={addRow}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-200 py-3 text-sm font-medium text-stone-400 transition-colors hover:border-orange-300 hover:text-orange-500"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add another qualification
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
