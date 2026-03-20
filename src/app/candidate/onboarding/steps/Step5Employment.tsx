"use client";

import { useState, useRef, useEffect } from "react";

/* ── Custom Month-Year Picker ─────────────────────────────── */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function MonthYearPicker({
  value,
  onChange,
  className,
}: {
  value: string; // "YYYY-MM" or ""
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Derive displayed year from value, default to current year
  const today = new Date();
  const [year, month] = value
    ? value.split("-").map(Number)
    : [today.getFullYear(), today.getMonth() + 1];
  const [viewYear, setViewYear] = useState(year);

  // Sync viewYear when value changes externally
  useEffect(() => {
    if (value) setViewYear(Number(value.split("-")[0]));
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function pick(m: number) {
    const mm = String(m).padStart(2, "0");
    onChange(`${viewYear}-${mm}`);
    setOpen(false);
  }

  // Format display value
  const display = value
    ? `${MONTHS[month - 1]} ${year}`
    : "";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); if (!open && !value) setViewYear(today.getFullYear()); }}
        className={className}
      >
        <span className={value ? "text-stone-800" : "text-stone-400"}>
          {display || "---------- ----"}
        </span>
        {/* calendar icon */}
        <svg className="ml-auto h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-stone-200 bg-white p-3 shadow-lg">
          {/* Year navigation */}
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setViewYear(viewYear - 1)} className="rounded-lg p-1 text-stone-500 hover:bg-stone-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-semibold text-stone-700">{viewYear}</span>
            <button type="button" onClick={() => setViewYear(viewYear + 1)} className="rounded-lg p-1 text-stone-500 hover:bg-stone-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          {/* Month grid */}
          <div className="grid grid-cols-4 gap-1">
            {MONTHS.map((label, idx) => {
              const m = idx + 1;
              const selected = value === `${viewYear}-${String(m).padStart(2, "0")}`;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => pick(m)}
                  className={`rounded-lg py-1.5 text-xs font-medium transition-colors ${
                    selected
                      ? "bg-orange-500 text-white"
                      : "text-stone-600 hover:bg-orange-50 hover:text-orange-600"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {/* Footer */}
          <div className="mt-2 flex justify-between">
            <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="text-xs font-medium text-orange-500 hover:text-orange-600">Clear</button>
            <button type="button" onClick={() => { setViewYear(today.getFullYear()); pick(today.getMonth() + 1); }} className="text-xs font-medium text-orange-500 hover:text-orange-600">This month</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Employment Step ──────────────────────────────────────── */

interface EmploymentRow {
  from: string;
  to: string;
  is_current: boolean;
  company: string;
  position: string;
  salary: string;
  reason_leaving: string;
}

interface Step5Props {
  data: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  errors: Record<string, string>;
}

const INPUT_CLASS =
  "h-10 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
const LABEL_CLASS = "mb-1 block text-xs font-medium text-stone-600";

const EMPTY_ROW: EmploymentRow = {
  from: "",
  to: "",
  is_current: false,
  company: "",
  position: "",
  salary: "",
  reason_leaving: "",
};

export default function Step5Employment({
  data,
  onChange,
  errors,
}: Step5Props) {
  const rows = (data.employment_history as EmploymentRow[]) || [];
  const ec = (key: string) =>
    errors[key] ? " !border-red-400 !bg-red-50" : "";

  function updateRow(index: number, field: string, value: unknown) {
    const updated = rows.map((row, i) => {
      if (i !== index) return row;
      const newRow = { ...row, [field]: value };
      // If marking as current, clear "to" date and reason for leaving
      if (field === "is_current" && value === true) {
        newRow.to = "";
        newRow.reason_leaving = "";
      }
      return newRow;
    });
    onChange("employment_history", updated);
  }

  function addRow() {
    onChange("employment_history", [...rows, { ...EMPTY_ROW }]);
  }

  function removeRow(index: number) {
    onChange(
      "employment_history",
      rows.filter((_, i) => i !== index)
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-stone-800">
          Employment History
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Start with your latest or present company. Include internships and
          part-time roles.
        </p>
      </div>

      {errors.employment_history && (
        <p data-error className="text-xs text-red-500">{errors.employment_history}</p>
      )}

      {rows.map((row, i) => (
        <div key={i}>
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-stone-700">
                  {i === 0
                    ? "Most Recent Position"
                    : `Position ${i + 1}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                Remove
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL_CLASS}>From (mm/yyyy)</label>
                <MonthYearPicker
                  value={row.from}
                  onChange={(v) => updateRow(i, "from", v)}
                  className={"flex items-center " + INPUT_CLASS + ec(`employment_history.${i}.from`)}
                />
                {errors[`employment_history.${i}.from`] && (
                  <p data-error className="mt-1 text-xs text-red-500">
                    {errors[`employment_history.${i}.from`]}
                  </p>
                )}
              </div>
              <div>
                <label className={LABEL_CLASS}>To (mm/yyyy)</label>
                {row.is_current ? (
                  <div className="flex h-10 items-center rounded-xl border border-stone-100 bg-stone-100 px-3 text-sm text-stone-500">
                    Present
                  </div>
                ) : (
                  <>
                    <MonthYearPicker
                      value={row.to}
                      onChange={(v) => updateRow(i, "to", v)}
                      className={"flex items-center " + INPUT_CLASS + ec(`employment_history.${i}.to`)}
                    />
                    {errors[`employment_history.${i}.to`] && (
                      <p data-error className="mt-1 text-xs text-red-500">
                        {errors[`employment_history.${i}.to`]}
                      </p>
                    )}
                  </>
                )}
                <label className="mt-1.5 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={row.is_current || false}
                    onChange={(e) =>
                      updateRow(i, "is_current", e.target.checked)
                    }
                    className="h-3.5 w-3.5 accent-orange-500"
                  />
                  <span className="text-xs text-stone-500">
                    I currently work here
                  </span>
                </label>
                {errors[`employment_history.${i}.is_current`] && (
                  <p data-error className="mt-1 text-xs text-red-500">
                    {errors[`employment_history.${i}.is_current`]}
                  </p>
                )}
              </div>
              <div>
                <label className={LABEL_CLASS}>Company / Country *</label>
                <input
                  className={INPUT_CLASS + ec(`employment_history.${i}.company`)}
                  value={row.company}
                  onChange={(e) => updateRow(i, "company", e.target.value)}
                  placeholder="e.g. DBS Bank Singapore"
                />
                {errors[`employment_history.${i}.company`] && (
                  <p data-error className="mt-1 text-xs text-red-500">
                    {errors[`employment_history.${i}.company`]}
                  </p>
                )}
              </div>
              <div>
                <label className={LABEL_CLASS}>Position Held *</label>
                <input
                  className={INPUT_CLASS + ec(`employment_history.${i}.position`)}
                  value={row.position}
                  onChange={(e) => updateRow(i, "position", e.target.value)}
                />
                {errors[`employment_history.${i}.position`] && (
                  <p data-error className="mt-1 text-xs text-red-500">
                    {errors[`employment_history.${i}.position`]}
                  </p>
                )}
              </div>
              <div>
                <label className={LABEL_CLASS}>Monthly Salary</label>
                <input
                  className={INPUT_CLASS}
                  value={row.salary}
                  onChange={(e) => updateRow(i, "salary", e.target.value)}
                  placeholder="e.g. $2,500"
                />
              </div>
              {!row.is_current && (
                <div>
                  <label className={LABEL_CLASS}>Reason for Leaving</label>
                  <input
                    className={INPUT_CLASS}
                    value={row.reason_leaving}
                    onChange={(e) =>
                      updateRow(i, "reason_leaving", e.target.value)
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* Add button below last entry */}
          {i === rows.length - 1 && rows.length > 0 && (
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
              Add another position
            </button>
          )}
        </div>
      ))}

      {/* Add button when no entries */}
      {rows.length === 0 && (
        <button
          type="button"
          onClick={addRow}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-200 py-3 text-sm font-medium text-stone-400 transition-colors hover:border-orange-300 hover:text-orange-500"
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
          Add a position
        </button>
      )}
    </div>
  );
}
