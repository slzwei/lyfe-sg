import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import EnneagramQuiz from "./EnneagramQuiz";
import type { QuizQuestion, EnneagramType } from "@/app/enneagram/scoring";

type RpcRow = {
  question_number: number;
  options: { A?: string; B?: string } | null;
  explanation: string | null;
};

export const dynamic = "force-dynamic";

export default async function EnneagramQuizPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/candidate/login");

  const { data: profile } = await supabase
    .from("candidate_profiles")
    .select("completed, email")
    .eq("user_id", user.id)
    .single();

  if (!profile?.completed) redirect("/candidate/onboarding");

  const { data: existingResults } = await supabase
    .from("enneagram_results")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existingResults) redirect("/candidate/enneagram-results");

  const { data: savedResponses } = await supabase
    .from("enneagram_responses")
    .select("responses")
    .eq("user_id", user.id)
    .single();

  const { data: rows } = await supabase.rpc("get_enneagram_sampler_questions");

  const questions: QuizQuestion[] = ((rows as RpcRow[]) || [])
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
        // ignore
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

  if (questions.length === 0) {
    return (
      <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center">
        <h1 className="text-xl font-bold text-stone-800">Quiz unavailable</h1>
        <p className="mt-2 text-sm text-stone-500">The Enneagram reading could not be loaded. Please try again shortly.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Enneagram Personality Quiz</h1>
        <p className="mt-1 text-sm text-stone-500">
          Pick the statement that feels more like you. There are no right or wrong answers.
        </p>
      </div>
      <EnneagramQuiz
        userId={user.id}
        questions={questions}
        initialResponses={(savedResponses?.responses as Record<string, "A" | "B"> | null) ?? null}
        initialEmail={profile?.email || ""}
      />
    </div>
  );
}
