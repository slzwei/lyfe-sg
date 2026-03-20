"use client";

interface Step6Props {
  data: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  errors: Record<string, string>;
}

const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-stone-700";

const QUESTIONS = [
  {
    key: "additional_health",
    detailKey: "additional_health_detail",
    text: "Have you been or are you suffering from any disease / illness / major medical condition / mental disorder or physical impairment?",
  },
  {
    key: "additional_dismissed",
    detailKey: "additional_dismissed_detail",
    text: "Have you been discharged or dismissed from the service of your previous employer/s?",
  },
  {
    key: "additional_convicted",
    detailKey: "additional_convicted_detail",
    text: "Have you been convicted in a court of law in any country?",
  },
  {
    key: "additional_bankrupt",
    detailKey: "additional_bankrupt_detail",
    text: "Have you ever been served with a garnishee order or been declared a bankrupt?",
  },
  {
    key: "additional_prev_applied_fs",
    detailKey: "additional_prev_applied_fs_detail",
    text: "Have you ever applied for any employment in a financial services company?",
  },
];

export default function Step6Declaration({
  data,
  onChange,
  errors,
}: Step6Props) {
  return (
    <div className="space-y-8">
      {/* Additional Information */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-stone-800">
          Additional Information
        </h2>

        <div className="space-y-5">
          {QUESTIONS.map((q, i) => {
            const answer = data[q.key] as boolean | undefined;
            return (
              <div
                key={q.key}
                className="rounded-2xl border border-stone-200 bg-white p-4"
              >
                <p className="mb-3 text-sm text-stone-700">
                  {i + 1}. {q.text}
                </p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={q.key}
                      checked={answer === true}
                      onChange={() => onChange(q.key, true)}
                      className="h-4 w-4 accent-orange-500"
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={q.key}
                      checked={answer === false}
                      onChange={() => onChange(q.key, false)}
                      className="h-4 w-4 accent-orange-500"
                    />
                    No
                  </label>
                </div>
                {answer === true && (
                  <textarea
                    className="mt-3 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    rows={2}
                    placeholder="Please provide details…"
                    value={(data[q.detailKey] as string) || ""}
                    onChange={(e) => onChange(q.detailKey, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Declaration */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-stone-800">Declaration</h2>
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
          <p className="mb-4 text-sm leading-relaxed text-stone-600">
            I declare that all information given herein is true and correct.
            I understand that a misrepresentation or omission of facts will
            be sufficient cause for cancellation of consideration for
            employment or dismissal from the Company&apos;s service if I
            have been employed.
          </p>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={(data.declaration_agreed as boolean) || false}
              onChange={(e) =>
                onChange("declaration_agreed", e.target.checked)
              }
              className="mt-0.5 h-5 w-5 accent-orange-500"
            />
            <span className="text-sm font-medium text-stone-700">
              I agree to the above declaration *
            </span>
          </label>
          {errors.declaration_agreed && (
            <p className="mt-2 text-xs text-red-500">
              {errors.declaration_agreed}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
