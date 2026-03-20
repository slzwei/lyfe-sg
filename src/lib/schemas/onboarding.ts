import { z } from "zod";

export const step1Schema = z.object({
  position_applied: z.string().min(1, "Required"),
  expected_salary: z.string().min(1, "Required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Must be a valid positive number"
  ),
  date_available: z.string().min(1, "Required").refine(
    (val) => new Date(val) >= new Date(new Date().toDateString()),
    "Must be today or a future date"
  ),
  full_name: z.string().min(1, "Full name is required"),
  date_of_birth: z.string().min(1, "Date of birth is required").refine(
    (val) => {
      const dob = new Date(val);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear() -
        (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
      return dob <= today && age >= 18;
    },
    "Applicant must be at least 18 years old"
  ),
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
    emergency_contact: z.string().min(1, "Required").regex(
      /^\+?\d{8,15}$/,
      "Must be a valid phone number (8-15 digits, optional + prefix)"
    ),
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
      // NS status only required if not exempted
      if (data.ns_service_status !== "Exempted" && !data.ns_status) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required for SG males",
          path: ["ns_status"],
        });
      }
      // Enlistment & ORD dates required for served personnel
      const served =
        data.ns_service_status === "NSF" ||
        data.ns_service_status === "NSman";
      if (served) {
        if (!data.ns_enlistment_date) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Required",
            path: ["ns_enlistment_date"],
          });
        }
        if (!data.ns_ord_date) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Required",
            path: ["ns_ord_date"],
          });
        }
        if (
          data.ns_enlistment_date &&
          data.ns_ord_date &&
          data.ns_ord_date <= data.ns_enlistment_date
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "ORD date must be after enlistment date",
            path: ["ns_ord_date"],
          });
        }
      }
    }
  });

const educationSchema = z
  .object({
    currently_studying: z.preprocess((v) => v === true, z.boolean()),
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
      // Expected end must be after year commenced
      if (
        data.current_year_commenced &&
        data.current_expected_end_date &&
        Number(data.current_expected_end_date) <
          Number(data.current_year_commenced)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must be after year commenced",
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

const employmentRowSchema = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
    is_current: z.boolean().optional(),
    company: z.string().min(1, "Required"),
    position: z.string().min(1, "Required"),
    salary: z.string().optional(),
    reason_leaving: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // "From" must not be in the future
    if (data.from) {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      if (data.from > currentMonth) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Start date cannot be in the future",
          path: ["from"],
        });
      }
    }
    // "To" must be after "From"
    if (data.from && data.to && !data.is_current && data.to < data.from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be after start date",
        path: ["to"],
      });
    }
  });

export const step5Schema = z
  .object({
    employment_history: z.array(employmentRowSchema),
  })
  .superRefine((data, ctx) => {
    const currentCount = data.employment_history.filter(
      (row) => row.is_current
    ).length;
    if (currentCount > 1) {
      // Find the second "is_current" row and flag it
      let seen = 0;
      for (let i = 0; i < data.employment_history.length; i++) {
        if (data.employment_history[i].is_current) {
          seen++;
          if (seen > 1) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Only one position can be marked as current",
              path: ["employment_history", i, "is_current"],
            });
          }
        }
      }
    }
  });

export const step6Schema = z
  .object({
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
  })
  .superRefine((data, ctx) => {
    const pairs: Array<{ flag: keyof typeof data; detail: keyof typeof data }> =
      [
        { flag: "additional_health", detail: "additional_health_detail" },
        { flag: "additional_dismissed", detail: "additional_dismissed_detail" },
        { flag: "additional_convicted", detail: "additional_convicted_detail" },
        { flag: "additional_bankrupt", detail: "additional_bankrupt_detail" },
        { flag: "additional_relatives", detail: "additional_relatives_detail" },
        {
          flag: "additional_prev_applied",
          detail: "additional_prev_applied_detail",
        },
      ];
    for (const { flag, detail } of pairs) {
      if (data[flag] === true && !data[detail]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please provide details",
          path: [detail],
        });
      }
    }
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
