import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidModuleId, getModuleDef, getQuizList } from "@/lib/quiz";

export default async function ModuleQuizPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  if (!isValidModuleId(moduleId)) notFound();

  const mod = getModuleDef(moduleId);
  const quizzes = getQuizList(moduleId);

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
      <p className="text-stone-500 mb-8">
        {mod.questionCount} MCQs per quiz &middot; {mod.duration} minutes
        &middot; {mod.passingGrade}
      </p>

      <div className="space-y-3">
        {quizzes.map((q) => (
          <Link
            key={q.id}
            href={`/emock/${moduleId}/${q.id}`}
            className="flex items-center justify-between bg-white rounded-xl border border-stone-200 p-5 hover:border-orange-300 hover:shadow-sm transition-all group"
          >
            <div>
              <h2 className="font-semibold text-stone-900 group-hover:text-orange-600 transition-colors">
                {q.title}
              </h2>
              <p className="text-sm text-stone-400 mt-0.5">{q.version}</p>
            </div>
            <span className="text-sm text-stone-400 group-hover:text-orange-500 transition-colors">
              Start &rarr;
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
