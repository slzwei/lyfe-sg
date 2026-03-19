"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { calculateDiscScores } from "./scoring";

export async function submitDiscQuiz(responses: Record<string, number>) {
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
        ...scores,
      },
      { onConflict: "user_id" }
    );

  if (resultError) {
    return { error: resultError.message };
  }

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
