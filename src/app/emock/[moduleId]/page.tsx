import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidModuleId, getModuleDef, getQuizList } from "@/lib/quiz";
import { getAttempts, getInProgressQuizIds } from "../actions";
import ModeTabs from "./ModeTabs";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ModuleQuizPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  if (!isValidModuleId(moduleId)) notFound();

  const mod = getModuleDef(moduleId);
  const quizzes = getQuizList(moduleId);
  const [attempts, inProgressIds] = await Promise.all([
    getAttempts(moduleId),
    getInProgressQuizIds(moduleId),
  ]);

  const attemptsByQuiz = new Map<string, typeof attempts>();
  for (const a of attempts) {
    const list = attemptsByQuiz.get(a.quiz_id) ?? [];
    list.push(a);
    attemptsByQuiz.set(a.quiz_id, list);
  }

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
        {mod.questionCount} MCQs per quiz &middot; {mod.duration} minutes
        &middot; {mod.passingGrade}
      </p>

      <ModeTabs moduleId={moduleId} active="exam" />

      <div className="space-y-3">
        {quizzes.map((q) => {
          const quizAttempts = attemptsByQuiz.get(q.id) ?? [];
          const best = quizAttempts.length
            ? quizAttempts.reduce((a, b) => (a.score > b.score ? a : b))
            : null;
          const isInProgress = inProgressIds.includes(q.id);

          return (
            <div
              key={q.id}
              className="bg-white rounded-xl border border-stone-200 overflow-hidden"
            >
              <Link
                href={`/emock/${moduleId}/${q.id}`}
                className="flex items-center justify-between p-5 hover:bg-stone-50 transition-colors group"
              >
                <div>
                  <h2 className="font-semibold text-stone-900 group-hover:text-orange-600 transition-colors">
                    {q.title}
                  </h2>
                  <p className="text-sm text-stone-400 mt-0.5">{q.version}</p>
                </div>
                <div className="flex items-center gap-3">
                  {isInProgress && (
                    <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                      In progress
                    </span>
                  )}
                  {best && (
                    <span
                      className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${
                        best.passed
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      Best: {best.score}/{best.total}
                    </span>
                  )}
                  <span className="text-sm text-stone-400 group-hover:text-orange-500 transition-colors">
                    {isInProgress ? "Resume" : "Start"} &rarr;
                  </span>
                </div>
              </Link>

              {quizAttempts.length > 0 && (
                <div className="border-t border-stone-100 px-5 py-3 bg-stone-50/50">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
                    {quizAttempts.length} attempt
                    {quizAttempts.length !== 1 ? "s" : ""}
                  </p>
                  <div className="space-y-1.5">
                    {quizAttempts.slice(0, 5).map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-stone-500">
                          {formatDate(a.completed_at)}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-stone-400">
                            {formatDuration(a.time_taken_seconds)}
                          </span>
                          <span
                            className={`font-medium ${
                              a.passed ? "text-green-600" : "text-red-500"
                            }`}
                          >
                            {a.score}/{a.total}
                          </span>
                        </div>
                      </div>
                    ))}
                    {quizAttempts.length > 5 && (
                      <p className="text-xs text-stone-400">
                        + {quizAttempts.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
