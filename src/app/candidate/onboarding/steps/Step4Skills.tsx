"use client";

interface LanguageRow {
  language: string;
  spoken: string;
  written: string;
}

interface Step4Props {
  data: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  errors: Record<string, string>;
}

const INPUT_CLASS =
  "h-10 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
const SELECT_CLASS =
  "h-10 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
const LABEL_CLASS = "mb-1 block text-xs font-medium text-stone-600";

const EMPTY_LANG: LanguageRow = { language: "", spoken: "", written: "" };

export default function Step4Skills({ data, onChange, errors }: Step4Props) {
  const v = (key: string) => (data[key] as string) || "";
  const languages = (data.languages as LanguageRow[]) || [
    { language: "English", spoken: "", written: "" },
  ];

  function updateLang(index: number, field: string, value: string) {
    const updated = languages.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    );
    onChange("languages", updated);
  }

  function addLang() {
    onChange("languages", [...languages, { ...EMPTY_LANG }]);
  }

  function removeLang(index: number) {
    if (languages.length <= 1) return;
    onChange(
      "languages",
      languages.filter((_, i) => i !== index)
    );
  }

  return (
    <div className="space-y-8">
      {/* Computer Literacy */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-stone-800">
          Computer Literacy & Skills
        </h2>
        <div>
          <label className={LABEL_CLASS}>
            Software you are competent in
          </label>
          <textarea
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            rows={3}
            value={v("software_competencies")}
            onChange={(e) =>
              onChange("software_competencies", e.target.value)
            }
            placeholder="e.g. Microsoft Word, Excel, Photoshop, Canva…"
          />
          {errors.software_competencies && (
            <p className="mt-1 text-xs text-red-500">
              {errors.software_competencies}
            </p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS}>Shorthand (wpm)</label>
            <input
              type="number"
              className={INPUT_CLASS}
              value={v("shorthand_wpm")}
              onChange={(e) => onChange("shorthand_wpm", e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Typing (wpm)</label>
            <input
              type="number"
              className={INPUT_CLASS}
              value={v("typing_wpm")}
              onChange={(e) => onChange("typing_wpm", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Language Profile */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-800">
            Language Profile
          </h2>
          <button
            type="button"
            onClick={addLang}
            className="rounded-lg bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-100"
          >
            + Add
          </button>
        </div>

        <div className="space-y-3">
          {languages.map((row, i) => (
            <div
              key={i}
              className="grid items-end gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-4"
            >
              <div>
                <label className={LABEL_CLASS}>Language</label>
                <input
                  className={INPUT_CLASS}
                  value={row.language}
                  onChange={(e) => updateLang(i, "language", e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Spoken</label>
                <select
                  className={SELECT_CLASS}
                  value={row.spoken}
                  onChange={(e) => updateLang(i, "spoken", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS}>Written</label>
                <select
                  className={SELECT_CLASS}
                  value={row.written}
                  onChange={(e) => updateLang(i, "written", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                </select>
              </div>
              <div className="flex justify-end">
                {languages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLang(i)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
