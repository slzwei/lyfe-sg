import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CircumplexChart from "./CircumplexChart";
import { DISC_TYPE_INFO } from "../disc-quiz/scoring";
import { signOut } from "../actions";

const DISC_COLORS: Record<string, { text: string; bg: string; bar: string; border: string }> = {
  D: { text: "text-[#2B8C8C]", bg: "bg-[#2B8C8C]/5", bar: "bg-[#2B8C8C]", border: "border-[#2B8C8C]/20" },
  I: { text: "text-[#7B5EA7]", bg: "bg-[#7B5EA7]/5", bar: "bg-[#7B5EA7]", border: "border-[#7B5EA7]/20" },
  S: { text: "text-[#D4876C]", bg: "bg-[#D4876C]/5", bar: "bg-[#D4876C]", border: "border-[#D4876C]/20" },
  C: { text: "text-[#4A7FB5]", bg: "bg-[#4A7FB5]/5", bar: "bg-[#4A7FB5]", border: "border-[#4A7FB5]/20" },
};

const DISC_LABELS: Record<string, string> = {
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
  ].sort((a, b) => b.pct - a.pct);

  const primary = results.disc_type.charAt(0);
  const primaryColor = DISC_COLORS[primary] || DISC_COLORS.D;

  return (
    <div className="space-y-6">
      {/* Hero card — type result */}
      <div
        className={`relative overflow-hidden rounded-3xl border ${primaryColor.border} ${primaryColor.bg} px-6 py-8 text-center`}
      >
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-white/60 to-transparent" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-gradient-to-tr from-white/40 to-transparent" />

        <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
          Your DISC Profile
        </p>
        <h1 className={`relative mt-3 text-4xl font-bold ${primaryColor.text}`}>
          {typeInfo?.fullName || results.disc_type}
        </h1>
        {typeInfo && (
          <p className="relative mt-2 text-base italic text-stone-500">
            &ldquo;{typeInfo.motto}&rdquo;
          </p>
        )}

        {/* Descriptor pills */}
        {typeInfo && (
          <div className="relative mt-5 flex flex-wrap justify-center gap-2">
            {typeInfo.descriptors.map((d) => (
              <span
                key={d}
                className={`rounded-full border ${primaryColor.border} bg-white/70 px-3.5 py-1 text-xs font-medium ${primaryColor.text}`}
              >
                {d}
              </span>
            ))}
          </div>
        )}

        {typeInfo && (
          <p className="relative mx-auto mt-4 max-w-md text-sm leading-relaxed text-stone-600">
            {typeInfo.description}
          </p>
        )}
      </div>

      {/* Chart + Score breakdown side by side on desktop */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Chart */}
        <div className="rounded-3xl border border-stone-200 bg-white p-5 lg:col-span-3">
          <h2 className="mb-1 text-center text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">
            Personality Map
          </h2>
          <CircumplexChart
            d={results.d_pct}
            i={results.i_pct}
            s={results.s_pct}
            c={results.c_pct}
            angle={results.angle}
          />
        </div>

        {/* Score bars */}
        <div className="flex flex-col justify-center rounded-3xl border border-stone-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">
            Score Breakdown
          </h2>
          <div className="space-y-4">
            {scores.map(({ key, pct }) => {
              const colors = DISC_COLORS[key];
              return (
                <div key={key}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className={`text-sm font-semibold ${colors.text}`}>
                      {DISC_LABELS[key]}
                    </span>
                    <span className="text-lg font-bold text-stone-800">
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className={`h-2.5 rounded-full ${colors.bar} transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Strengths & Blind Spots */}
      {typeInfo && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                +
              </span>
              <h3 className="text-sm font-semibold text-emerald-800">
                Strengths
              </h3>
            </div>
            <ul className="space-y-2">
              {typeInfo.strengths.map((s) => (
                <li key={s} className="flex gap-2 text-sm leading-relaxed text-emerald-700/80">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                !
              </span>
              <h3 className="text-sm font-semibold text-amber-800">
                Blind Spots
              </h3>
            </div>
            <ul className="space-y-2">
              {typeInfo.blindSpots.map((b) => (
                <li key={b} className="flex gap-2 text-sm leading-relaxed text-amber-700/80">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-center text-xs leading-relaxed text-stone-400">
        This assessment is for personal reflection only. Your work style may
        vary across situations and over time.
      </p>

      {/* Completion */}
      <div className="rounded-3xl border border-orange-200/60 bg-gradient-to-br from-orange-50 to-amber-50/50 p-6 text-center">
        <h2 className="text-lg font-semibold text-stone-800">
          Application Complete
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
          Thank you for completing your application and personality assessment.
          Our team will review your profile and get back to you soon.
        </p>
        <form action={signOut} className="mt-4">
          <button
            type="submit"
            className="rounded-xl border border-stone-200 bg-white px-6 py-2.5 text-sm font-medium text-stone-600 shadow-sm transition-colors hover:bg-stone-50"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
}
