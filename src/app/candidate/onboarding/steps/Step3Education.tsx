"use client";

interface EducationRow {
  qualification: string;
  institution: string;
  year_commenced: string;
  year_completed: string;
  remarks: string;
}

interface Step3Props {
  data: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  errors: Record<string, string>;
}

const INPUT_CLASS =
  "h-10 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
const LABEL_CLASS = "mb-1 block text-xs font-medium text-stone-600";

const EMPTY_ROW: EducationRow = {
  qualification: "",
  institution: "",
  year_commenced: "",
  year_completed: "",
  remarks: "",
};

export default function Step3Education({
  data,
  onChange,
  errors,
}: Step3Props) {
  const rows = (data.education as EducationRow[]) || [{ ...EMPTY_ROW }];

  function updateRow(index: number, field: string, value: string) {
    const updated = rows.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    );
    onChange("education", updated);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-800">
          Educational Profile
        </h2>
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-100"
        >
          + Add
        </button>
      </div>

      {errors.education && (
        <p className="text-xs text-red-500">{errors.education}</p>
      )}

      <div className="space-y-4">
        {rows.map((row, i) => (
          <div
            key={i}
            className="rounded-2xl border border-stone-200 bg-white p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-stone-500">
                Entry {i + 1}
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
                <label className={LABEL_CLASS}>Qualification *</label>
                <input
                  className={INPUT_CLASS}
                  value={row.qualification}
                  onChange={(e) => updateRow(i, "qualification", e.target.value)}
                  placeholder="e.g. Polytechnic Diploma"
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Institution / Country *</label>
                <input
                  className={INPUT_CLASS}
                  value={row.institution}
                  onChange={(e) => updateRow(i, "institution", e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Year Commenced</label>
                <input
                  type="number"
                  min="1970"
                  max="2030"
                  className={INPUT_CLASS}
                  value={row.year_commenced}
                  onChange={(e) =>
                    updateRow(i, "year_commenced", e.target.value)
                  }
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Year Completed</label>
                <input
                  type="number"
                  min="1970"
                  max="2030"
                  className={INPUT_CLASS}
                  value={row.year_completed}
                  onChange={(e) =>
                    updateRow(i, "year_completed", e.target.value)
                  }
                />
              </div>
            </div>
            <div className="mt-3">
              <label className={LABEL_CLASS}>Remarks</label>
              <input
                className={INPUT_CLASS}
                value={row.remarks}
                onChange={(e) => updateRow(i, "remarks", e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
