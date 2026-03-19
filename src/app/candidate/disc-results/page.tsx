import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CircumplexChart from "./CircumplexChart";
import { DISC_TYPE_INFO } from "../disc-quiz/scoring";
import { signOut } from "../actions";

const BAR_COLORS: Record<string, string> = {
  D: "bg-[#2B8C8C]",
  I: "bg-[#7B5EA7]",
  S: "bg-[#D4876C]",
  C: "bg-[#4A7FB5]",
};

const BAR_LABELS: Record<string, string> = {
  D: "Drive",
  I: "Influence",
  S: "Support",
  C: "Clarity",
};

export default async function DiscResultsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/candidate/login");
  }

  const { data: results } = await supabase
    .from("disc_results")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!results) {
    redirect("/candidate/disc-quiz");
  }

  const typeInfo = DISC_TYPE_INFO[results.disc_type];
  const scores = [
    { key: "D", pct: results.d_pct },
    { key: "I", pct: results.i_pct },
    { key: "S", pct: results.s_pct },
    { key: "C", pct: results.c_pct },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-stone-400">
          Your DISC Profile
        </p>
        <h1 className="mt-2 text-3xl font-bold text-stone-800">
          {typeInfo?.fullName || results.disc_type}
        </h1>
        {typeInfo && (
          <p className="mt-2 text-lg italic text-stone-500">
            &ldquo;{typeInfo.motto}&rdquo;
          </p>
        )}
      </div>

      {/* Type badge */}
      {typeInfo && (
        <div className="mx-auto max-w-md rounded-2xl border border-stone-200 bg-white p-6 text-center">
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            {typeInfo.descriptors.map((d) => (
              <span
                key={d}
                className="rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700"
              >
                {d}
              </span>
            ))}
          </div>
          <p className="text-sm text-stone-600">{typeInfo.description}</p>
        </div>
      )}

      {/* Chart */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6">
        <CircumplexChart
          d={results.d_pct}
          i={results.i_pct}
          s={results.s_pct}
          c={results.c_pct}
          angle={results.angle}
        />
      </div>

      {/* Score bars */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-stone-800">
          Score Breakdown
        </h2>
        <div className="space-y-3">
          {scores.map(({ key, pct }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-20 text-sm font-medium text-stone-600">
                {BAR_LABELS[key]}
              </span>
              <div className="flex-1">
                <div className="h-6 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className={`h-6 rounded-full ${BAR_COLORS[key]} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <span className="w-10 text-right text-sm font-semibold text-stone-700">
                {pct}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Blind Spots */}
      {typeInfo && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <h3 className="mb-2 text-sm font-semibold text-stone-800">
              Strengths
            </h3>
            <p className="text-sm text-stone-600">{typeInfo.strengths}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <h3 className="mb-2 text-sm font-semibold text-stone-800">
              Blind Spots
            </h3>
            <p className="text-sm text-stone-600">{typeInfo.blindSpots}</p>
          </div>
        </div>
      )}

      {/* Completion */}
      <div className="rounded-3xl border border-stone-200 bg-orange-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-stone-800">
          Application Complete
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          Thank you for completing your application and personality
          assessment. Our team will review your profile and get back to you
          soon.
        </p>
        <form action={signOut} className="mt-4">
          <button
            type="submit"
            className="rounded-xl border border-stone-200 bg-white px-6 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
}
