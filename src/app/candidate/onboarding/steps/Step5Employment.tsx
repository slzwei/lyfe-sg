"use client";

interface EmploymentRow {
  from: string;
  to: string;
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
  const rows = (data.employment_history as EmploymentRow[]) || [
    { ...EMPTY_ROW },
  ];

  function updateRow(index: number, field: string, value: string) {
    const updated = rows.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    );
    onChange("employment_history", updated);
  }

  function addRow() {
    onChange("employment_history", [...rows, { ...EMPTY_ROW }]);
  }

  function removeRow(index: number) {
    if (rows.length <= 1) return;
    onChange(
      "employment_history",
      rows.filter((_, i) => i !== index)
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-800">
            Employment History
          </h2>
          <p className="text-sm text-stone-500">
            Start with your latest or present company.
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-100"
        >
          + Add
        </button>
      </div>

      {errors.employment_history && (
        <p className="text-xs text-red-500">{errors.employment_history}</p>
      )}

      <div className="space-y-4">
        {rows.map((row, i) => (
          <div
            key={i}
            className="rounded-2xl border border-stone-200 bg-white p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-stone-500">
                Position {i + 1}
              </span>
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
                <label className={LABEL_CLASS}>From (mm/yyyy)</label>
                <input
                  type="month"
                  className={INPUT_CLASS}
                  value={row.from}
                  onChange={(e) => updateRow(i, "from", e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>To (mm/yyyy)</label>
                <input
                  type="month"
                  className={INPUT_CLASS}
                  value={row.to}
                  onChange={(e) => updateRow(i, "to", e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Company / Country *</label>
                <input
                  className={INPUT_CLASS}
                  value={row.company}
                  onChange={(e) => updateRow(i, "company", e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Position Held *</label>
                <input
                  className={INPUT_CLASS}
                  value={row.position}
                  onChange={(e) => updateRow(i, "position", e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Salary</label>
                <input
                  className={INPUT_CLASS}
                  value={row.salary}
                  onChange={(e) => updateRow(i, "salary", e.target.value)}
                  placeholder="e.g. $2,500"
                />
              </div>
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
