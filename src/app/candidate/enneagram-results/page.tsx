import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TYPE_INFO } from "@/app/enneagram/type-info";
import { ENNEAGRAM_TYPES, type EnneagramType } from "@/app/enneagram/scoring";
import { signOut } from "../actions";
import ResultsLive from "./ResultsLive";
import SignOutButton from "./SignOutButton";

export default async function EnneagramResultsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/candidate/login");

  const { data: results } = await supabase
    .from("enneagram_results")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!results) redirect("/candidate/enneagram-quiz");

  const primary = results.primary_type as EnneagramType;
  const wing = (results.wing_type ?? null) as EnneagramType | null;
  const scores = (results.scores as Record<string, number>) ?? {};

  const primaryInfo = TYPE_INFO[primary];
  const wingInfo = wing ? TYPE_INFO[wing] : null;
  const wingKey = wing ? `w${wing}` : null;
  const wingDesc = wingKey && primaryInfo.wings[wingKey] ? primaryInfo.wings[wingKey] : null;

  const ranked = ENNEAGRAM_TYPES.slice().sort(
    (a, b) => (scores[String(b)] ?? 0) - (scores[String(a)] ?? 0),
  );
  const maxScore = Math.max(...ENNEAGRAM_TYPES.map((t) => scores[String(t)] ?? 0), 1);

  const accent = primaryInfo.color;

  return (
    <div className="space-y-6">
      <ResultsLive userId={user.id} />

      {/* Hero card */}
      <div
        className="relative overflow-hidden rounded-3xl border px-6 py-8 text-center"
        style={{ borderColor: `${accent}33`, background: `${accent}0D` }}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-white/60 to-transparent" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-gradient-to-tr from-white/40 to-transparent" />

        <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
          Your Enneagram Type
        </p>
        <div className="relative mt-2 flex items-center justify-center gap-3">
          <span
            className="text-6xl font-bold leading-none"
            style={{ color: accent }}
          >
            {primary}
          </span>
          <div className="text-left">
            <h1 className="text-2xl font-bold text-stone-800">{primaryInfo.name}</h1>
            <p className="text-sm italic text-stone-500">{primaryInfo.epithet}</p>
          </div>
        </div>
        {wing && wingInfo && (
          <p className="relative mt-4 text-xs font-medium uppercase tracking-wider" style={{ color: accent }}>
            Type {primary}w{wing} · with a {wingInfo.name} wing
          </p>
        )}
        <p className="relative mx-auto mt-4 max-w-md text-sm leading-relaxed text-stone-600">
          {primaryInfo.summary}
        </p>
        <div className="relative mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-stone-500">
          <span className="rounded-full border border-stone-200 bg-white/70 px-3 py-1">
            Center · {primaryInfo.center}
          </span>
          <span className="rounded-full border border-stone-200 bg-white/70 px-3 py-1">
            Triad · {primaryInfo.triad}
          </span>
        </div>
      </div>

      {/* Fuller portrait */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">
          What it is to be {primaryInfo.name}
        </h2>
        <p className="text-sm leading-relaxed text-stone-600">{primaryInfo.longDesc}</p>
      </div>

      {/* Score breakdown */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">
          Your scores across all nine types
        </h2>
        <div className="space-y-3">
          {ranked.map((t) => {
            const info = TYPE_INFO[t];
            const score = scores[String(t)] ?? 0;
            const w = (score / maxScore) * 100;
            const isPrimary = t === primary;
            return (
              <div key={t} className="flex items-center gap-3">
                <span
                  className={`w-6 text-sm font-bold ${isPrimary ? "" : "text-stone-400"}`}
                  style={isPrimary ? { color: accent } : undefined}
                >
                  {t}
                </span>
                <span className={`w-32 shrink-0 text-sm ${isPrimary ? "font-semibold text-stone-800" : "text-stone-500"}`}>
                  {info.name}
                </span>
                <div className="relative flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${w}%`,
                        background: isPrimary ? accent : "#a8a29e",
                      }}
                    />
                  </div>
                </div>
                <span className={`w-8 text-right text-xs ${isPrimary ? "font-semibold" : "text-stone-400"}`}
                  style={isPrimary ? { color: accent } : undefined}>
                  {score}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strengths & Growth edges */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
              +
            </span>
            <h3 className="text-sm font-semibold text-emerald-800">At your best</h3>
          </div>
          <ul className="space-y-2">
            {primaryInfo.strengths.map((s) => (
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
            <h3 className="text-sm font-semibold text-amber-800">Where you grow</h3>
          </div>
          <ul className="space-y-2">
            {primaryInfo.growthEdges.map((g) => (
              <li key={g} className="flex gap-2 text-sm leading-relaxed text-amber-700/80">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                {g}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {wingInfo && wingDesc && (
        <div className="rounded-3xl border border-stone-200 bg-white p-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">
            Your wing · {primary}w{wing}
          </h2>
          <p className="text-sm leading-relaxed text-stone-600">
            Your dominant type colors the room; your wing shades it. You lean on{" "}
            <strong style={{ color: accent }}>
              Type {wingInfo.num}, {wingInfo.name}
            </strong>{" "}
            as a secondary source of energy and instinct.
          </p>
          <p className="mt-2 text-sm italic leading-relaxed text-stone-500">{wingDesc}.</p>
        </div>
      )}

      {/* Careers + relationships */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">At work</h3>
          <p className="text-sm leading-relaxed text-stone-600">{primaryInfo.careers}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">In relationships</h3>
          <p className="text-sm leading-relaxed text-stone-600">{primaryInfo.relationships}</p>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-xs leading-relaxed text-stone-400">
        The Enneagram is a map, not a verdict. This reflection is for personal insight —
        your type is a starting point, not a limit.
      </p>

      {/* Completion */}
      <div className="rounded-3xl border border-orange-200/60 bg-gradient-to-br from-orange-50 to-amber-50/50 p-6 text-center">
        <h2 className="text-lg font-semibold text-stone-800">Application Complete</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
          Thank you for completing your application and personality assessment. Our team will review your profile and get back to you soon.
        </p>
        <div className="mt-4">
          <SignOutButton userId={user.id} signOutAction={signOut} />
        </div>
      </div>
    </div>
  );
}
