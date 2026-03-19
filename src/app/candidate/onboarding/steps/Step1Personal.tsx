"use client";

interface Step1Props {
  data: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  errors: Record<string, string>;
}

const SELECT_CLASS =
  "h-12 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
const INPUT_CLASS =
  "h-12 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-stone-700";

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-red-500">{error}</p>;
}

export default function Step1Personal({ data, onChange, errors }: Step1Props) {
  const v = (key: string) => (data[key] as string) || "";

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-stone-800">
        Personal Particulars
      </h2>

      {/* Position details */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={LABEL_CLASS}>Position Applied For *</label>
          <input
            className={INPUT_CLASS}
            value={v("position_applied")}
            onChange={(e) => onChange("position_applied", e.target.value)}
          />
          <FieldError error={errors.position_applied} />
        </div>
        <div>
          <label className={LABEL_CLASS}>Expected Salary *</label>
          <input
            className={INPUT_CLASS}
            value={v("expected_salary")}
            onChange={(e) => onChange("expected_salary", e.target.value)}
            placeholder="e.g. $2,500"
          />
          <FieldError error={errors.expected_salary} />
        </div>
        <div>
          <label className={LABEL_CLASS}>Date of Availability *</label>
          <input
            type="date"
            className={INPUT_CLASS}
            value={v("date_available")}
            onChange={(e) => onChange("date_available", e.target.value)}
          />
          <FieldError error={errors.date_available} />
        </div>
      </div>

      {/* Name fields */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label className={LABEL_CLASS}>
            Full Name (as in NRIC) *
          </label>
          <input
            className={INPUT_CLASS}
            value={v("full_name")}
            onChange={(e) => onChange("full_name", e.target.value)}
          />
          <FieldError error={errors.full_name} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={LABEL_CLASS}>Date of Birth *</label>
          <input
            type="date"
            className={INPUT_CLASS}
            value={v("date_of_birth")}
            onChange={(e) => onChange("date_of_birth", e.target.value)}
          />
          <FieldError error={errors.date_of_birth} />
        </div>
        <div>
          <label className={LABEL_CLASS}>Place of Birth *</label>
          <input
            className={INPUT_CLASS}
            value={v("place_of_birth")}
            onChange={(e) => onChange("place_of_birth", e.target.value)}
          />
          <FieldError error={errors.place_of_birth} />
        </div>
      </div>

      {/* Demographics */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className={LABEL_CLASS}>Nationality *</label>
          <select
            className={SELECT_CLASS}
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
            className={SELECT_CLASS}
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
        <div>
          <label className={LABEL_CLASS}>Gender *</label>
          <select
            className={SELECT_CLASS}
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
            className={SELECT_CLASS}
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
      </div>

      {/* Address */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className={LABEL_CLASS}>Block *</label>
          <input
            className={INPUT_CLASS}
            value={v("address_block")}
            onChange={(e) => onChange("address_block", e.target.value)}
          />
          <FieldError error={errors.address_block} />
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL_CLASS}>Street *</label>
          <input
            className={INPUT_CLASS}
            value={v("address_street")}
            onChange={(e) => onChange("address_street", e.target.value)}
          />
          <FieldError error={errors.address_street} />
        </div>
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
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={LABEL_CLASS}>Postal Code *</label>
          <input
            className={INPUT_CLASS}
            maxLength={6}
            value={v("address_postal")}
            onChange={(e) =>
              onChange("address_postal", e.target.value.replace(/\D/g, ""))
            }
          />
          <FieldError error={errors.address_postal} />
        </div>
        <div>
          <label className={LABEL_CLASS}>Contact Number *</label>
          <input
            className={INPUT_CLASS}
            value={v("contact_number")}
            onChange={(e) => onChange("contact_number", e.target.value)}
            placeholder="+6581234567"
          />
          <FieldError error={errors.contact_number} />
        </div>
        <div>
          <label className={LABEL_CLASS}>Email *</label>
          <input
            type="email"
            className={INPUT_CLASS}
            value={v("email")}
            onChange={(e) => onChange("email", e.target.value)}
          />
          <FieldError error={errors.email} />
        </div>
      </div>
    </div>
  );
}
