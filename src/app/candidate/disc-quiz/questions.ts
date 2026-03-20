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
  { id: 1, format: "A", left: "Open", right: "Discerning", leftType: "I", rightType: "C" },
  { id: 2, format: "A", left: "Spontaneous", right: "Methodical", leftType: "I", rightType: "C" },
  { id: 3, format: "A", left: "Reserved", right: "Dynamic", leftType: "C", rightType: "D" },
  { id: 4, format: "A", left: "Humble", right: "Bold", leftType: "S", rightType: "D" },
  { id: 5, format: "A", left: "Generous", right: "Strict", leftType: "S", rightType: "C" },
  { id: 6, format: "A", left: "Lively", right: "Thorough", leftType: "I", rightType: "C" },
  { id: 7, format: "A", left: "Obedient", right: "Outspoken", leftType: "S", rightType: "D" },
  { id: 8, format: "A", left: "Modest", right: "Challenging", leftType: "S", rightType: "D" },
];

// Step 2 — Format A: Word Pairs (8 questions)
const step2: FormatAQuestion[] = [
  { id: 9, format: "A", left: "Helpful", right: "Resolute", leftType: "S", rightType: "D" },
  { id: 10, format: "A", left: "Enthusiastic", right: "Objective", leftType: "I", rightType: "C" },
  { id: 11, format: "A", left: "Compliant", right: "Enterprising", leftType: "C", rightType: "D" },
  { id: 12, format: "A", left: "Gentle", right: "Direct", leftType: "S", rightType: "D" },
  { id: 13, format: "A", left: "Accommodating", right: "Firm", leftType: "S", rightType: "D" },
  { id: 14, format: "A", left: "Playful", right: "Analytical", leftType: "I", rightType: "C" },
  { id: 15, format: "A", left: "Tactful", right: "Expressive", leftType: "C", rightType: "I" },
  { id: 16, format: "A", left: "Even-Tempered", right: "Tough", leftType: "S", rightType: "D" },
];

// Step 3 — Format A: Word Pairs (8 questions)
const step3: FormatAQuestion[] = [
  { id: 17, format: "A", left: "Accepting", right: "Matter-of-Fact", leftType: "S", rightType: "C" },
  { id: 18, format: "A", left: "Persuasive", right: "Meticulous", leftType: "I", rightType: "C" },
  { id: 19, format: "A", left: "Quiet", right: "Charismatic", leftType: "C", rightType: "I" },
  { id: 20, format: "A", left: "Obliging", right: "Assertive", leftType: "S", rightType: "D" },
  { id: 21, format: "A", left: "Outgoing", right: "Prudent", leftType: "I", rightType: "C" },
  { id: 22, format: "A", left: "Animated", right: "Precise", leftType: "I", rightType: "C" },
  { id: 23, format: "A", left: "Cautious", right: "Adventurous", leftType: "C", rightType: "D" },
  { id: 24, format: "A", left: "Receptive", right: "Decisive", leftType: "S", rightType: "D" },
];

// Step 4 — Format B: Single-Word Ratings (8 questions)
const step4: FormatBQuestion[] = [
  { id: 25, format: "B", word: "Agreeable", discType: "S" },
  { id: 26, format: "B", word: "Daring", discType: "D" },
  { id: 27, format: "B", word: "Sociable", discType: "I" },
  { id: 28, format: "B", word: "Dominant", discType: "D" },
  { id: 29, format: "B", word: "Patient", discType: "S" },
  { id: 30, format: "B", word: "Soft-Spoken", discType: "S" },
  { id: 31, format: "B", word: "Detail-Oriented", discType: "C" },
  { id: 32, format: "B", word: "Competitive", discType: "D" },
];

// Step 5 — Format C: Scenario Binary Choice (6 questions)
const step5: FormatCQuestion[] = [
  {
    id: 33,
    format: "C",
    stem: "In a group, I am…",
    optionA: { text: "Likely to speak up", axis: "n" },
    optionB: { text: "Likely to stay quiet and listen", axis: "s" },
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
    optionA: { text: "Taking command to make a decision", axis: "n" },
    optionB: { text: "Letting others make the final decision", axis: "s" },
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
    stem: "I am most attracted to…",
    optionA: { text: "Work I can do alone", axis: "e" },
    optionB: { text: "Work that requires lots of interaction with others", axis: "w" },
  },
  {
    id: 38,
    format: "C",
    stem: "When someone presents a plan, I'm more likely to…",
    optionA: { text: "Analyze and point out the flaws in the plan", axis: "e" },
    optionB: { text: "Think about how I can be helpful in making the plan happen", axis: "w" },
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
