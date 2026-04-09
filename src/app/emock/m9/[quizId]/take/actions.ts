"use server";

import {
  isValidQuizId,
  gradeQuizAnswers,
  type QuizResult,
} from "@/lib/m9-quiz";

export async function gradeQuiz(
  quizId: string,
  answers: Record<string, string>,
  timeTakenSeconds: number
): Promise<QuizResult> {
  if (!isValidQuizId(quizId)) throw new Error("Invalid quiz ID");
  return gradeQuizAnswers(quizId, answers, timeTakenSeconds);
}
