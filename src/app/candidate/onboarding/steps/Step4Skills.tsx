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
      </div>

      {/* Language Profile */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-800">
            Language Profile
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Rate your proficiency for each language.
          </p>
        </div>

        {languages.map((row, i) => (
          <div key={i}>
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-stone-700">
                    Language {i + 1}
                  </span>
                </div>
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
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className={LABEL_CLASS}>Language</label>
                  <input
                    className={INPUT_CLASS}
                    value={row.language}
                    onChange={(e) => updateLang(i, "language", e.target.value)}
                    placeholder="e.g. English"
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
              </div>
            </div>

            {/* Add button below last entry */}
            {i === languages.length - 1 && (
              <button
                type="button"
                onClick={addLang}
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
                Add another language
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
