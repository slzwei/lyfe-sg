import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import JoinUsQuiz from "./JoinUsQuiz";

export default async function JoinUsQuizPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "candidate") {
    redirect("/join-us");
  }

  // Already completed quiz? Go to results
  const { data: existing } = await supabase
    .from("disc_results")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    redirect("/join-us/results");
  }

  // Load saved progress
  const { data: saved } = await supabase
    .from("disc_responses")
    .select("responses")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs font-medium text-green-600">Application</span>
          </div>
          <div className="h-px w-8 bg-stone-200" />
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
              2
            </div>
            <span className="text-xs font-semibold text-orange-600">Personality Quiz</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-stone-800">
          Work Style Quiz
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          38 questions &middot; ~5 minutes &middot; No right or wrong answers
        </p>
      </div>

      <JoinUsQuiz
        initialResponses={(saved?.responses as Record<string, number>) || null}
      />
    </div>
  );
}
