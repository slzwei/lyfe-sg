// Generalized quiz system supporting multiple CMFAS modules
// Each module has its own question count, duration, and grading rules

import M9SetA from "@/data/quizzes/m9/CMFAS_M9_SetA.json";
import M9SetB from "@/data/quizzes/m9/CMFAS_M9_SetB.json";
import M9Mock1 from "@/data/quizzes/m9/CMFAS_M9_MockExam1.json";
import M9Mock2 from "@/data/quizzes/m9/CMFAS_M9_MockExam2.json";
import RES5Mock1 from "@/data/quizzes/res5/RES5_MockExam1.json";
import RES5Mock2 from "@/data/quizzes/res5/RES5_MockExam2.json";
import HISetA from "@/data/quizzes/hi/HI_SetA.json";
import HISetB from "@/data/quizzes/hi/HI_SetB.json";
import HIMock1 from "@/data/quizzes/hi/HI_MockExam1.json";
import HIMock2 from "@/data/quizzes/hi/HI_MockExam2.json";
import M9ASetA from "@/data/quizzes/m9a/M9A_SetA.json";
import M9ASetB from "@/data/quizzes/m9a/M9A_SetB.json";

// ── Types ──

export interface QuizQuestion {
  question_number: number;
  question: string;
  reference: string;
  options: string[];
  correct_answer_letter: string;
  correct_answer: string;
  shared_passage?: string;
}

interface Quiz {
  quiz_title: string;
  version: string;
  prepared_for: string;
  date: string;
  total_questions: number;
  format: string;
  duration: string;
  passing_grade: string;
  questions: QuizQuestion[];
}

export interface ClientQuestion {
  question_number: number;
  question: string;
  reference: string;
  options: string[];
  shared_passage?: string;
}

export type GradingRule =
  | { type: "simple"; passPercent: number }
  | {
      type: "two-part";
      parts: {
        name: string;
        startQ: number;
        endQ: number;
        passPercent: number;
      }[];
    };

export interface ClientQuiz {
  moduleId: string;
  quizId: string;
  title: string;
  version: string;
  total_questions: number;
  duration: number; // minutes
  passingGrade: string;
  grading: GradingRule;
  questions: ClientQuestion[];
}

export interface QuestionResult {
  question_number: number;
  question: string;
  reference: string;
  options: string[];
  shared_passage?: string;
  selected_letter: string | null;
  correct_answer_letter: string;
  correct_answer: string;
  is_correct: boolean;
}

export interface PartResult {
  name: string;
  score: number;
  total: number;
  passPercent: number;
  passRequired: number;
  passed: boolean;
}

export interface QuizResult {
  quiz_title: string;
  score: number;
  total: number;
  passed: boolean;
  time_taken_seconds: number;
  questions: QuestionResult[];
  parts?: PartResult[];
}

// ── Module definitions ──

interface ModuleDefinition {
  id: string;
  code: string;
  title: string;
  description: string;
  questionCount: number;
  duration: number;
  passingGrade: string;
  grading: GradingRule;
  quizIds: string[];
}

export const MODULE_IDS = ["m9", "res5", "hi", "m9a"] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

const MODULE_DEFS: Record<ModuleId, ModuleDefinition> = {
  m9: {
    id: "m9",
    code: "M9",
    title: "Life Insurance & Investment-Linked Policies",
    description:
      "Unit trusts, ILPs, insurance planning, taxation, and regulatory framework for existing representatives.",
    questionCount: 100,
    duration: 120,
    passingGrade: "70% (70/100)",
    grading: { type: "simple", passPercent: 70 },
    quizIds: ["set-a", "set-b", "mock-1", "mock-2"],
  },
  res5: {
    id: "res5",
    code: "RES5",
    title: "Rules & Regulations for Financial Advisory Services",
    description:
      "Financial advisory regulations, licensing requirements, and compliance guidelines.",
    questionCount: 150,
    duration: 180,
    passingGrade: "Part I: 75% (83/110), Part II: 80% (32/40)",
    grading: {
      type: "two-part",
      parts: [
        { name: "Part I", startQ: 1, endQ: 110, passPercent: 75 },
        { name: "Part II", startQ: 111, endQ: 150, passPercent: 80 },
      ],
    },
    quizIds: ["mock-1", "mock-2"],
  },
  hi: {
    id: "hi",
    code: "HI",
    title: "Health Insurance",
    description:
      "Health insurance products, MediShield Life, Integrated Shield Plans, and claims management.",
    questionCount: 50,
    duration: 75,
    passingGrade: "70% (35/50)",
    grading: { type: "simple", passPercent: 70 },
    quizIds: ["set-a", "set-b", "mock-1", "mock-2"],
  },
  m9a: {
    id: "m9a",
    code: "M9A",
    title: "Life Insurance & ILPs (Supplementary)",
    description:
      "Supplementary module for Module 9 — additional exam topics and practice.",
    questionCount: 50,
    duration: 60,
    passingGrade: "70% (35/50)",
    grading: { type: "simple", passPercent: 70 },
    quizIds: ["set-a", "set-b"],
  },
};

// Quiz data keyed by "moduleId/quizId"
const QUIZ_DATA: Record<string, Quiz> = {
  "m9/set-a": M9SetA as unknown as Quiz,
  "m9/set-b": M9SetB as unknown as Quiz,
  "m9/mock-1": M9Mock1 as unknown as Quiz,
  "m9/mock-2": M9Mock2 as unknown as Quiz,
  "res5/mock-1": RES5Mock1 as unknown as Quiz,
  "res5/mock-2": RES5Mock2 as unknown as Quiz,
  "hi/set-a": HISetA as unknown as Quiz,
  "hi/set-b": HISetB as unknown as Quiz,
  "hi/mock-1": HIMock1 as unknown as Quiz,
  "hi/mock-2": HIMock2 as unknown as Quiz,
  "m9a/set-a": M9ASetA as unknown as Quiz,
  "m9a/set-b": M9ASetB as unknown as Quiz,
};

// ── Exports ──

export function isValidModuleId(id: string): id is ModuleId {
  return (MODULE_IDS as readonly string[]).includes(id);
}

export function getModuleDef(moduleId: ModuleId) {
  return MODULE_DEFS[moduleId];
}

export function isValidQuizId(moduleId: ModuleId, quizId: string): boolean {
  return MODULE_DEFS[moduleId].quizIds.includes(quizId);
}

export const MODULE_META = MODULE_IDS.map((id) => {
  const mod = MODULE_DEFS[id];
  return {
    id: mod.id,
    code: mod.code,
    title: mod.title,
    description: mod.description,
    quizCount: mod.quizIds.length,
    questionsPerQuiz: mod.questionCount,
    totalQuestions: mod.questionCount * mod.quizIds.length,
    duration: mod.duration,
    passingGrade: mod.passingGrade,
  };
});

export function getQuizList(moduleId: ModuleId) {
  const mod = MODULE_DEFS[moduleId];
  return mod.quizIds.map((quizId) => {
    const quiz = QUIZ_DATA[`${moduleId}/${quizId}`];
    return {
      id: quizId,
      title: quiz.quiz_title,
      version: quiz.version,
      questionCount: quiz.total_questions,
    };
  });
}

/** Returns quiz data with answers stripped — safe to send to client */
export function getClientQuiz(
  moduleId: ModuleId,
  quizId: string
): ClientQuiz | null {
  const quiz = QUIZ_DATA[`${moduleId}/${quizId}`];
  if (!quiz) return null;
  const mod = MODULE_DEFS[moduleId];
  return {
    moduleId,
    quizId,
    title: quiz.quiz_title,
    version: quiz.version,
    total_questions: quiz.total_questions,
    duration: mod.duration,
    passingGrade: mod.passingGrade,
    grading: mod.grading,
    questions: quiz.questions.map(
      ({ question_number, question, reference, options, shared_passage }) => ({
        question_number,
        question,
        reference,
        options,
        ...(shared_passage ? { shared_passage } : {}),
      })
    ),
  };
}

/** Grade user answers — server-side only */
export function gradeQuizAnswers(
  moduleId: ModuleId,
  quizId: string,
  userAnswers: Record<string, string>,
  timeTakenSeconds: number
): QuizResult {
  const quiz = QUIZ_DATA[`${moduleId}/${quizId}`];
  const mod = MODULE_DEFS[moduleId];

  const questions: QuestionResult[] = quiz.questions.map((q) => {
    const selected = userAnswers[q.question_number] ?? null;
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
    };
  });

  const score = questions.filter((q) => q.is_correct).length;
  let passed: boolean;
  let parts: PartResult[] | undefined;

  if (mod.grading.type === "two-part") {
    parts = mod.grading.parts.map((part) => {
      const partQs = questions.filter(
        (q) =>
          q.question_number >= part.startQ && q.question_number <= part.endQ
      );
      const partScore = partQs.filter((q) => q.is_correct).length;
      const partTotal = partQs.length;
      const passRequired = Math.ceil((partTotal * part.passPercent) / 100);
      return {
        name: part.name,
        score: partScore,
        total: partTotal,
        passPercent: part.passPercent,
        passRequired,
        passed: partScore >= passRequired,
      };
    });
    passed = parts.every((p) => p.passed);
  } else {
    const passRequired = Math.ceil(
      (quiz.total_questions * mod.grading.passPercent) / 100
    );
    passed = score >= passRequired;
  }

  return {
    quiz_title: quiz.quiz_title,
    score,
    total: quiz.total_questions,
    passed,
    time_taken_seconds: timeTakenSeconds,
    questions,
    ...(parts ? { parts } : {}),
  };
}
