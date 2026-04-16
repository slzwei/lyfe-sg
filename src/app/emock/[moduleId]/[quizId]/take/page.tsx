import { notFound } from "next/navigation";
import { isValidModuleId, isValidQuizId, getClientQuiz } from "@/lib/quiz";
import { startQuiz } from "@/app/emock/actions";
import QuizClient from "./QuizClient";

export default async function QuizTakePage({
  params,
}: {
  params: Promise<{ moduleId: string; quizId: string }>;
}) {
  const { moduleId, quizId } = await params;
  if (!isValidModuleId(moduleId) || !isValidQuizId(moduleId, quizId))
    notFound();
  const quiz = getClientQuiz(moduleId, quizId);
  if (!quiz) notFound();

  const attempt = await startQuiz(moduleId, quizId);

  return (
    <QuizClient
      quiz={quiz}
      attemptId={attempt.id}
      savedAnswers={attempt.answers}
      startedAt={attempt.started_at}
    />
  );
}
