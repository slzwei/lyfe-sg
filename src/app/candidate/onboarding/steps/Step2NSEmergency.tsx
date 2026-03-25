"use client";

import MonthYearPicker from "./MonthYearPicker";

interface Step2Props {
  data: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  errors: Record<string, string>;
}

const INPUT_CLASS =
  "h-12 w-full max-w-full box-border rounded-xl border border-stone-200 bg-stone-50 px-4 text-base outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
const SELECT_CLASS =
  "h-12 w-full max-w-full box-border rounded-xl border border-stone-200 bg-stone-50 px-4 text-base outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-stone-700";

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p data-error className="mt-1 text-xs text-red-500">{error}</p>;
}

export default function Step2NSEmergency({
  data,
  onChange,
  errors,
}: Step2Props) {
  const v = (key: string) => (data[key] as string) || "";
  const ec = (key: string) =>
    errors[key] ? " !border-red-400 !bg-red-50" : "";
  const nationality = v("nationality").toLowerCase();
  const isMale = v("gender").toLowerCase() === "male";
  const isSGMale = nationality === "singaporean" && isMale;
  const isPRMale = nationality === "pr" && isMale;
  const showNS = isSGMale || isPRMale;

  return (
    <div className="space-y-8">
      {/* National Service — conditional */}
      {showNS && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-stone-800">
            National Service
          </h2>
          <p className="text-sm text-stone-500">
            {isSGMale
              ? "Required for Singaporean males."
              : "Optional for Singapore PR males."}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLASS}>Enlistment Date</label>
              <MonthYearPicker
                value={v("ns_enlistment_date")}
                onChange={(val) => onChange("ns_enlistment_date", val)}
                className={"flex items-center " + INPUT_CLASS + ec("ns_enlistment_date")}
              />
              <FieldError error={errors.ns_enlistment_date} />
            </div>
            <div>
              <label className={LABEL_CLASS}>ORD Date</label>
              <MonthYearPicker
                value={v("ns_ord_date")}
                onChange={(val) => onChange("ns_ord_date", val)}
                className={"flex items-center " + INPUT_CLASS + ec("ns_ord_date")}
              />
              <FieldError error={errors.ns_ord_date} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLASS}>Service Status{isSGMale ? " *" : ""}</label>
              <select
                className={SELECT_CLASS + ec("ns_service_status")}
                value={v("ns_service_status")}
                onChange={(e) =>
                  onChange("ns_service_status", e.target.value)
                }
              >
                <option value="">Select</option>
                <option value="NSF">NSF (Full-time)</option>
                <option value="NSman">NSman (Reservist)</option>
                <option value="Deferred">Deferred</option>
                <option value="Exempted">Exempted</option>
              </select>
              <FieldError error={errors.ns_service_status} />
            </div>
            <div>
              <label className={LABEL_CLASS}>NS Status{isSGMale ? " *" : ""}</label>
              <select
                className={SELECT_CLASS + ec("ns_status")}
                value={v("ns_status")}
                onChange={(e) => onChange("ns_status", e.target.value)}
              >
                <option value="">Select</option>
                <option value="Active">Active</option>
                <option value="ORD">ORD</option>
              </select>
              <FieldError error={errors.ns_status} />
            </div>
          </div>

          {v("ns_service_status") === "Exempted" && (
            <div>
              <label className={LABEL_CLASS}>Reason for Exemption</label>
              <input
                className={INPUT_CLASS}
                value={v("ns_exemption_reason")}
                onChange={(e) =>
                  onChange("ns_exemption_reason", e.target.value)
                }
              />
            </div>
          )}
        </div>
      )}

      {/* Show a hint when no NS section is visible */}
      {!showNS && (
        <p className="text-sm text-stone-400">
          No additional information required for this step. Click Next to continue.
        </p>
      )}
    </div>
  );
}
