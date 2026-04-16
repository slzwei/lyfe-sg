"use server";

// Quiz grading moved to @/app/emock/actions — this file kept for backwards compatibility
import { gradeQuiz as _gradeQuiz } from "@/app/emock/actions";
import type { QuizResult } from "@/lib/quiz";

export async function gradeQuiz(
  moduleId: string,
  quizId: string,
  answers: Record<string, string>,
  timeTakenSeconds: number
): Promise<QuizResult> {
  return _gradeQuiz(moduleId, quizId, answers, timeTakenSeconds);
}
