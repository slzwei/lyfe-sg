"use server";

import { getAdminClient } from "@/lib/supabase/admin";
import { uploadCandidatePdf } from "@/lib/supabase/storage";
import { generateProfilePdf, generateDiscPdf, type FullProfileData } from "@/lib/pdf";
import { computeDerivedFields, DISC_TYPE_INFO } from "@/app/candidate/disc-quiz/scoring";
import { requireStaff } from "./auth";

/**
 * Backfill PDFs for existing candidates who completed their application/quiz
 * before PDF storage was added. Runs once on staff portal load.
 */
export async function backfillPdfs(): Promise<{ generated: number }> {
  const staff = await requireStaff();
  if (!staff) return { generated: 0 };

  const adminClient = getAdminClient();

  // Find invitations with completed work but missing PDFs
  const { data: invitations } = await adminClient.from("invitations")
    .select("id, user_id, profile_pdf_path, disc_pdf_path")
    .not("user_id", "is", null)
    .eq("status", "accepted");

  if (!invitations || invitations.length === 0) return { generated: 0 };

  let generated = 0;

  for (const inv of invitations) {
    const userId = inv.user_id!;

    // Backfill profile PDF
    if (!inv.profile_pdf_path) {
      const { data: profile } = await adminClient.from("candidate_profiles")
        .select("*")
        .eq("user_id", userId)
        .eq("completed", true)
        .single();

      if (profile) {
        try {
          const profileData: FullProfileData = {
            full_name: profile.full_name,
            position_applied: profile.position_applied || "",
            expected_salary: profile.expected_salary || "",
            salary_period: profile.salary_period || "month",
            date_available: profile.date_available,
            date_of_birth: profile.date_of_birth,
            place_of_birth: profile.place_of_birth || "",
            nationality: profile.nationality || "",
            race: profile.race || "",
            gender: profile.gender || "",
            marital_status: profile.marital_status || "",
            address_block: profile.address_block || "",
            address_street: profile.address_street || "",
            address_unit: profile.address_unit,
            address_postal: profile.address_postal || "",
            contact_number: profile.contact_number || "",
            email: profile.email || "",
            ns_enlistment_date: profile.ns_enlistment_date,
            ns_ord_date: profile.ns_ord_date,
            ns_service_status: profile.ns_service_status,
            ns_status: profile.ns_status,
            ns_exemption_reason: profile.ns_exemption_reason,
            emergency_name: profile.emergency_name || "",
            emergency_relationship: profile.emergency_relationship || "",
            emergency_contact: profile.emergency_contact || "",
            education: (profile.education || {}) as unknown as FullProfileData["education"],
            software_competencies: profile.software_competencies,
            shorthand_wpm: profile.shorthand_wpm,
            typing_wpm: profile.typing_wpm,
            languages: (profile.languages || []) as unknown as FullProfileData["languages"],
            employment_history: (profile.employment_history || []) as unknown as FullProfileData["employment_history"],
            additional_health: profile.additional_health ?? false,
            additional_health_detail: profile.additional_health_detail,
            additional_dismissed: profile.additional_dismissed ?? false,
            additional_dismissed_detail: profile.additional_dismissed_detail,
            additional_convicted: profile.additional_convicted ?? false,
            additional_convicted_detail: profile.additional_convicted_detail,
            additional_bankrupt: profile.additional_bankrupt ?? false,
            additional_bankrupt_detail: profile.additional_bankrupt_detail,
            additional_relatives: profile.additional_relatives ?? false,
            additional_relatives_detail: profile.additional_relatives_detail,
            additional_prev_applied: profile.additional_prev_applied ?? false,
            additional_prev_applied_detail: profile.additional_prev_applied_detail,
            declaration_agreed: profile.declaration_agreed ?? false,
            declaration_date: profile.declaration_date || new Date().toISOString(),
          };

          const pdfBuffer = await generateProfilePdf(profileData);
          const filePath = await uploadCandidatePdf(userId, "application", pdfBuffer);
          if (filePath) {
            await adminClient.from("invitations")
              .update({ profile_pdf_path: filePath })
              .eq("id", inv.id);
            generated++;
          }
        } catch (err) {
          console.error(`[backfill] Profile PDF failed for ${userId}:`, err);
        }
      }
    }

    // Backfill DISC PDF
    if (!inv.disc_pdf_path) {
      const [{ data: results }, { data: profile }] = await Promise.all([
        adminClient.from("disc_results").select("*").eq("user_id", userId).single(),
        adminClient.from("candidate_profiles").select("full_name").eq("user_id", userId).single(),
      ]);

      if (results) {
        try {
          const { profile_strength, strength_pct, priorities } = computeDerivedFields(
            results.d_raw, results.i_raw, results.s_raw, results.c_raw, results.angle
          );
          const isBalanced = profile_strength === "balanced";
          const typeInfo = isBalanced ? DISC_TYPE_INFO["Balanced"] : DISC_TYPE_INFO[results.disc_type];

          if (typeInfo) {
            const pdfBuffer = await generateDiscPdf({
              full_name: profile?.full_name || "Unknown",
              disc_type: results.disc_type,
              d_pct: results.d_pct,
              i_pct: results.i_pct,
              s_pct: results.s_pct,
              c_pct: results.c_pct,
              angle: results.angle,
              profile_strength,
              strength_pct,
              priorities,
              typeInfo,
            });
            const filePath = await uploadCandidatePdf(userId, "disc-profile", pdfBuffer);
            if (filePath) {
              await adminClient.from("invitations")
                .update({ disc_pdf_path: filePath })
                .eq("id", inv.id);
              generated++;
            }
          }
        } catch (err) {
          console.error(`[backfill] DISC PDF failed for ${userId}:`, err);
        }
      }
    }
  }

  console.log(`[backfill] Generated ${generated} PDFs`);
  return { generated };
}
