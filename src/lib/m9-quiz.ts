// CMFAS M9 quiz data, types, and grading logic
// JSON data is only imported server-side — answers never reach the client bundle

import SetAData from '@/data/m9-quizzes/CMFAS_M9_SetA.json'
import SetBData from '@/data/m9-quizzes/CMFAS_M9_SetB.json'
import Mock1Data from '@/data/m9-quizzes/CMFAS_M9_MockExam1.json'
import Mock2Data from '@/data/m9-quizzes/CMFAS_M9_MockExam2.json'

// ── Types ──

export interface QuizQuestion {
  question_number: number
  question: string
  reference: string
  options: string[]
  correct_answer_letter: string
  correct_answer: string
  shared_passage?: string
}

interface Quiz {
  quiz_title: string
  version: string
  prepared_for: string
  date: string
  total_questions: number
  format: string
  duration: string
  passing_grade: string
  questions: QuizQuestion[]
}

/** Question data sent to the client — no answers */
export interface ClientQuestion {
  question_number: number
  question: string
  reference: string
  options: string[]
  shared_passage?: string
}

/** Quiz metadata + sanitized questions for client rendering */
export interface ClientQuiz {
  quizId: string
  title: string
  version: string
  prepared_for: string
  total_questions: number
  duration: string
  passing_grade: string
  questions: ClientQuestion[]
}

export interface QuestionResult {
  question_number: number
  question: string
  reference: string
  options: string[]
  shared_passage?: string
  selected_letter: string | null
  correct_answer_letter: string
  correct_answer: string
  is_correct: boolean
}

export interface QuizResult {
  quiz_title: string
  score: number
  total: number
  passed: boolean
  time_taken_seconds: number
  questions: QuestionResult[]
}

// ── Registry ──

export const QUIZ_IDS = ['set-a', 'set-b', 'mock-1', 'mock-2'] as const
export type QuizId = (typeof QUIZ_IDS)[number]

const QUIZZES: Record<QuizId, Quiz> = {
  'set-a': SetAData as unknown as Quiz,
  'set-b': SetBData as unknown as Quiz,
  'mock-1': Mock1Data as unknown as Quiz,
  'mock-2': Mock2Data as unknown as Quiz,
}

export const QUIZ_META = QUIZ_IDS.map(id => ({
  id,
  title: QUIZZES[id].quiz_title,
  version: QUIZZES[id].version,
  questionCount: QUIZZES[id].total_questions,
}))

export function isValidQuizId(id: string): id is QuizId {
  return (QUIZ_IDS as readonly string[]).includes(id)
}

/** Returns quiz data with correct answers stripped — safe to send to client */
export function getClientQuiz(quizId: QuizId): ClientQuiz {
  const q = QUIZZES[quizId]
  return {
    quizId,
    title: q.quiz_title,
    version: q.version,
    prepared_for: q.prepared_for,
    total_questions: q.total_questions,
    duration: q.duration,
    passing_grade: q.passing_grade,
    questions: q.questions.map(
      ({ question_number, question, reference, options, shared_passage }) => ({
        question_number,
        question,
        reference,
        options,
        ...(shared_passage ? { shared_passage } : {}),
      })
    ),
  }
}

/** Grade user answers against the answer key — server-side only */
export function gradeQuizAnswers(
  quizId: QuizId,
  userAnswers: Record<string, string>,
  timeTakenSeconds: number
): QuizResult {
  const quiz = QUIZZES[quizId]
  const questions: QuestionResult[] = quiz.questions.map(q => {
    const selected = userAnswers[q.question_number] ?? null
    return {
      question_number: q.question_number,
      question: q.question,
      reference: q.reference,
      options: q.options,
      ...(q.shared_passage ? { shared_passage: q.shared_passage } : {}),
      selected_letter: selected,
      correct_answer_letter: q.correct_answer_letter,
      correct_answer: q.correct_answer,
      is_correct: selected === q.correct_answer_letter,
    }
  })

  const score = questions.filter(q => q.is_correct).length
  return {
    quiz_title: quiz.quiz_title,
    score,
    total: quiz.total_questions,
    passed: score >= 70,
    time_taken_seconds: timeTakenSeconds,
    questions,
  }
}
