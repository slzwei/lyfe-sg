import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DiscQuiz from "./DiscQuiz";

export default async function DiscQuizPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/candidate/login");
  }

  // Check if profile is completed
  const { data: profile } = await supabase
    .from("candidate_profiles")
    .select("completed")
    .eq("user_id", user.id)
    .single();

  if (!profile?.completed) {
    redirect("/candidate/onboarding");
  }

  // Check if already has results
  const { data: existingResults } = await supabase
    .from("disc_results")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existingResults) {
    redirect("/candidate/disc-results");
  }

  // Fetch any saved progress
  const { data: savedResponses } = await supabase
    .from("disc_responses")
    .select("responses")
    .eq("user_id", user.id)
    .single();

  // Get email from candidate profile
  const { data: candidateProfile } = await supabase
    .from("candidate_profiles")
    .select("email")
    .eq("user_id", user.id)
    .single();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">
          DISC Personality Quiz
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Answer honestly — there are no right or wrong answers. This helps
          us understand your work style.
        </p>
      </div>
      <DiscQuiz
        userId={user.id}
        initialResponses={
          savedResponses?.responses as Record<string, number> | null
        }
        initialEmail={candidateProfile?.email || ""}
      />
    </div>
  );
}
