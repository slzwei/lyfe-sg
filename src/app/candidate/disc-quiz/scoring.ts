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
    strengths: string[];
    blindSpots: string[];
  }
> = {
  D: {
    name: "D",
    fullName: "Drive",
    motto: "Let's get results.",
    descriptors: ["Results-oriented", "Decisive", "Competitive"],
    description:
      "Takes charge to get things done. Makes decisions and takes action. At work: Results-oriented and decisive; a competitive risk-taker; confident and a natural leader.",
    strengths: [
      "Makes quick, confident decisions under pressure",
      "Drives projects forward and holds people accountable",
      "Tackles challenges head-on without hesitation",
      "Sets ambitious goals and delivers results efficiently",
    ],
    blindSpots: [
      "May come across as impatient or dismissive of others' input",
      "Can prioritise speed over people's feelings",
      "Tendency to take over instead of delegating",
      "May overlook details when focused on the big picture",
    ],
  },
  I: {
    name: "I",
    fullName: "Influence",
    motto: "Let's do this together!",
    descriptors: ["Enthusiastic", "Collaborative", "Optimistic"],
    description:
      "Engages others and shares enthusiasm. Inspires and persuades others. At work: Enthusiastic and optimistic; a natural communicator; collaborative and people-focused.",
    strengths: [
      "Energises teams and creates a positive atmosphere",
      "Builds rapport quickly and connects people together",
      "Generates creative ideas and inspires new directions",
      "Communicates persuasively and rallies support for initiatives",
    ],
    blindSpots: [
      "May struggle with follow-through on routine tasks",
      "Can over-commit by saying yes to too many things",
      "Tendency to talk more than listen in discussions",
      "May avoid detailed planning or structured processes",
    ],
  },
  S: {
    name: "S",
    fullName: "Support",
    motto: "How can I help?",
    descriptors: ["Patient", "Dependable", "Supportive"],
    description:
      "Is helpful and shows care for others. Looks for ways to assist and serve. At work: Patient and dependable; a steady team player; warm and supportive.",
    strengths: [
      "Creates a stable, supportive environment for the team",
      "Listens carefully and makes others feel heard",
      "Follows through consistently — people can count on them",
      "Keeps calm during stressful or chaotic situations",
    ],
    blindSpots: [
      "May agree to things they're not comfortable with to avoid conflict",
      "Can be slow to adapt when plans or priorities shift",
      "Tendency to put others' needs ahead of their own too often",
      "May hold back opinions even when their input is valuable",
    ],
  },
  C: {
    name: "C",
    fullName: "Clarity",
    motto: "Let's get this right.",
    descriptors: ["Detail-oriented", "Analytical", "Thorough"],
    description:
      "Works steadily within systems. Focuses on order, accuracy, and precision. At work: Detail-oriented and thorough; a quality-focused thinker; careful and systematic.",
    strengths: [
      "Catches errors and inconsistencies others miss",
      "Produces high-quality, well-researched work",
      "Brings logical structure to complex problems",
      "Maintains high standards and ensures compliance",
    ],
    blindSpots: [
      "May spend too long perfecting when 'good enough' would do",
      "Can come across as overly critical or nitpicky",
      "Tendency to delay decisions while gathering more data",
      "May struggle to delegate when others' standards differ",
    ],
  },
  Di: {
    name: "Di",
    fullName: "Drive/influence",
    motto: "Let's make it happen!",
    descriptors: ["Charismatic", "Resourceful", "Action-oriented"],
    description:
      "Resourceful and charismatic. Takes charge of social situations. Builds rapport and brings people together while driving toward results.",
    strengths: [
      "Inspires confidence and gets people on board quickly",
      "Takes initiative and leads by example in high-pressure moments",
      "Balances people skills with a strong results focus",
      "Adapts approach to win support from different personalities",
    ],
    blindSpots: [
      "May dominate conversations or push ideas too forcefully",
      "Can lose patience with slower, more methodical colleagues",
      "Tendency to move on before fully completing current tasks",
      "May underestimate risks when enthusiasm runs high",
    ],
  },
  Dc: {
    name: "Dc",
    fullName: "Drive/clarity",
    motto: "Let's do this the right way — fast.",
    descriptors: ["Focused", "Efficient", "High-standards"],
    description:
      "Focused on realistic results more than relationships. Maintains efficiency and continuous improvement. Has high expectations.",
    strengths: [
      "Combines speed with precision — gets quality results fast",
      "Sets and maintains very high standards for output",
      "Works independently and stays focused without oversight",
      "Identifies inefficiencies and streamlines processes",
    ],
    blindSpots: [
      "Can come across as cold or unapproachable",
      "May dismiss others' ideas if they seem impractical",
      "Tendency to be blunt in feedback, hurting team morale",
      "May resist collaborative approaches, preferring to work alone",
    ],
  },
  Id: {
    name: "Id",
    fullName: "Influence/drive",
    motto: "Let's try something new!",
    descriptors: ["Adventurous", "Energetic", "Big-picture"],
    description:
      "Approaches relationships and tasks with equal energy. Discusses big-picture ideas. Adventurous and able to create novel solutions.",
    strengths: [
      "Brings infectious energy that motivates the whole team",
      "Sees opportunities and possibilities others overlook",
      "Moves quickly from idea to action with enthusiasm",
      "Creates an exciting, dynamic work environment",
    ],
    blindSpots: [
      "May jump between ideas without finishing what was started",
      "Can overlook practical details and logistics",
      "Tendency to act on impulse rather than careful analysis",
      "May underestimate timelines and overcommit resources",
    ],
  },
  Is: {
    name: "Is",
    fullName: "Influence/support",
    motto: "Everyone belongs here.",
    descriptors: ["Inclusive", "Adaptable", "Collaborative"],
    description:
      "Fosters a collaborative environment where everyone belongs. Adapts easily to different work styles. Involves people in discussions.",
    strengths: [
      "Makes everyone feel included and valued in the team",
      "Reads the room well and adapts communication style",
      "Builds strong, trusting relationships across the organisation",
      "Creates psychological safety that encourages open dialogue",
    ],
    blindSpots: [
      "May avoid giving direct feedback to preserve harmony",
      "Can struggle with making unpopular but necessary decisions",
      "Tendency to prioritise consensus over speed",
      "May take criticism personally and dwell on it",
    ],
  },
  Si: {
    name: "Si",
    fullName: "Support/influence",
    motto: "I'm here for you.",
    descriptors: ["Empathetic", "Encouraging", "Team-oriented"],
    description:
      "Shows support and empathy. Helps people achieve their goals. Easily adapts to difficult situations. Promotes teamwork.",
    strengths: [
      "Naturally empathetic — understands what people need",
      "Encourages and uplifts teammates during tough times",
      "Adapts smoothly to changing situations and group dynamics",
      "Builds strong team cohesion through genuine care",
    ],
    blindSpots: [
      "May agree too readily to keep everyone happy",
      "Can avoid raising issues until they become serious",
      "Tendency to absorb others' stress and burn out quietly",
      "May hesitate to take the lead even when it's needed",
    ],
  },
  Sc: {
    name: "Sc",
    fullName: "Support/clarity",
    motto: "Let's be thorough and steady.",
    descriptors: ["Careful", "Consistent", "Organized"],
    description:
      "Seeks predictability and consistency. Makes decisions carefully. Organized and attentive to details. Accommodates others.",
    strengths: [
      "Brings order and reliability to every project they touch",
      "Plans carefully and anticipates potential issues early",
      "Delivers consistent, high-quality work without drama",
      "Creates stable systems and processes the team can rely on",
    ],
    blindSpots: [
      "May resist change even when it's clearly beneficial",
      "Can get stuck in analysis paralysis on decisions",
      "Tendency to play it safe rather than take calculated risks",
      "May struggle to speak up in fast-moving group settings",
    ],
  },
  Cs: {
    name: "Cs",
    fullName: "Clarity/support",
    motto: "Let's do this properly.",
    descriptors: ["Responsible", "Reliable", "Exacting"],
    description:
      "Responsible, reliable and accountable. Exacting in their work. Considers many factors when deciding. Appreciates guidance.",
    strengths: [
      "Takes full ownership and follows through on commitments",
      "Produces meticulous, well-considered work every time",
      "Balances quality standards with consideration for the team",
      "Documents processes and ensures knowledge is shared",
    ],
    blindSpots: [
      "May be overly cautious and miss time-sensitive opportunities",
      "Can get rigid about procedures when flexibility is needed",
      "Tendency to need reassurance before making decisions",
      "May struggle to push back on unreasonable requests",
    ],
  },
  Cd: {
    name: "Cd",
    fullName: "Clarity/drive",
    motto: "Let's improve the process.",
    descriptors: ["Purposeful", "Efficient", "Rational"],
    description:
      "Purposeful, efficient and focused. Focused on goals rather than relationships. Extremely rational. Strives to improve performance.",
    strengths: [
      "Combines analytical rigour with drive to execute",
      "Identifies the most efficient path to any goal",
      "Makes tough, data-driven decisions without hesitation",
      "Continuously improves systems and raises the performance bar",
    ],
    blindSpots: [
      "May come across as emotionally detached or aloof",
      "Can be overly critical of others' work and methods",
      "Tendency to undervalue relationship-building and team morale",
      "May push too hard for efficiency at the expense of people",
    ],
  },
};
