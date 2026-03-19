import { DISC_STEPS, type Question, type DISCType, type AxisCode } from "./questions";

const DIAGONAL_OPPOSITE: Record<DISCType, DISCType> = {
  D: "S",
  S: "D",
  I: "C",
  C: "I",
};

const AXIS_EFFECTS: Record<AxisCode, [DISCType, DISCType]> = {
  n: ["D", "I"], // Active
  s: ["S", "C"], // Receptive
  e: ["D", "C"], // Skeptical
  w: ["I", "S"], // Agreeable
};

export interface DISCScores {
  d_raw: number;
  i_raw: number;
  s_raw: number;
  c_raw: number;
  d_pct: number;
  i_pct: number;
  s_pct: number;
  c_pct: number;
  disc_type: string;
  angle: number;
}

export function calculateDiscScores(
  responses: Record<string, number>
): DISCScores {
  const raw: Record<DISCType, number> = { D: 0, I: 0, S: 0, C: 0 };

  const allQuestions: Question[] = DISC_STEPS.flat();

  for (const q of allQuestions) {
    const answer = responses[String(q.id)];
    if (answer === undefined) continue;

    if (q.format === "A") {
      // Format A: Word Pair — contribution = userValue - 3
      const contribution = answer - 3;
      raw[q.leftType] += contribution;
      raw[q.rightType] -= contribution;
    } else if (q.format === "B") {
      // Format B: Single-Word — primary type + diagonal opposite penalty
      const contribution = answer - 3;
      raw[q.discType] += contribution;
      raw[DIAGONAL_OPPOSITE[q.discType]] -= contribution * 0.5;
    } else if (q.format === "C") {
      // Format C: Scenario — chosen axis adds +1 to two adjacent types
      const chosenAxis = answer === 1 ? q.optionA.axis : q.optionB.axis;
      const [type1, type2] = AXIS_EFFECTS[chosenAxis];
      raw[type1] += 1;
      raw[type2] += 1;
    }
  }

  // Normalize to percentages
  const minScore = Math.min(raw.D, raw.I, raw.S, raw.C);
  const shifted = {
    D: raw.D - minScore,
    I: raw.I - minScore,
    S: raw.S - minScore,
    C: raw.C - minScore,
  };

  const total = shifted.D + shifted.I + shifted.S + shifted.C;

  let pct: Record<DISCType, number>;
  if (total === 0) {
    pct = { D: 25, I: 25, S: 25, C: 25 };
  } else {
    pct = {
      D: Math.round((shifted.D / total) * 100),
      I: Math.round((shifted.I / total) * 100),
      S: Math.round((shifted.S / total) * 100),
      C: Math.round((shifted.C / total) * 100),
    };

    // Fix rounding to sum to exactly 100
    const pctSum = pct.D + pct.I + pct.S + pct.C;
    if (pctSum !== 100) {
      const diff = 100 - pctSum;
      const maxType = (Object.entries(pct) as [DISCType, number][]).sort(
        (a, b) => b[1] - a[1]
      )[0][0];
      pct[maxType] += diff;
    }
  }

  // Calculate circumplex angle
  const verticalScore = raw.D + raw.I - (raw.S + raw.C);
  const horizontalScore = raw.I + raw.S - (raw.D + raw.C);

  let angle =
    Math.atan2(verticalScore, horizontalScore) * (180 / Math.PI);
  if (angle < 0) angle += 360;

  // Map angle to one of 12 types
  const discType = getCircumplexType(angle);

  return {
    d_raw: raw.D,
    i_raw: raw.I,
    s_raw: raw.S,
    c_raw: raw.C,
    d_pct: pct.D,
    i_pct: pct.I,
    s_pct: pct.S,
    c_pct: pct.C,
    disc_type: discType,
    angle,
  };
}

function getCircumplexType(angle: number): string {
  // 12 segments of 30 degrees each
  // Measured counter-clockwise from +x (Agreeable axis), Active = +y
  if (angle >= 0 && angle < 30) return "Is";
  if (angle >= 30 && angle < 60) return "I";
  if (angle >= 60 && angle < 90) return "Id";
  if (angle >= 90 && angle < 120) return "Di";
  if (angle >= 120 && angle < 150) return "D";
  if (angle >= 150 && angle < 180) return "Dc";
  if (angle >= 180 && angle < 210) return "Cd";
  if (angle >= 210 && angle < 240) return "C";
  if (angle >= 240 && angle < 270) return "Cs";
  if (angle >= 270 && angle < 300) return "Sc";
  if (angle >= 300 && angle < 330) return "S";
  return "Si"; // 330-360
}

// Result type descriptions
export const DISC_TYPE_INFO: Record<
  string,
  {
    name: string;
    fullName: string;
    motto: string;
    descriptors: string[];
    description: string;
    strengths: string;
    blindSpots: string;
  }
> = {
  D: {
    name: "D",
    fullName: "Drive",
    motto: "Let's get results.",
    descriptors: ["Results-oriented", "Decisive", "Competitive"],
    description:
      "Takes charge to get things done. Makes decisions and takes action. At work: Results-oriented and decisive; a competitive risk-taker; confident and a natural leader.",
    strengths: "Determination, efficiency, decisiveness",
    blindSpots: "Can be impatient, insensitive, or overly controlling",
  },
  I: {
    name: "I",
    fullName: "Influence",
    motto: "Let's do this together!",
    descriptors: ["Enthusiastic", "Collaborative", "Optimistic"],
    description:
      "Engages others and shares enthusiasm. Inspires and persuades others. At work: Enthusiastic and optimistic; a natural communicator; collaborative and people-focused.",
    strengths: "Persuasion, creativity, team energy",
    blindSpots: "Can be disorganized, overly talkative, or impulsive",
  },
  S: {
    name: "S",
    fullName: "Support",
    motto: "How can I help?",
    descriptors: ["Patient", "Dependable", "Supportive"],
    description:
      "Is helpful and shows care for others. Looks for ways to assist and serve. At work: Patient and dependable; a steady team player; warm and supportive.",
    strengths: "Reliability, patience, team harmony",
    blindSpots:
      "Can be overly accommodating, resistant to change, or conflict-avoidant",
  },
  C: {
    name: "C",
    fullName: "Clarity",
    motto: "Let's get this right.",
    descriptors: ["Detail-oriented", "Analytical", "Thorough"],
    description:
      "Works steadily within systems. Focuses on order, accuracy, and precision. At work: Detail-oriented and thorough; a quality-focused thinker; careful and systematic.",
    strengths: "Accuracy, analysis, thoroughness",
    blindSpots: "Can be overly critical, perfectionistic, or slow to act",
  },
  Di: {
    name: "Di",
    fullName: "Drive/influence",
    motto: "Let's make it happen!",
    descriptors: ["Charismatic", "Resourceful", "Action-oriented"],
    description:
      "Resourceful and charismatic. Takes charge of social situations. Builds rapport and brings people together while driving toward results.",
    strengths: "Leadership, social confidence, initiative",
    blindSpots: "Can be overly dominant or impatient with details",
  },
  Dc: {
    name: "Dc",
    fullName: "Drive/clarity",
    motto: "Let's do this the right way — fast.",
    descriptors: ["Focused", "Efficient", "High-standards"],
    description:
      "Focused on realistic results more than relationships. Maintains efficiency and continuous improvement. Has high expectations.",
    strengths: "Focus, quality standards, independence",
    blindSpots: "Can be blunt, critical, or dismissive of feelings",
  },
  Id: {
    name: "Id",
    fullName: "Influence/drive",
    motto: "Let's try something new!",
    descriptors: ["Adventurous", "Energetic", "Big-picture"],
    description:
      "Approaches relationships and tasks with equal energy. Discusses big-picture ideas. Adventurous and able to create novel solutions.",
    strengths: "Creativity, energy, vision",
    blindSpots: "Can be scattered, impulsive, or overlook details",
  },
  Is: {
    name: "Is",
    fullName: "Influence/support",
    motto: "Everyone belongs here.",
    descriptors: ["Inclusive", "Adaptable", "Collaborative"],
    description:
      "Fosters a collaborative environment where everyone belongs. Adapts easily to different work styles. Involves people in discussions.",
    strengths: "Inclusivity, flexibility, warmth",
    blindSpots: "Can avoid confrontation or struggle with tough decisions",
  },
  Si: {
    name: "Si",
    fullName: "Support/influence",
    motto: "I'm here for you.",
    descriptors: ["Empathetic", "Encouraging", "Team-oriented"],
    description:
      "Shows support and empathy. Helps people achieve their goals. Easily adapts to difficult situations. Promotes teamwork.",
    strengths: "Empathy, adaptability, encouragement",
    blindSpots: "Can be overly agreeable or avoid necessary conflict",
  },
  Sc: {
    name: "Sc",
    fullName: "Support/clarity",
    motto: "Let's be thorough and steady.",
    descriptors: ["Careful", "Consistent", "Organized"],
    description:
      "Seeks predictability and consistency. Makes decisions carefully. Organized and attentive to details. Accommodates others.",
    strengths: "Reliability, organization, attention to detail",
    blindSpots: "Can be resistant to change or overly cautious",
  },
  Cs: {
    name: "Cs",
    fullName: "Clarity/support",
    motto: "Let's do this properly.",
    descriptors: ["Responsible", "Reliable", "Exacting"],
    description:
      "Responsible, reliable and accountable. Exacting in their work. Considers many factors when deciding. Appreciates guidance.",
    strengths: "Accountability, precision, dependability",
    blindSpots: "Can be overly cautious or rigid with procedures",
  },
  Cd: {
    name: "Cd",
    fullName: "Clarity/drive",
    motto: "Let's improve the process.",
    descriptors: ["Purposeful", "Efficient", "Rational"],
    description:
      "Purposeful, efficient and focused. Focused on goals rather than relationships. Extremely rational. Strives to improve performance.",
    strengths: "Logic, efficiency, strategic thinking",
    blindSpots: "Can be cold, overly critical, or dismissive of others",
  },
};
