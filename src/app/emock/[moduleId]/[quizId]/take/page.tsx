import { notFound } from "next/navigation";
import { isValidModuleId, isValidQuizId, getClientQuiz } from "@/lib/quiz";
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
  return <QuizClient quiz={quiz} />;
}
