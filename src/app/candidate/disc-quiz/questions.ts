export type DISCType = "D" | "I" | "S" | "C";
export type AxisCode = "n" | "s" | "e" | "w";

export interface FormatAQuestion {
  id: number;
  format: "A";
  left: string;
  right: string;
  leftType: DISCType;
  rightType: DISCType;
}

export interface FormatBQuestion {
  id: number;
  format: "B";
  word: string;
  discType: DISCType;
}

export interface FormatCQuestion {
  id: number;
  format: "C";
  stem: string;
  optionA: { text: string; axis: AxisCode };
  optionB: { text: string; axis: AxisCode };
}

export type Question = FormatAQuestion | FormatBQuestion | FormatCQuestion;

// Step 1 — Format A: Word Pairs (8 questions)
const step1: FormatAQuestion[] = [
  { id: 1, format: "A", left: "Thorough", right: "Easygoing", leftType: "C", rightType: "S" },
  { id: 2, format: "A", left: "Spontaneous", right: "Methodical", leftType: "I", rightType: "C" },
  { id: 3, format: "A", left: "Reserved", right: "Dynamic", leftType: "C", rightType: "D" },
  { id: 4, format: "A", left: "Energetic", right: "Calm", leftType: "I", rightType: "S" },
  { id: 5, format: "A", left: "Generous", right: "Strict", leftType: "S", rightType: "C" },
  { id: 6, format: "A", left: "Focused", right: "Cheerful", leftType: "D", rightType: "I" },
  { id: 7, format: "A", left: "Vibrant", right: "Steady", leftType: "I", rightType: "S" },
  { id: 8, format: "A", left: "Commanding", right: "Lively", leftType: "D", rightType: "I" },
];

// Step 2 — Format A: Word Pairs (8 questions)
const step2: FormatAQuestion[] = [
  { id: 9, format: "A", left: "Supportive", right: "Resolute", leftType: "S", rightType: "D" },
  { id: 10, format: "A", left: "Enthusiastic", right: "Objective", leftType: "I", rightType: "C" },
  { id: 11, format: "A", left: "Compliant", right: "Enterprising", leftType: "C", rightType: "D" },
  { id: 12, format: "A", left: "Diplomatic", right: "Direct", leftType: "S", rightType: "D" },
  { id: 13, format: "A", left: "Upbeat", right: "Grounded", leftType: "I", rightType: "S" },
  { id: 14, format: "A", left: "Independent", right: "Engaging", leftType: "D", rightType: "I" },
  { id: 15, format: "A", left: "Purposeful", right: "Charming", leftType: "D", rightType: "I" },
  { id: 16, format: "A", left: "Talkative", right: "Composed", leftType: "I", rightType: "S" },
  { id: 39, format: "A", left: "Warm", right: "Logical", leftType: "S", rightType: "C" },
];

// Step 3 — Format A: Word Pairs (8 questions)
const step3: FormatAQuestion[] = [
  { id: 17, format: "A", left: "Accepting", right: "Matter-of-Fact", leftType: "S", rightType: "C" },
  { id: 18, format: "A", left: "Persuasive", right: "Meticulous", leftType: "I", rightType: "C" },
  { id: 19, format: "A", left: "Careful", right: "Bold", leftType: "C", rightType: "D" },
  { id: 20, format: "A", left: "Cooperative", right: "Assertive", leftType: "S", rightType: "D" },
  { id: 21, format: "A", left: "Outgoing", right: "Measured", leftType: "I", rightType: "C" },
  { id: 22, format: "A", left: "Animated", right: "Precise", leftType: "I", rightType: "C" },
  { id: 23, format: "A", left: "Cautious", right: "Adventurous", leftType: "C", rightType: "D" },
  { id: 24, format: "A", left: "Receptive", right: "Proactive", leftType: "S", rightType: "D" },
];

// Step 4 — Format B: Single-Word Ratings (8 questions)
const step4: FormatBQuestion[] = [
  { id: 25, format: "B", word: "Agreeable", discType: "S" },
  { id: 26, format: "B", word: "Daring", discType: "D" },
  { id: 27, format: "B", word: "Sociable", discType: "I" },
  { id: 28, format: "B", word: "Optimistic", discType: "I" },
  { id: 29, format: "B", word: "Patient", discType: "S" },
  { id: 30, format: "B", word: "Systematic", discType: "C" },
  { id: 31, format: "B", word: "Detail-Oriented", discType: "C" },
  { id: 32, format: "B", word: "Determined", discType: "D" },
];

// Step 5 — Format C: Scenario Binary Choice (6 questions)
const step5: FormatCQuestion[] = [
  {
    id: 33,
    format: "C",
    stem: "In a group, I am…",
    optionA: { text: "Likely to share my ideas first", axis: "n" },
    optionB: { text: "Likely to listen to others first", axis: "s" },
  },
  {
    id: 34,
    format: "C",
    stem: "On a team project, I am most concerned with…",
    optionA: { text: "Getting things done correctly and efficiently", axis: "e" },
    optionB: { text: "Making sure the people involved are engaged and supported", axis: "w" },
  },
  {
    id: 35,
    format: "C",
    stem: "I am most comfortable…",
    optionA: { text: "Making the call when a decision is needed", axis: "n" },
    optionB: { text: "Building consensus before deciding", axis: "s" },
  },
  {
    id: 36,
    format: "C",
    stem: "When giving feedback to someone, I focus on…",
    optionA: { text: "Motivating the person and letting them know they're appreciated", axis: "w" },
    optionB: { text: "Being accurate and factual about the person's performance", axis: "e" },
  },
  {
    id: 37,
    format: "C",
    stem: "When starting something new, I prefer to…",
    optionA: { text: "Dive in and figure it out as I go", axis: "n" },
    optionB: { text: "Plan carefully before taking the first step", axis: "s" },
  },
  {
    id: 38,
    format: "C",
    stem: "In a fast-moving situation, I am more likely to…",
    optionA: { text: "Step up and make a call", axis: "n" },
    optionB: { text: "Slow down and make sure everyone is aligned", axis: "s" },
  },
];

export const DISC_STEPS: Question[][] = [step1, step2, step3, step4, step5];

export const STEP_LABELS = [
  "Step 1 of 5",
  "Step 2 of 5",
  "Step 3 of 5",
  "Step 4 of 5",
  "Step 5 of 5",
];
