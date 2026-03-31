"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { calculateDiscScores, DISC_TYPE_INFO } from "./scoring";
import { sendDiscResultsEmail } from "@/lib/email";
import { generateDiscPdf } from "@/lib/pdf";
import { uploadCandidatePdf } from "@/lib/supabase/storage";
import { getAdminClient } from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";

export async function submitDiscQuiz(responses: Record<string, number>, resultsEmail?: string, durationSeconds?: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  // Verify all 38 questions answered
  const answeredCount = Object.keys(responses).length;
  if (answeredCount < 38) {
    return { error: `Please answer all questions (${answeredCount}/38).` };
  }

  // Save raw responses
  const { error: respError } = await supabase
    .from("disc_responses")
    .upsert(
      {
        user_id: user.id,
        responses,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (respError) {
    return { error: respError.message };
  }

  // Calculate scores
  const scores = calculateDiscScores(responses);

  // Save results (exclude derived fields that aren't DB columns)
  const { profile_strength, strength_pct, priorities, ...dbScores } = scores;

  const { error: resultError } = await supabase
    .from("disc_results")
    .upsert(
      {
        user_id: user.id,
        results_email: resultsEmail || null,
        duration_seconds: durationSeconds ?? null,
        ...dbScores,
      },
      { onConflict: "user_id" }
    );

  if (resultError) {
    return { error: resultError.message };
  }

  // Fetch candidate name for the email
  const { data: profile } = await supabase
    .from("candidate_profiles")
    .select("full_name, contact_number")
    .eq("user_id", user.id)
    .single();

  // Generate PDF, upload to storage, and update invitation (don't block on failure)
  const isBalanced = profile_strength === "balanced";
  const typeInfo = isBalanced ? DISC_TYPE_INFO["Balanced"] : DISC_TYPE_INFO[scores.disc_type];
  // Generate PDF + send email after response (runs reliably via Next.js after())
  const userId = user.id;
  const candidateName = profile?.full_name || "Unknown";
  const contactNumber = profile?.contact_number || "";
  after(async () => {
    if (typeInfo) {
      try {
        const pdfBuffer = await generateDiscPdf({
          full_name: candidateName,
          disc_type: scores.disc_type,
          d_pct: scores.d_pct,
          i_pct: scores.i_pct,
          s_pct: scores.s_pct,
          c_pct: scores.c_pct,
          angle: scores.angle,
          profile_strength,
          strength_pct,
          priorities,
          typeInfo,
        });
        const filePath = await uploadCandidatePdf(userId, "disc-profile", pdfBuffer);
        if (filePath) {
          const admin = getAdminClient();
          await admin.from("invitations")
            .update({ disc_pdf_path: filePath })
            .eq("user_id", userId);
        }
      } catch (err) {
        Sentry.captureException(err, { tags: { action: "disc-pdf-upload" } });
        console.error("[pdf-upload] DISC PDF storage failed:", err);
      }
    }

    try {
      await sendDiscResultsEmail({
        full_name: candidateName,
        disc_type: scores.disc_type,
        d_pct: scores.d_pct,
        i_pct: scores.i_pct,
        s_pct: scores.s_pct,
        c_pct: scores.c_pct,
        angle: scores.angle,
        profile_strength,
        strength_pct,
        priorities,
        results_email: resultsEmail || "",
        contact_number: contactNumber,
      });
    } catch (err) {
      Sentry.captureException(err, { tags: { action: "disc-results-email" } });
      console.error("[email] sendDiscResultsEmail failed:", err);
    }
  });

  redirect("/candidate/disc-results");
}

export async function saveQuizProgress(responses: Record<string, number>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase.from("disc_responses").upsert(
    {
      user_id: user.id,
      responses,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[saveQuizProgress] upsert failed:", error);
    return { success: false, error: "Failed to save progress. Please try again." };
  }

  return { success: true };
}
