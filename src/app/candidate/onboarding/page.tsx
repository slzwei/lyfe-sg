import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/candidate/login");
  }

  // Check for existing profile
  const { data: profile } = await supabase
    .from("candidate_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // If profile is completed, move to quiz
  if (profile?.completed) {
    redirect("/candidate/disc-quiz");
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">
          Application Form
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Complete all sections below. Your progress is saved automatically.
        </p>
      </div>
      <OnboardingForm userId={user.id} initialData={profile} />
    </div>
  );
}
