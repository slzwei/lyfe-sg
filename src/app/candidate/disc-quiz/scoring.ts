import { DISC_STEPS, type Question, type DISCType, type AxisCode } from "./questions";

const AXIS_EFFECTS: Record<AxisCode, [DISCType, DISCType]> = {
  n: ["D", "I"], // Active
  s: ["S", "C"], // Receptive
  e: ["D", "C"], // Skeptical
  w: ["I", "S"], // Agreeable
};

// Compute theoretical min/max raw score per dimension from question structure.
// Used to normalize each dimension independently to 0-100.
function computeDimensionRanges(): Record<DISCType, { min: number; max: number }> {
  const ranges: Record<DISCType, { min: number; max: number }> = {
    D: { min: 0, max: 0 },
    I: { min: 0, max: 0 },
    S: { min: 0, max: 0 },
    C: { min: 0, max: 0 },
  };

  for (const q of DISC_STEPS.flat()) {
    if (q.format === "A") {
      // contribution = answer - 3, range [-2, +2]
      ranges[q.leftType].min += -2;
      ranges[q.leftType].max += 2;
      ranges[q.rightType].min += -2;
      ranges[q.rightType].max += 2;
    } else if (q.format === "B") {
      // discType gets [-2, +2]
      ranges[q.discType].min += -2;
      ranges[q.discType].max += 2;
    } else if (q.format === "C") {
      const typesA = new Set(AXIS_EFFECTS[q.optionA.axis]);
      const typesB = new Set(AXIS_EFFECTS[q.optionB.axis]);
      for (const t of ["D", "I", "S", "C"] as DISCType[]) {
        const inA = typesA.has(t);
        const inB = typesB.has(t);
        if (inA && inB) {
          ranges[t].min += 1;
          ranges[t].max += 1;
        } else if (inA || inB) {
          ranges[t].max += 1;
        }
      }
    }
  }

  return ranges;
}

const DIMENSION_RANGES = computeDimensionRanges();

export type ProfileStrength = "strong" | "moderate" | "balanced";

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
  profile_strength: ProfileStrength;
  strength_pct: number;
  priorities: string[];
}

// ─── Priority definitions ─────────────────────────────────────────────────
// 8 priorities positioned at 45° intervals around the circumplex.
// Angles in math convention (CCW from +x / Agreeable axis).

export interface PriorityDef {
  name: string;
  angle: number;
  dimension: string; // primary DISC quadrant for coloring
  description: string;
}

export const DISC_PRIORITIES: PriorityDef[] = [
  { name: "Collaboration", angle: 0, dimension: "I", description: "You value working together, building relationships, and inclusivity." },
  { name: "Enthusiasm", angle: 45, dimension: "I", description: "You bring energy, positivity, and excitement to every interaction." },
  { name: "Action", angle: 90, dimension: "D", description: "You focus on starting quickly and making things happen." },
  { name: "Results", angle: 135, dimension: "D", description: "You focus on outcomes, efficiency, and achieving goals quickly." },
  { name: "Challenge", angle: 180, dimension: "C", description: "You question assumptions, drive improvement, and hold high standards." },
  { name: "Accuracy", angle: 225, dimension: "C", description: "You value precision, quality, and getting the details right." },
  { name: "Stability", angle: 270, dimension: "S", description: "You prefer consistency, careful processes, and reliable outcomes." },
  { name: "Support", angle: 315, dimension: "S", description: "You focus on helping others, creating stability, and being dependable." },
];

function angularDistance(a: number, b: number): number {
  let diff = Math.abs(a - b);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

function computePriorities(angle: number): string[] {
  const ranked = DISC_PRIORITIES
    .map((p) => ({ name: p.name, dist: angularDistance(p.angle, angle) }))
    .sort((a, b) => a.dist - b.dist);

  // Always include 3 closest; include 4th/5th if within 60°
  const names = ranked.slice(0, 3).map((r) => r.name);
  for (let i = 3; i < Math.min(5, ranked.length); i++) {
    if (ranked[i].dist <= 60) names.push(ranked[i].name);
  }
  return names;
}

/**
 * Compute derived display fields from raw scores and angle.
 * Use this on the results page to avoid needing extra DB columns.
 */
export function computeDerivedFields(
  d_raw: number,
  i_raw: number,
  s_raw: number,
  c_raw: number,
  angle: number
): { profile_strength: ProfileStrength; strength_pct: number; priorities: string[] } {
  const vScore = d_raw + i_raw - (s_raw + c_raw);
  const hScore = i_raw + s_raw - (d_raw + c_raw);
  const magnitude = Math.sqrt(vScore ** 2 + hScore ** 2);
  const strengthPct = Math.min(100, Math.round((magnitude / 100) * 100));
  const profileStrength: ProfileStrength =
    strengthPct < 15 ? "balanced" : strengthPct < 45 ? "moderate" : "strong";
  const priorities = computePriorities(angle);
  return { profile_strength: profileStrength, strength_pct: strengthPct, priorities };
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
      // Format B: Single-Word — primary type only
      const contribution = answer - 3;
      raw[q.discType] += contribution;
    } else if (q.format === "C") {
      // Format C: Scenario — chosen axis adds +1 to two adjacent types
      const chosenAxis = answer === 1 ? q.optionA.axis : q.optionB.axis;
      const [type1, type2] = AXIS_EFFECTS[chosenAxis];
      raw[type1] += 1;
      raw[type2] += 1;
    }
  }

  // Normalize each dimension independently to 0-100 using its theoretical range.
  // Dimensions are NOT constrained to sum to 100% — each is an independent measure
  // of how strongly the respondent exhibits that trait (50 = midline).
  const pct = {} as Record<DISCType, number>;
  for (const t of ["D", "I", "S", "C"] as DISCType[]) {
    const { min, max } = DIMENSION_RANGES[t];
    const range = max - min;
    pct[t] =
      range === 0
        ? 50
        : Math.max(0, Math.min(100, Math.round(((raw[t] - min) / range) * 100)));
  }

  // Calculate circumplex angle
  const verticalScore = raw.D + raw.I - (raw.S + raw.C);
  const horizontalScore = raw.I + raw.S - (raw.D + raw.C);

  let angle =
    Math.atan2(verticalScore, horizontalScore) * (180 / Math.PI);
  if (angle < 0) angle += 360;

  // Map angle to one of 12 types
  const discType = getCircumplexType(angle);

  const derived = computeDerivedFields(raw.D, raw.I, raw.S, raw.C, angle);

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
    ...derived,
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
  Balanced: {
    name: "Balanced",
    fullName: "Balanced",
    motto: "Versatile across all styles.",
    descriptors: ["Adaptable", "Flexible", "Perceptive"],
    description:
      "Your scores are closely balanced across all four DISC styles. You naturally adapt your approach to fit different situations — drawing on Drive, Influence, Support, or Clarity as needed. This versatility is a rare and valuable quality.",
    strengths: [
      "Adapts naturally to different work situations and team dynamics",
      "Relates effectively with all personality types",
      "Can fill multiple roles and switch between leadership and support",
      "Brings a balanced perspective to problem-solving",
    ],
    blindSpots: [
      "May find it harder to identify a single strongest contribution",
      "Can experience indecision about which approach to use",
      "Others may find it difficult to predict your communication style",
      "May spread energy across too many areas rather than specialising",
    ],
  },
};
