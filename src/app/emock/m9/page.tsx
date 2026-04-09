import Link from "next/link";
import { QUIZ_META } from "@/lib/m9-quiz";

export default function M9QuizPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-stone-900 mb-1">
        CMFAS Module 9 Practice
      </h1>
      <p className="text-stone-500 mb-8">
        100 MCQs per quiz · 120 minutes · 70% to pass
      </p>

      <div className="space-y-3">
        {QUIZ_META.map((q) => (
          <Link
            key={q.id}
            href={`/emock/m9/${q.id}`}
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
