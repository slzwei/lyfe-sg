export type EnneagramType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const ENNEAGRAM_TYPES: EnneagramType[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const TYPE_NAMES: Record<EnneagramType, string> = {
  1: "Reformer",
  2: "Helper",
  3: "Achiever",
  4: "Individualist",
  5: "Investigator",
  6: "Loyalist",
  7: "Enthusiast",
  8: "Challenger",
  9: "Peacemaker",
};

export const TYPE_BLURBS: Record<EnneagramType, string> = {
  1: "Principled, purposeful, self-controlled. Strives to improve and do what's right.",
  2: "Generous, empathetic, people-focused. Wants to be loved and needed.",
  3: "Adaptable, driven, image-conscious. Wants to achieve and be admired.",
  4: "Expressive, introspective, unique. Wants to understand and express themselves.",
  5: "Perceptive, analytical, private. Wants to understand the world deeply.",
  6: "Engaging, loyal, vigilant. Wants security, trust, and support.",
  7: "Spontaneous, versatile, upbeat. Wants freedom and varied experiences.",
  8: "Self-confident, decisive, protective. Wants to be self-reliant and in control.",
  9: "Receptive, reassuring, easygoing. Wants inner and outer peace.",
};

export interface QuizQuestion {
  question_number: number;
  optionA: string;
  optionB: string;
  typeA: EnneagramType;
  typeB: EnneagramType;
}

export interface QuizResult {
  scores: Record<EnneagramType, number>;
  primary: EnneagramType;
  wing: EnneagramType | null;
  total: number;
}

export function scoreQuiz(
  questions: QuizQuestion[],
  answers: Record<number, "A" | "B">,
): QuizResult {
  const scores = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 } as Record<EnneagramType, number>;
  for (const q of questions) {
    const ans = answers[q.question_number];
    if (!ans) continue;
    const t = ans === "A" ? q.typeA : q.typeB;
    scores[t]++;
  }

  let primary: EnneagramType = 1;
  let max = -1;
  for (const t of ENNEAGRAM_TYPES) {
    if (scores[t] > max) {
      max = scores[t];
      primary = t;
    }
  }

  const prev = (primary === 1 ? 9 : primary - 1) as EnneagramType;
  const next = (primary === 9 ? 1 : primary + 1) as EnneagramType;
  const wing =
    scores[prev] === scores[next] ? null : scores[prev] > scores[next] ? prev : next;

  const total = ENNEAGRAM_TYPES.reduce((s, t) => s + scores[t], 0);
  return { scores, primary, wing, total };
}

export function formatResultLabel(primary: EnneagramType, wing: EnneagramType | null): string {
  if (wing == null) return `Type ${primary} — ${TYPE_NAMES[primary]}`;
  return `Type ${primary}w${wing} — ${TYPE_NAMES[primary]} with a ${TYPE_NAMES[wing]} wing`;
}
