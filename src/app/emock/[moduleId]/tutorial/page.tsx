import Link from "next/link";
import { notFound } from "next/navigation";
import {
  isValidModuleId,
  getModuleDef,
  getChaptersForModule,
  UNCATEGORISED_KEY,
} from "@/lib/quiz";
import { getChapterStats } from "./actions";
import ModeTabs from "../ModeTabs";

export default async function TutorialChapterPickerPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  if (!isValidModuleId(moduleId)) notFound();

  const mod = getModuleDef(moduleId);
  const chapters = getChaptersForModule(moduleId);
  const stats = await getChapterStats(moduleId);
  const statsByKey = new Map(stats.map((s) => [s.chapter_key, s]));

  const onlyUncat =
    chapters.length === 1 && chapters[0].key === UNCATEGORISED_KEY;

  return (
    <>
      <Link
        href="/emock"
        className="text-sm text-orange-600 hover:text-orange-700 mb-6 inline-block"
      >
        &larr; Back to modules
      </Link>

      <h1 className="text-2xl font-bold text-stone-900 mb-1">
        {mod.code}: {mod.title}
      </h1>
      <p className="text-stone-500 mb-6">
        Practice by chapter. Immediate feedback after each question — no timer,
        no submission.
      </p>

      <ModeTabs moduleId={moduleId} active="tutorial" />

      {onlyUncat && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
          Chapter references haven&apos;t been added to this module&apos;s
          questions yet. All {chapters[0].questionCount} questions are grouped
          together for now.
        </div>
      )}

      <div className="space-y-3">
        {chapters.map((c) => {
          const s = statsByKey.get(c.key);
          const isUncat = c.key === UNCATEGORISED_KEY;
          return (
            <Link
              key={c.key}
              href={`/emock/${moduleId}/tutorial/${c.key}`}
              className={`block rounded-xl border p-5 transition-all group ${
                isUncat
                  ? "bg-stone-50 border-stone-200 hover:border-stone-300"
                  : "bg-white border-stone-200 border-l-4 border-l-orange-500 hover:shadow-md hover:border-stone-300"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2
                    className={`font-semibold mb-1 ${
                      isUncat
                        ? "text-stone-500"
                        : "text-stone-900 group-hover:text-orange-600 transition-colors"
                    }`}
                  >
                    {c.label}
                  </h2>
                  <div className="flex items-center gap-3 text-sm text-stone-500">
                    <span>
                      {c.questionCount} question
                      {c.questionCount !== 1 ? "s" : ""}
                    </span>
                    {s && s.attempted > 0 && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-stone-300" />
                        <span>
                          {s.attempted}/{c.questionCount} attempted
                        </span>
                        <span className="w-1 h-1 rounded-full bg-stone-300" />
                        <span
                          className={
                            s.correct === s.attempted
                              ? "text-green-600"
                              : "text-stone-500"
                          }
                        >
                          {s.correct} correct
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-stone-300 group-hover:text-orange-500 transition-colors">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m8.25 4.5 7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
