import { notFound } from "next/navigation";
import { isValidQuizId, getClientQuiz } from "@/lib/m9-quiz";
import QuizClient from "./QuizClient";

export default async function QuizTakePage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  if (!isValidQuizId(quizId)) notFound();
  const quiz = getClientQuiz(quizId);
  return <QuizClient quiz={quiz} />;
}
