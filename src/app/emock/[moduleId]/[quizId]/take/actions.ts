"use server";

import {
  gradeQuiz as _gradeQuiz,
  saveQuizProgress as _saveQuizProgress,
} from "@/app/emock/actions";
import type { QuizResult } from "@/lib/quiz";

export async function gradeQuiz(
  attemptId: string,
  moduleId: string,
  quizId: string,
  answers: Record<string, string>,
  timeTakenSeconds: number
): Promise<QuizResult> {
  return _gradeQuiz(attemptId, moduleId, quizId, answers, timeTakenSeconds);
}

export async function saveQuizProgress(
  attemptId: string,
  answers: Record<string, string>
): Promise<void> {
  return _saveQuizProgress(attemptId, answers);
}
