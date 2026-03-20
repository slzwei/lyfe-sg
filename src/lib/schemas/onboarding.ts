import { z } from "zod";

export const step1Schema = z.object({
  position_applied: z.string().min(1, "Required"),
  expected_salary: z.string().min(1, "Required"),
  date_available: z.string().min(1, "Required").refine(
    (val) => new Date(val) >= new Date(new Date().toDateString()),
    "Must be today or a future date"
  ),
  full_name: z.string().min(1, "Full name is required"),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  place_of_birth: z.string().min(1, "Required"),
  nationality: z.string().min(1, "Required"),
  race: z.string().min(1, "Required"),
  gender: z.string().min(1, "Required"),
  marital_status: z.string().min(1, "Required"),
  address_block: z.string().min(1, "Required"),
  address_street: z.string().min(1, "Required"),
  address_unit: z.string().optional(),
  address_postal: z.string().regex(/^\d{6}$/, "Must be 6 digits"),
  contact_number: z.string().regex(/^\+65\d{8}$/, "Invalid SG number"),
  email: z.string().email("Invalid email address"),
});

export const step2Schema = z
  .object({
    nationality: z.string().optional(),
    gender: z.string().optional(),
    ns_enlistment_date: z.string().optional(),
    ns_ord_date: z.string().optional(),
    ns_service_status: z.string().optional(),
    ns_status: z.string().optional(),
    ns_exemption_reason: z.string().optional(),
    emergency_name: z.string().min(1, "Required"),
    emergency_relationship: z.string().min(1, "Required"),
    emergency_contact: z.string().min(1, "Required"),
  })
  .superRefine((data, ctx) => {
    const isSGMale =
      data.nationality?.toLowerCase() === "singaporean" &&
      data.gender?.toLowerCase() === "male";
    if (isSGMale) {
      if (!data.ns_service_status) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for SG males",
          path: ["ns_service_status"],
        });
      }
      if (!data.ns_status) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for SG males",
          path: ["ns_status"],
        });
      }
    }
  });

const educationSchema = z
  .object({
    currently_studying: z.boolean(),
    current_qualification: z.string().optional(),
    current_institution: z.string().optional(),
    current_year_commenced: z.string().optional(),
    current_expected_end_date: z.string().optional(),
    highest_qualification: z.string().min(1, "Required"),
    highest_institution: z.string().min(1, "Required"),
    highest_year_completed: z.string().min(1, "Required"),
  })
  .superRefine((data, ctx) => {
    if (data.currently_studying) {
      if (!data.current_qualification) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required",
          path: ["current_qualification"],
        });
      }
      if (!data.current_institution) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required",
          path: ["current_institution"],
        });
      }
      if (!data.current_expected_end_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required",
          path: ["current_expected_end_date"],
        });
      }
    }
  });

export const step3Schema = z.object({
  education: educationSchema,
});

const languageRowSchema = z.object({
  language: z.string().min(1, "Required"),
  spoken: z.string().min(1, "Required"),
  written: z.string().min(1, "Required"),
});

export const step4Schema = z.object({
  software_competencies: z.string().optional(),
  shorthand_wpm: z.string().optional(),
  typing_wpm: z.string().optional(),
  languages: z.array(languageRowSchema),
});

const employmentRowSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  is_current: z.boolean().optional(),
  company: z.string().optional(),
  position: z.string().optional(),
  salary: z.string().optional(),
  reason_leaving: z.string().optional(),
});

export const step5Schema = z.object({
  employment_history: z.array(employmentRowSchema),
});

export const step6Schema = z.object({
  additional_health: z.boolean(),
  additional_health_detail: z.string().optional(),
  additional_dismissed: z.boolean(),
  additional_dismissed_detail: z.string().optional(),
  additional_convicted: z.boolean(),
  additional_convicted_detail: z.string().optional(),
  additional_bankrupt: z.boolean(),
  additional_bankrupt_detail: z.string().optional(),
  additional_relatives: z.boolean(),
  additional_relatives_detail: z.string().optional(),
  additional_prev_applied: z.boolean(),
  additional_prev_applied_detail: z.string().optional(),
  declaration_agreed: z.literal(true, {
    error: "You must agree to the declaration",
  }),
});

export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;
export type Step4Data = z.infer<typeof step4Schema>;
export type Step5Data = z.infer<typeof step5Schema>;
export type Step6Data = z.infer<typeof step6Schema>;

export type OnboardingData = Step1Data &
  Step2Data &
  Step3Data &
  Step4Data &
  Step5Data &
  Step6Data;
