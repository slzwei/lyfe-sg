"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { sendProfileSubmissionEmail } from "@/lib/email";
import { generateProfilePdf, type FullProfileData } from "@/lib/pdf";
import { uploadCandidatePdf } from "@/lib/supabase/storage";
import { getAdminClient } from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";
import type { Json } from "@/lib/supabase/database.types";
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
} from "@/lib/schemas/onboarding";

/** Pad "YYYY-MM" → "YYYY-MM-01" so Postgres date columns accept it. */
function toDate(v: unknown): string | null {
  const s = v as string;
  if (!s) return null;
  return s.length === 7 ? `${s}-01` : s;
}

export async function saveProfile(formData: Record<string, unknown>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  // Server-side validation (mirrors client-side Zod schemas)
  const v1 = step1Schema.safeParse(formData);
  if (!v1.success) return { error: "Validation failed: personal details are incomplete or invalid." };
  const v2 = step2Schema.safeParse(formData);
  if (!v2.success) return { error: "Validation failed: NS/emergency details are incomplete." };
  const v3 = step3Schema.safeParse(formData);
  if (!v3.success) return { error: "Validation failed: education details are incomplete." };
  const v4 = step4Schema.safeParse(formData);
  if (!v4.success) return { error: "Validation failed: skills details are invalid." };
  const v5 = step5Schema.safeParse(formData);
  if (!v5.success) return { error: "Validation failed: employment history is invalid." };
  const v6 = step6Schema.safeParse(formData);
  if (!v6.success) return { error: "Validation failed: declaration is incomplete." };

  // Look up candidate_id (required NOT NULL for upsert)
  const adminClient = getAdminClient();
  const { data: linkData } = await adminClient
    .from("candidate_profiles")
    .select("candidate_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!linkData?.candidate_id) {
    return { error: "Profile not initialized. Please reload the page and try again." };
  }

  const profile = {
    user_id: user.id,
    candidate_id: linkData.candidate_id,
    position_applied: formData.position_applied as string,
    expected_salary: formData.expected_salary as string,
    salary_period: (formData.salary_period as string) || "hour",
    date_available: (formData.date_available as string) || null,
    full_name: formData.full_name as string,
    date_of_birth: (formData.date_of_birth as string) || null,
    place_of_birth: formData.place_of_birth as string,
    nationality: formData.nationality as string,
    race: formData.race as string,
    gender: formData.gender as string,
    marital_status: formData.marital_status as string,
    address_block: formData.address_block as string,
    address_street: formData.address_street as string,
    address_unit: (formData.address_unit as string) || null,
    address_postal: formData.address_postal as string,
    contact_number: formData.contact_number as string,
    email: formData.email as string,
    ns_enlistment_date: toDate(formData.ns_enlistment_date),
    ns_ord_date: toDate(formData.ns_ord_date),
    ns_service_status: (formData.ns_service_status as string) || null,
    ns_status: (formData.ns_status as string) || null,
    ns_exemption_reason: (formData.ns_exemption_reason as string) || null,
    emergency_name: formData.emergency_name as string,
    emergency_relationship: formData.emergency_relationship as string,
    emergency_contact: formData.emergency_contact as string,
    education: formData.education as Json,
    software_competencies: (formData.software_competencies as string) || null,
    shorthand_wpm: formData.shorthand_wpm
      ? Number(formData.shorthand_wpm)
      : null,
    typing_wpm: formData.typing_wpm ? Number(formData.typing_wpm) : null,
    languages: formData.languages as Json,
    employment_history: formData.employment_history as Json,
    additional_health: formData.additional_health as boolean,
    additional_health_detail:
      (formData.additional_health_detail as string) || null,
    additional_dismissed: formData.additional_dismissed as boolean,
    additional_dismissed_detail:
      (formData.additional_dismissed_detail as string) || null,
    additional_convicted: formData.additional_convicted as boolean,
    additional_convicted_detail:
      (formData.additional_convicted_detail as string) || null,
    additional_bankrupt: formData.additional_bankrupt as boolean,
    additional_bankrupt_detail:
      (formData.additional_bankrupt_detail as string) || null,
    additional_relatives: formData.additional_relatives as boolean,
    additional_relatives_detail:
      (formData.additional_relatives_detail as string) || null,
    additional_prev_applied: formData.additional_prev_applied as boolean,
    additional_prev_applied_detail:
      (formData.additional_prev_applied_detail as string) || null,
    declaration_agreed: formData.declaration_agreed as boolean,
    declaration_date: new Date().toISOString(),
    completed: true,
  };

  const { error } = await supabase
    .from("candidate_profiles")
    .upsert(profile, { onConflict: "user_id" });

  if (error) {
    return { error: error.message };
  }

  // Sync phone to candidates table and auth user (for token-auth candidates
  // who didn't have a phone at sign-up time)
  if (profile.contact_number) {
    const adminClient = getAdminClient();
    const normalizedPhone = profile.contact_number.replace(/^\+/, "");

    // Update candidates.phone
    const { data: cp } = await adminClient.from("candidate_profiles")
      .select("candidate_id")
      .eq("user_id", user.id)
      .single();
    if (cp?.candidate_id) {
      await adminClient.from("candidates")
        .update({
          phone: normalizedPhone,
          name: profile.full_name || undefined,
        })
        .eq("id", cp.candidate_id);
    }

    // Update auth.users.phone so it's available for display
    await adminClient.auth.admin.updateUserById(user.id, {
      phone: normalizedPhone,
    }).catch((err) => {
      // Non-fatal: phone may already be in use by another auth user
      console.warn("[saveProfile] Failed to sync phone to auth user:", err);
    });
  }

  const profileData: FullProfileData = {
    full_name: profile.full_name,
    position_applied: profile.position_applied,
    expected_salary: profile.expected_salary,
    salary_period: profile.salary_period || "hour",
    date_available: profile.date_available,
    date_of_birth: profile.date_of_birth,
    place_of_birth: profile.place_of_birth,
    nationality: profile.nationality,
    race: profile.race,
    gender: profile.gender,
    marital_status: profile.marital_status,
    address_block: profile.address_block,
    address_street: profile.address_street,
    address_unit: profile.address_unit,
    address_postal: profile.address_postal,
    contact_number: profile.contact_number,
    email: profile.email,
    ns_enlistment_date: profile.ns_enlistment_date,
    ns_ord_date: profile.ns_ord_date,
    ns_service_status: profile.ns_service_status,
    ns_status: profile.ns_status,
    ns_exemption_reason: profile.ns_exemption_reason,
    emergency_name: profile.emergency_name,
    emergency_relationship: profile.emergency_relationship,
    emergency_contact: profile.emergency_contact,
    education: profile.education as unknown as FullProfileData["education"],
    software_competencies: profile.software_competencies,
    shorthand_wpm: profile.shorthand_wpm,
    typing_wpm: profile.typing_wpm,
    languages: profile.languages as unknown as { language: string; spoken: string; written: string }[],
    employment_history: profile.employment_history as Array<Record<string, unknown>>,
    additional_health: profile.additional_health,
    additional_health_detail: profile.additional_health_detail,
    additional_dismissed: profile.additional_dismissed,
    additional_dismissed_detail: profile.additional_dismissed_detail,
    additional_convicted: profile.additional_convicted,
    additional_convicted_detail: profile.additional_convicted_detail,
    additional_bankrupt: profile.additional_bankrupt,
    additional_bankrupt_detail: profile.additional_bankrupt_detail,
    additional_relatives: profile.additional_relatives,
    additional_relatives_detail: profile.additional_relatives_detail,
    additional_prev_applied: profile.additional_prev_applied,
    additional_prev_applied_detail: profile.additional_prev_applied_detail,
    declaration_agreed: profile.declaration_agreed,
    declaration_date: profile.declaration_date,
  };

  // Generate PDF + send email after response (runs reliably via Next.js after())
  const userId = user.id;
  after(async () => {
    try {
      const pdfBuffer = await generateProfilePdf(profileData);
      const filePath = await uploadCandidatePdf(userId, "application", pdfBuffer);
      if (filePath) {
        const admin = getAdminClient();
        await admin.from("invitations")
          .update({ profile_pdf_path: filePath })
          .eq("user_id", userId);
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { action: "profile-pdf-upload" } });
      console.error("[pdf-upload] Profile PDF storage failed:", err);
    }

    try {
      await sendProfileSubmissionEmail(profileData);
    } catch (err) {
      Sentry.captureException(err, { tags: { action: "profile-submission-email" } });
      console.error("[email] sendProfileSubmissionEmail failed:", err);
    }
  });

  redirect("/candidate/disc-quiz");
}

export async function saveDraft(formData: Record<string, unknown>, currentStep?: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Look up candidate_id (required NOT NULL for upsert)
  const adminClient = getAdminClient();
  const { data: linkData } = await adminClient
    .from("candidate_profiles")
    .select("candidate_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!linkData?.candidate_id) {
    return { success: false, error: "Profile not initialized. Please reload the page." };
  }

  const draft = {
    user_id: user.id,
    candidate_id: linkData.candidate_id,
    full_name: (formData.full_name as string) || "",
    position_applied: (formData.position_applied as string) || null,
    expected_salary: (formData.expected_salary as string) || null,
    salary_period: (formData.salary_period as string) || "hour",
    date_available: (formData.date_available as string) || null,
    date_of_birth: (formData.date_of_birth as string) || null,
    place_of_birth: (formData.place_of_birth as string) || null,
    nationality: (formData.nationality as string) || null,
    race: (formData.race as string) || null,
    gender: (formData.gender as string) || null,
    marital_status: (formData.marital_status as string) || null,
    address_block: (formData.address_block as string) || null,
    address_street: (formData.address_street as string) || null,
    address_unit: (formData.address_unit as string) || null,
    address_postal: (formData.address_postal as string) || null,
    contact_number: (formData.contact_number as string) || null,
    email: (formData.email as string) || null,
    ns_enlistment_date: toDate(formData.ns_enlistment_date),
    ns_ord_date: toDate(formData.ns_ord_date),
    ns_service_status: (formData.ns_service_status as string) || null,
    ns_status: (formData.ns_status as string) || null,
    ns_exemption_reason: (formData.ns_exemption_reason as string) || null,
    emergency_name: (formData.emergency_name as string) || null,
    emergency_relationship:
      (formData.emergency_relationship as string) || null,
    emergency_contact: (formData.emergency_contact as string) || null,
    education: (formData.education || {}) as Json,
    software_competencies:
      (formData.software_competencies as string) || null,
    shorthand_wpm: formData.shorthand_wpm
      ? Number(formData.shorthand_wpm)
      : null,
    typing_wpm: formData.typing_wpm ? Number(formData.typing_wpm) : null,
    languages: (formData.languages || []) as Json,
    employment_history: (formData.employment_history || []) as Json,
    completed: false,
    onboarding_step: currentStep || 1,
  };

  const { error } = await supabase
    .from("candidate_profiles")
    .upsert(draft, { onConflict: "user_id" });

  if (error) {
    console.error("[saveDraft] upsert failed:", error);
    return { success: false, error: "Failed to save draft. Please try again." };
  }

  return { success: true };
}
