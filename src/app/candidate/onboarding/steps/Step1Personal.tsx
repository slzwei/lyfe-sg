"use client";

import { useState, useEffect, useCallback } from "react";

interface Step1Props {
  data: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  errors: Record<string, string>;
}

const SELECT_CLASS =
  "h-12 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 text-base outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
const INPUT_CLASS =
  "h-12 w-full max-w-full box-border rounded-xl border border-stone-200 bg-stone-50 px-4 text-base outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
const READONLY_CLASS =
  "h-12 w-full rounded-xl border border-stone-100 bg-stone-100 px-4 text-base text-stone-500 outline-none cursor-not-allowed";
const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-stone-700";

const COUNTRIES = [
  "Singapore",
  "---",
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria",
  "Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan",
  "Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia",
  "Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica",
  "Croatia","Cuba","Cyprus","Czech Republic","Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador",
  "Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France",
  "Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau",
  "Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland",
  "Israel","Italy","Ivory Coast","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo",
  "Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania",
  "Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius",
  "Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia",
  "Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway",
  "Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland",
  "Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino",
  "Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Slovakia","Slovenia","Solomon Islands","Somalia",
  "South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria",
  "Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey",
  "Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu",
  "Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe",
];

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p data-error className="mt-1 text-xs text-red-500">{error}</p>;
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-orange-600">
        {title}
      </h3>
      {subtitle && (
        <p className="mt-0.5 text-xs text-stone-400">{subtitle}</p>
      )}
    </div>
  );
}

export default function Step1Personal({ data, onChange, errors }: Step1Props) {
  const v = (key: string) => (data[key] as string) || "";
  const ec = (key: string) =>
    errors[key] ? " !border-red-400 !bg-red-50" : "";
  const [postalLoading, setPostalLoading] = useState(false);
  const [postalError, setPostalError] = useState("");

  const lookupPostal = useCallback(
    async (postal: string) => {
      if (postal.length !== 6) return;
      setPostalLoading(true);
      setPostalError("");
      try {
        const res = await fetch(
          `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${postal}&returnGeom=Y&getAddrDetails=Y&pageNum=1`
        );
        const json = await res.json();
        if (json.found && json.found > 0 && json.results?.length > 0) {
          const r = json.results[0];
          onChange("address_block", r.BLK_NO || "");
          onChange("address_street", r.ROAD_NAME || "");
        } else {
          setPostalError("No address found for this postal code.");
          onChange("address_block", "");
          onChange("address_street", "");
        }
      } catch {
        setPostalError("Could not look up address. Please try again.");
      }
      setPostalLoading(false);
    },
    [onChange]
  );

  // Auto-lookup when postal code reaches 6 digits
  useEffect(() => {
    const postal = v("address_postal");
    if (postal.length === 6) {
      lookupPostal(postal);
    }
  }, [v("address_postal")]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold text-stone-800">
        Personal Particulars
      </h2>

      {/* Application Details */}
      <section>
        <SectionHeader title="Application Details" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={LABEL_CLASS}>Position Applied For *</label>
            <input
              className={INPUT_CLASS + ec("position_applied")}
              value={v("position_applied")}
              onChange={(e) => onChange("position_applied", e.target.value)}
            />
            <FieldError error={errors.position_applied} />
          </div>
          <div>
            <label className={LABEL_CLASS}>Expected Salary *</label>
            <div className="flex gap-2">
              <input
                className={INPUT_CLASS + " flex-1" + ec("expected_salary")}
                value={v("expected_salary")}
                onChange={(e) => onChange("expected_salary", e.target.value)}
                placeholder="2500"
                inputMode="decimal"
              />
              <select
                className="h-12 w-28 shrink-0 rounded-xl border border-stone-200 bg-stone-50 px-2 text-base outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                value={v("salary_period") || "hour"}
                onChange={(e) => onChange("salary_period", e.target.value)}
              >
                <option value="hour">/ hour</option>
                <option value="month">/ month</option>
              </select>
            </div>
            <FieldError error={errors.expected_salary} />
          </div>
          <div>
            <label className={LABEL_CLASS}>Date of Availability *</label>
            <input
              type="date"
              className={INPUT_CLASS + ec("date_available")}
              value={v("date_available")}
              onChange={(e) => onChange("date_available", e.target.value)}
            />
            <FieldError error={errors.date_available} />
          </div>
        </div>
      </section>

      <hr className="border-stone-100" />

      {/* Personal Information */}
      <section>
        <SectionHeader title="Personal Information" />
        <div className="space-y-4">
          <div>
            <label className={LABEL_CLASS}>Full Name (as in NRIC) *</label>
            <input
              className={INPUT_CLASS + ec("full_name")}
              value={v("full_name")}
              onChange={(e) => onChange("full_name", e.target.value)}
            />
            <FieldError error={errors.full_name} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLASS}>Date of Birth *</label>
              <input
                type="date"
                className={INPUT_CLASS + ec("date_of_birth")}
                value={v("date_of_birth")}
                onChange={(e) => onChange("date_of_birth", e.target.value)}
              />
              <FieldError error={errors.date_of_birth} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Place of Birth *</label>
              <select
                className={SELECT_CLASS + ec("place_of_birth")}
                value={v("place_of_birth")}
                onChange={(e) => onChange("place_of_birth", e.target.value)}
              >
                <option value="">Select country</option>
                {COUNTRIES.map((c) =>
                  c === "---" ? (
                    <option key="---" disabled>──────────</option>
                  ) : (
                    <option key={c} value={c}>{c}</option>
                  )
                )}
              </select>
              <FieldError error={errors.place_of_birth} />
            </div>
          </div>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            <div>
              <label className={LABEL_CLASS}>Gender *</label>
              <select
                className={SELECT_CLASS + ec("gender")}
                value={v("gender")}
                onChange={(e) => onChange("gender", e.target.value)}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <FieldError error={errors.gender} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Marital Status *</label>
              <select
                className={SELECT_CLASS + ec("marital_status")}
                value={v("marital_status")}
                onChange={(e) => onChange("marital_status", e.target.value)}
              >
                <option value="">Select</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
              <FieldError error={errors.marital_status} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Nationality *</label>
              <select
                className={SELECT_CLASS + ec("nationality")}
                value={v("nationality")}
                onChange={(e) => onChange("nationality", e.target.value)}
              >
                <option value="">Select</option>
                <option value="Singaporean">Singaporean</option>
                <option value="PR">Singapore PR</option>
                <option value="Malaysian">Malaysian</option>
                <option value="Other">Other</option>
              </select>
              <FieldError error={errors.nationality} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Race *</label>
              <select
                className={SELECT_CLASS + ec("race")}
                value={v("race")}
                onChange={(e) => onChange("race", e.target.value)}
              >
                <option value="">Select</option>
                <option value="Chinese">Chinese</option>
                <option value="Malay">Malay</option>
                <option value="Indian">Indian</option>
                <option value="Eurasian">Eurasian</option>
                <option value="Other">Other</option>
              </select>
              <FieldError error={errors.race} />
            </div>
          </div>
        </div>
      </section>

      <hr className="border-stone-100" />

      {/* Address */}
      <section>
        <SectionHeader
          title="Address"
          subtitle="Enter your postal code to auto-fill your address"
        />
        <div className="space-y-4">
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            <div>
              <label className={LABEL_CLASS}>Postal Code *</label>
              <input
                className={INPUT_CLASS + ec("address_postal")}
                maxLength={6}
                inputMode="numeric"
                value={v("address_postal")}
                onChange={(e) =>
                  onChange(
                    "address_postal",
                    e.target.value.replace(/\D/g, "")
                  )
                }
                placeholder="e.g. 570187"
              />
              <FieldError error={errors.address_postal} />
              {postalLoading && (
                <p className="mt-1 text-xs text-stone-400">Looking up address…</p>
              )}
              {postalError && (
                <p className="mt-1 text-xs text-red-500">{postalError}</p>
              )}
            </div>
            <div>
              <label className={LABEL_CLASS}>Block</label>
              <input
                className={READONLY_CLASS}
                value={v("address_block")}
                readOnly
                tabIndex={-1}
              />
            </div>
            <div className="col-span-2">
              <label className={LABEL_CLASS}>Street</label>
              <input
                className={READONLY_CLASS}
                value={v("address_street")}
                readOnly
                tabIndex={-1}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className={LABEL_CLASS}>Unit</label>
              <input
                className={INPUT_CLASS}
                value={v("address_unit")}
                onChange={(e) => onChange("address_unit", e.target.value)}
                placeholder="#01-23"
              />
            </div>
          </div>
        </div>
      </section>

      <hr className="border-stone-100" />

      {/* Contact */}
      <section>
        <SectionHeader title="Contact" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS}>Contact Number *</label>
            <div className="flex gap-2">
              <div className="flex h-12 items-center rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm text-stone-500">
                +65
              </div>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={8}
                className={INPUT_CLASS + " flex-1" + ec("contact_number")}
                value={v("contact_number").replace(/^\+65/, "")}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 8);
                  onChange("contact_number", val ? `+65${val}` : "");
                }}
                placeholder="8123 4567"
              />
            </div>
            <FieldError error={errors.contact_number} />
          </div>
          <div>
            <label className={LABEL_CLASS}>Email *</label>
            <input
              type="email"
              className={INPUT_CLASS + ec("email")}
              value={v("email")}
              onChange={(e) => onChange("email", e.target.value.trim())}
              placeholder="name@example.com"
            />
            <FieldError error={errors.email} />
          </div>
        </div>
      </section>
    </div>
  );
}
