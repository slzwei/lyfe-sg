"use client";

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
        <p className="text-xs text-red-500">{errors.employment_history}</p>
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
                <input
                  type="month"
                  className={INPUT_CLASS}
                  value={row.from}
                  onChange={(e) => updateRow(i, "from", e.target.value)}
                />
                {errors[`employment_history.${i}.from`] && (
                  <p className="mt-1 text-xs text-red-500">
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
                    <input
                      type="month"
                      className={INPUT_CLASS}
                      value={row.to}
                      onChange={(e) => updateRow(i, "to", e.target.value)}
                    />
                    {errors[`employment_history.${i}.to`] && (
                      <p className="mt-1 text-xs text-red-500">
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
                  <p className="mt-1 text-xs text-red-500">
                    {errors[`employment_history.${i}.is_current`]}
                  </p>
                )}
              </div>
              <div>
                <label className={LABEL_CLASS}>Company / Country *</label>
                <input
                  className={INPUT_CLASS}
                  value={row.company}
                  onChange={(e) => updateRow(i, "company", e.target.value)}
                  placeholder="e.g. DBS Bank Singapore"
                />
                {errors[`employment_history.${i}.company`] && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors[`employment_history.${i}.company`]}
                  </p>
                )}
              </div>
              <div>
                <label className={LABEL_CLASS}>Position Held *</label>
                <input
                  className={INPUT_CLASS}
                  value={row.position}
                  onChange={(e) => updateRow(i, "position", e.target.value)}
                />
                {errors[`employment_history.${i}.position`] && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors[`employment_history.${i}.position`]}
                  </p>
                )}
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
