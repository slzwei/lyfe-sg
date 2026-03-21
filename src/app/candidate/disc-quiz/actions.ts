"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { calculateDiscScores, DISC_TYPE_INFO } from "./scoring";
import { sendDiscResultsEmail } from "@/lib/email";
import { generateDiscPdf } from "@/lib/pdf";
import { uploadCandidatePdf } from "@/lib/supabase/storage";
import { getAdminClient } from "@/lib/supabase/admin";

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
  if (typeInfo) {
    (async () => {
      try {
        const pdfBuffer = await generateDiscPdf({
          full_name: profile?.full_name || "Unknown",
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
        const filePath = await uploadCandidatePdf(user.id, "disc-profile", pdfBuffer);
        if (filePath) {
          const admin = getAdminClient();
          await admin.from("invitations")
            .update({ disc_pdf_path: filePath })
            .eq("user_id", user.id);
        }
      } catch (err) {
        console.error("[pdf-upload] DISC PDF storage failed:", err);
      }
    })();
  }

  // Send email notification (don't block on failure)
  sendDiscResultsEmail({
    full_name: profile?.full_name || "Unknown",
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
    contact_number: profile?.contact_number || "",
  }).catch(() => {});

  redirect("/candidate/disc-results");
}

export async function saveQuizProgress(responses: Record<string, number>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("disc_responses").upsert(
    {
      user_id: user.id,
      responses,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}
