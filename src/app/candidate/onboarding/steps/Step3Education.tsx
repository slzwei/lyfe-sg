"use client";

interface EducationData {
  currently_studying: boolean;
  current_qualification: string;
  current_institution: string;
  current_year_commenced: string;
  current_expected_end_date: string;
  highest_qualification: string;
  highest_institution: string;
  highest_year_completed: string;
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

const QUALIFICATION_LEVELS = [
  "No Formal Qualification",
  "PSLE",
  "GCE N-Level",
  "GCE O-Level",
  "GCE A-Level",
  "ITE / NITEC / Higher NITEC",
  "Diploma",
  "Advanced Diploma / Specialist Diploma",
  "Bachelor's Degree",
  "Postgraduate Diploma / Graduate Diploma",
  "Master's Degree",
  "Doctorate (PhD)",
  "Professional Qualification",
  "Other",
];

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
  const education = (data.education as EducationData) || {
    currently_studying: false,
    current_qualification: "",
    current_institution: "",
    current_year_commenced: "",
    current_expected_end_date: "",
    highest_qualification: "",
    highest_institution: "",
    highest_year_completed: "",
  };

  function update(field: keyof EducationData, value: string | boolean) {
    const updated = { ...education, [field]: value };
    // Clear current education fields when switching to "No"
    if (field === "currently_studying" && value === false) {
      updated.current_qualification = "";
      updated.current_institution = "";
      updated.current_year_commenced = "";
      updated.current_expected_end_date = "";
    }
    onChange("education", updated);
  }

  const commencedYears = yearOptions(1970, CURRENT_YEAR);
  const expectedEndYears = yearOptions(CURRENT_YEAR, CURRENT_YEAR + 8);
  const completedYears = yearOptions(1970, CURRENT_YEAR);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-stone-800">
          Educational Profile
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Tell us about your education background.
        </p>
      </div>

      {errors.education && (
        <p data-error className="text-xs text-red-500">{errors.education}</p>
      )}

      {/* Currently studying toggle */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <label className="mb-3 block text-sm font-medium text-stone-700">
          Are you currently studying?
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => update("currently_studying", true)}
            className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              education.currently_studying
                ? "border-orange-400 bg-orange-50 text-orange-600"
                : "border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => update("currently_studying", false)}
            className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              !education.currently_studying
                ? "border-orange-400 bg-orange-50 text-orange-600"
                : "border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300"
            }`}
          >
            No
          </button>
        </div>
      </div>

      {/* Current education details (only if currently studying) */}
      {education.currently_studying && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
              1
            </span>
            <span className="text-sm font-medium text-stone-700">
              Current Education
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLASS}>
                What are you studying? *
              </label>
              <input
                className={INPUT_CLASS}
                value={education.current_qualification}
                onChange={(e) =>
                  update("current_qualification", e.target.value)
                }
                placeholder="e.g. Bachelor of Business"
              />
              {errors["education.current_qualification"] && (
                <p data-error className="mt-1 text-xs text-red-500">
                  {errors["education.current_qualification"]}
                </p>
              )}
            </div>
            <div>
              <label className={LABEL_CLASS}>Institution *</label>
              <input
                className={INPUT_CLASS}
                value={education.current_institution}
                onChange={(e) =>
                  update("current_institution", e.target.value)
                }
                placeholder="e.g. National University of Singapore"
              />
              {errors["education.current_institution"] && (
                <p data-error className="mt-1 text-xs text-red-500">
                  {errors["education.current_institution"]}
                </p>
              )}
            </div>
            <div>
              <label className={LABEL_CLASS}>Year Commenced</label>
              <select
                className={SELECT_CLASS}
                value={education.current_year_commenced}
                onChange={(e) =>
                  update("current_year_commenced", e.target.value)
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
              <label className={LABEL_CLASS}>Expected End Date *</label>
              <select
                className={SELECT_CLASS}
                value={education.current_expected_end_date}
                onChange={(e) =>
                  update("current_expected_end_date", e.target.value)
                }
              >
                <option value="">Select year</option>
                {expectedEndYears.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
              {errors["education.current_expected_end_date"] && (
                <p data-error className="mt-1 text-xs text-red-500">
                  {errors["education.current_expected_end_date"]}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Highest attained education */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
            {education.currently_studying ? "2" : "1"}
          </span>
          <span className="text-sm font-medium text-stone-700">
            Highest Attained Qualification
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS}>Qualification Level *</label>
            <select
              className={SELECT_CLASS}
              value={education.highest_qualification}
              onChange={(e) =>
                update("highest_qualification", e.target.value)
              }
            >
              <option value="">Select qualification</option>
              {QUALIFICATION_LEVELS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
            {errors["education.highest_qualification"] && (
              <p data-error className="mt-1 text-xs text-red-500">
                {errors["education.highest_qualification"]}
              </p>
            )}
          </div>
          <div>
            <label className={LABEL_CLASS}>Institution *</label>
            <input
              className={INPUT_CLASS}
              value={education.highest_institution}
              onChange={(e) =>
                update("highest_institution", e.target.value)
              }
              placeholder="e.g. Ngee Ann Polytechnic"
            />
            {errors["education.highest_institution"] && (
              <p data-error className="mt-1 text-xs text-red-500">
                {errors["education.highest_institution"]}
              </p>
            )}
          </div>
          <div>
            <label className={LABEL_CLASS}>Year Completed *</label>
            <select
              className={SELECT_CLASS}
              value={education.highest_year_completed}
              onChange={(e) =>
                update("highest_year_completed", e.target.value)
              }
            >
              <option value="">Select year</option>
              {completedYears.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
            {errors["education.highest_year_completed"] && (
              <p data-error className="mt-1 text-xs text-red-500">
                {errors["education.highest_year_completed"]}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
