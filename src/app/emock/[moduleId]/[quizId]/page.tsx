import Link from "next/link";
import { notFound } from "next/navigation";
import {
  isValidModuleId,
  isValidQuizId,
  getModuleDef,
  getClientQuiz,
} from "@/lib/quiz";

export default async function QuizLandingPage({
  params,
}: {
  params: Promise<{ moduleId: string; quizId: string }>;
}) {
  const { moduleId, quizId } = await params;
  if (!isValidModuleId(moduleId) || !isValidQuizId(moduleId, quizId))
    notFound();

  const mod = getModuleDef(moduleId);
  const quiz = getClientQuiz(moduleId, quizId);
  if (!quiz) notFound();

  return (
    <>
      <Link
        href={`/emock/${moduleId}`}
        className="text-sm text-orange-600 hover:text-orange-700 mb-6 inline-block"
      >
        &larr; Back to {mod.code} quizzes
      </Link>

      <h1 className="text-2xl font-bold text-stone-900 mb-1">{quiz.title}</h1>
      <p className="text-sm text-stone-400 mb-6">{quiz.version}</p>

      <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
        <h2 className="font-semibold text-stone-900 mb-4">Instructions</h2>
        <ul className="space-y-2.5 text-sm text-stone-700">
          <li>
            &bull;{" "}
            <strong>
              {quiz.total_questions} multiple-choice questions
            </strong>
            , 4 options each (A&ndash;D)
          </li>
          <li>
            &bull; <strong>Single correct answer</strong> per question
          </li>
          <li>
            &bull; <strong>Time limit: {quiz.duration} minutes.</strong> Timer
            starts when you begin.
          </li>
          {quiz.grading.type === "two-part" ? (
            <>
              <li>
                &bull; <strong>Two-part scoring:</strong>
              </li>
              {quiz.grading.parts.map((part) => (
                <li key={part.name} className="ml-6">
                  &ndash; {part.name} (Q{part.startQ}&ndash;{part.endQ}):{" "}
                  <strong>{part.passPercent}%</strong> to pass
                </li>
              ))}
              <li className="ml-6">
                &ndash; You must pass <strong>both parts</strong> to pass the
                quiz.
              </li>
            </>
          ) : (
            <li>
              &bull; <strong>Passing grade: {quiz.passingGrade}</strong>
            </li>
          )}
          <li>
            &bull; <strong>+1</strong> for correct, <strong>0</strong> for wrong
            or blank. No negative marking.
          </li>
          <li>
            &bull; Answer all questions before submitting. Once submitted, you
            cannot change answers.
          </li>
        </ul>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm text-amber-700">
        Prepared by Lyfe. For internal training use only.
      </div>

      <Link
        href={`/emock/${moduleId}/${quizId}/take`}
        className="inline-block bg-orange-500 text-white font-semibold px-8 py-3 rounded-lg hover:bg-orange-600 transition-colors"
      >
        Start Quiz
      </Link>
    </>
  );
}
