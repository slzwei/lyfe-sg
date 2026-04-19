"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { scoreQuiz, type EnneagramType, type QuizQuestion } from "@/app/enneagram/scoring";
import { TYPE_INFO } from "@/app/enneagram/type-info";
import { sendEnneagramResultsEmail } from "@/lib/email";
import { generateEnneagramPdf } from "@/lib/pdf";
import { uploadCandidatePdf } from "@/lib/supabase/storage";
import { getAdminClient } from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";

const TOTAL_QUESTIONS = 36;

type ResponsesMap = Record<string, "A" | "B">;

async function loadQuestions(): Promise<QuizQuestion[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase.rpc("get_enneagram_sampler_questions");
  if (error || !rows) return [];
  return (rows as Array<{ question_number: number; options: { A?: string; B?: string } | null; explanation: string | null }>)
    .map((row) => {
      let typeA: EnneagramType = 1;
      let typeB: EnneagramType = 1;
      try {
        const explanation = typeof row.explanation === "string" ? JSON.parse(row.explanation) : row.explanation;
        if (explanation?.quiz_type === "enneagram" && explanation.types) {
          typeA = Number(explanation.types.A) as EnneagramType;
          typeB = Number(explanation.types.B) as EnneagramType;
        }
      } catch {
        // ignore — default to 1
      }
      return {
        question_number: row.question_number,
        optionA: row.options?.A ?? "",
        optionB: row.options?.B ?? "",
        typeA,
        typeB,
      };
    })
    .filter((q) => q.optionA && q.optionB);
}

export async function submitEnneagramQuiz(
  responses: ResponsesMap,
  resultsEmail?: string,
  durationSeconds?: number,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const answeredCount = Object.keys(responses).length;
  if (answeredCount < TOTAL_QUESTIONS) {
    return { error: `Please answer all questions (${answeredCount}/${TOTAL_QUESTIONS}).` };
  }

  const { error: respError } = await supabase
    .from("enneagram_responses")
    .upsert({ user_id: user.id, responses, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (respError) return { error: respError.message };

  const questions = await loadQuestions();
  if (questions.length === 0) return { error: "Unable to load questions for scoring." };

  const answerMap: Record<number, "A" | "B"> = {};
  for (const [qNum, pick] of Object.entries(responses)) {
    answerMap[Number(qNum)] = pick;
  }
  const scored = scoreQuiz(questions, answerMap);

  const { error: resultError } = await supabase
    .from("enneagram_results")
    .upsert(
      {
        user_id: user.id,
        scores: scored.scores,
        primary_type: scored.primary,
        wing_type: scored.wing,
        total: scored.total,
        results_email: resultsEmail || null,
        duration_seconds: durationSeconds ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (resultError) return { error: resultError.message };

  const { data: profile } = await supabase
    .from("candidate_profiles")
    .select("full_name, contact_number")
    .eq("user_id", user.id)
    .single();

  const userId = user.id;
  const candidateName = profile?.full_name || "Candidate";
  const contactNumber = profile?.contact_number || "";
  const primaryInfo = TYPE_INFO[scored.primary];
  const wingInfo = scored.wing ? TYPE_INFO[scored.wing] : null;

  after(async () => {
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generateEnneagramPdf({
        full_name: candidateName,
        primary_type: scored.primary,
        wing_type: scored.wing,
        scores: scored.scores,
        primaryInfo,
        wingInfo,
      });
      const filePath = await uploadCandidatePdf(userId, "enneagram-profile", pdfBuffer);
      if (filePath) {
        const admin = getAdminClient();
        await admin.from("invitations")
          .update({ enneagram_pdf_path: filePath })
          .eq("user_id", userId);
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { action: "enneagram-pdf-upload" } });
      console.error("[pdf-upload] Enneagram PDF storage failed:", err);
    }

    try {
      await sendEnneagramResultsEmail({
        full_name: candidateName,
        primary_type: scored.primary,
        wing_type: scored.wing,
        scores: scored.scores,
        primaryInfo,
        wingInfo,
        results_email: resultsEmail || "",
        contact_number: contactNumber,
        pdfBuffer: pdfBuffer || undefined,
      });
    } catch (err) {
      Sentry.captureException(err, { tags: { action: "enneagram-results-email" } });
      console.error("[email] sendEnneagramResultsEmail failed:", err);
    }
  });

  redirect("/candidate/enneagram-results");
}

export async function saveQuizProgress(responses: ResponsesMap) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("enneagram_responses")
    .upsert({ user_id: user.id, responses, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  if (error) {
    console.error("[saveQuizProgress] upsert failed:", error);
    return { success: false, error: "Failed to save progress. Please try again." };
  }
  return { success: true };
}
