"use server";

import {
  isValidModuleId,
  isValidQuizId,
  gradeQuizAnswers,
  type QuizResult,
} from "@/lib/quiz";

export async function gradeQuiz(
  moduleId: string,
  quizId: string,
  answers: Record<string, string>,
  timeTakenSeconds: number
): Promise<QuizResult> {
  if (!isValidModuleId(moduleId) || !isValidQuizId(moduleId, quizId)) {
    throw new Error("Invalid module or quiz ID");
  }
  return gradeQuizAnswers(moduleId, quizId, answers, timeTakenSeconds);
}
