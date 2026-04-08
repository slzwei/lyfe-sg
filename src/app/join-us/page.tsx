import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import JoinUsForm from "./JoinUsForm";

export default async function JoinUsPage() {
  // If already authenticated as candidate, redirect to quiz or results
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const role = user.app_metadata?.role;
    if (role === "candidate") {
      // Check if they already completed the quiz
      const { data: discResult } = await supabase
        .from("disc_results")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (discResult) {
        redirect("/join-us/results");
      }
      redirect("/join-us/quiz");
    }
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-stone-800 sm:text-3xl">
          Join Our Team
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Start your application in under a minute. You&apos;ll then complete a
          short personality quiz.
        </p>
      </div>

      <JoinUsForm />
    </div>
  );
}
