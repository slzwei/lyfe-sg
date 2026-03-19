"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { calculateDiscScores } from "./scoring";
import { sendDiscResultsEmail } from "@/lib/email";

export async function submitDiscQuiz(responses: Record<string, number>, resultsEmail?: string) {
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

  // Save results
  const { error: resultError } = await supabase
    .from("disc_results")
    .upsert(
      {
        user_id: user.id,
        results_email: resultsEmail || null,
        ...scores,
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

  // Send email notification (don't block on failure)
  sendDiscResultsEmail({
    full_name: profile?.full_name || "Unknown",
    disc_type: scores.disc_type,
    d_pct: scores.d_pct,
    i_pct: scores.i_pct,
    s_pct: scores.s_pct,
    c_pct: scores.c_pct,
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
