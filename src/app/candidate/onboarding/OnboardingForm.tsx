"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StepIndicator from "@/components/ui/StepIndicator";
import Step1Personal from "./steps/Step1Personal";
import Step2NSEmergency from "./steps/Step2NSEmergency";
import Step3Education from "./steps/Step3Education";
import Step4Skills from "./steps/Step4Skills";
import Step5Employment from "./steps/Step5Employment";
import Step6Declaration from "./steps/Step6Declaration";
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
} from "@/lib/schemas/onboarding";
import { saveProfile, saveDraft } from "./actions";
import { broadcastProgress } from "@/lib/supabase/progress-broadcast";

const STEP_LABELS = [
  "Personal",
  "NS & Emergency",
  "Education",
  "Skills",
  "Employment",
  "Declaration",
];

const SCHEMAS = [
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
];

function getDefaultData(): Record<string, unknown> {
  return {
    position_applied: "",
    expected_salary: "",
    salary_period: "month",
    date_available: "",
    full_name: "",
    date_of_birth: "",
    place_of_birth: "",
    nationality: "",
    race: "",
    gender: "",
    marital_status: "",
    address_block: "",
    address_street: "",
    address_unit: "",
    address_postal: "",
    contact_number: "",
    email: "",
    ns_enlistment_date: "",
    ns_ord_date: "",
    ns_service_status: "",
    ns_status: "",
    ns_exemption_reason: "",
    emergency_name: "",
    emergency_relationship: "",
    emergency_contact: "",
    education: {
      currently_studying: false,
      current_qualification: "",
      current_institution: "",
      current_year_commenced: "",
      current_expected_end_date: "",
      highest_qualification: "",
      highest_institution: "",
      highest_year_completed: "",
    },
    software_competencies: "",
    shorthand_wpm: "",
    typing_wpm: "",
    languages: [{ language: "English", spoken: "", written: "" }],
    employment_history: [],
    additional_health: undefined,
    additional_health_detail: "",
    additional_dismissed: undefined,
    additional_dismissed_detail: "",
    additional_convicted: undefined,
    additional_convicted_detail: "",
    additional_bankrupt: undefined,
    additional_bankrupt_detail: "",
    additional_relatives: undefined,
    additional_relatives_detail: "",
    additional_prev_applied: undefined,
    additional_prev_applied_detail: "",
    declaration_agreed: false,
  };
}

interface OnboardingFormProps {
  userId: string;
  initialData?: Record<string, unknown> | null;
  userPhone?: string;
}

export default function OnboardingForm({ userId, initialData, userPhone }: OnboardingFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    const defaults = getDefaultData();
    if (initialData) {
      // Merge initial data, preferring non-null values
      for (const key of Object.keys(defaults)) {
        if (initialData[key] !== null && initialData[key] !== undefined) {
          // Deep-merge objects (e.g. education) so defaults are preserved
          if (
            typeof defaults[key] === "object" &&
            !Array.isArray(defaults[key]) &&
            typeof initialData[key] === "object" &&
            !Array.isArray(initialData[key])
          ) {
            defaults[key] = { ...(defaults[key] as Record<string, unknown>), ...(initialData[key] as Record<string, unknown>) };
          } else {
            defaults[key] = initialData[key];
          }
        }
      }
    }
    // Auto-populate contact number from login phone
    if (userPhone && !defaults.contact_number) {
      defaults.contact_number = userPhone;
    }
    return defaults;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(field: string, value: unknown) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error and any nested errors on change
    const hasRelated = Object.keys(errors).some(
      (k) => k === field || k.startsWith(field + ".")
    );
    if (hasRelated) {
      setErrors((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          if (k === field || k.startsWith(field + ".")) delete next[k];
        }
        return next;
      });
    }
  }

  function validateStep(step: number): boolean {
    const schema = SCHEMAS[step - 1];
    const result = schema.safeParse(formData);
    if (result.success) {
      setErrors({});
      return true;
    }
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) {
        fieldErrors[path] = issue.message;
      }
    }
    setErrors(fieldErrors);
    // Scroll to the first error field
    requestAnimationFrame(() => {
      const firstError = document.querySelector("[data-error]");
      if (firstError) {
        firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
    return false;
  }

  async function handleNext() {
    if (!validateStep(currentStep)) return;

    // Auto-save draft on step navigation and notify staff portal
    saveDraft(formData, currentStep + 1).catch(() => {});
    broadcastProgress(userId, "form");

    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Final submit
      setSubmitting(true);
      const result = await saveProfile(formData);
      if (result?.error) {
        setErrors({ _form: result.error });
        setSubmitting(false);
      }
      // On success, server action redirects to /candidate/disc-quiz
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setErrors({});
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function renderStep() {
    const props = { data: formData, onChange: handleChange, errors };
    switch (currentStep) {
      case 1: return <Step1Personal {...props} />;
      case 2: return <Step2NSEmergency {...props} />;
      case 3: return <Step3Education {...props} />;
      case 4: return <Step4Skills {...props} />;
      case 5: return <Step5Employment {...props} />;
      case 6: return <Step6Declaration {...props} />;
      default: return null;
    }
  }

  return (
    <div>
      <StepIndicator
        currentStep={currentStep}
        totalSteps={6}
        labels={STEP_LABELS}
      />

      <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 sm:p-8">
        {renderStep()}

        {errors._form && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {errors._form}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="rounded-xl border border-stone-200 px-6 py-3 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:invisible"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={submitting}
            className="rounded-xl bg-orange-500 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
          >
            {submitting
              ? "Submitting…"
              : currentStep === 6
                ? "Submit & Continue"
                : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
