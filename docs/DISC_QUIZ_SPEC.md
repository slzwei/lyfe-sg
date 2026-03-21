# DISC Personality Quiz — Complete Implementation Specification

> A self-contained reference and builder prompt for replicating or improving the Lyfe DISC personality quiz system. Covers every question, the full scoring algorithm, all 13 result types, the complete UI/UX flow, database schema, PDF generation, email delivery, real-time progress tracking, and staff dashboard integration.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Database Schema](#3-database-schema)
4. [Questions — All 38](#4-questions--all-38)
5. [Scoring Algorithm](#5-scoring-algorithm)
6. [Result Types — All 13](#6-result-types--all-13)
7. [Priorities System](#7-priorities-system)
8. [Profile Strength](#8-profile-strength)
9. [Quiz UI/UX — Full Flow](#9-quiz-uiux--full-flow)
10. [Results Page UI](#10-results-page-ui)
11. [Circumplex Chart (SVG)](#11-circumplex-chart-svg)
12. [Step Indicator Component](#12-step-indicator-component)
13. [Auto-Save & Progress Recovery](#13-auto-save--progress-recovery)
14. [Real-Time Progress Broadcasting](#14-real-time-progress-broadcasting)
15. [Submission Pipeline](#15-submission-pipeline)
16. [PDF Generation](#16-pdf-generation)
17. [Email Delivery](#17-email-delivery)
18. [Staff Portal Integration](#18-staff-portal-integration)
19. [Route Guards](#19-route-guards)
20. [Color System](#20-color-system)
21. [Responsive Design](#21-responsive-design)
22. [Testing Requirements](#22-testing-requirements)
23. [Key Implementation Notes](#23-key-implementation-notes)
24. [File Inventory](#24-file-inventory)

---

## 1. Architecture Overview

The system is a **Next.js App Router** application with a **Supabase** backend, implementing a 38-question DISC personality assessment for job candidates in Singapore. It spans 6 major subsystems:

1. **Questions & Formats** — 38 questions across 3 formats in 5 steps
2. **Scoring Engine** — 2D circumplex model with 12+1 result types
3. **Quiz UI** — Multi-step form with real-time auto-save
4. **Results Visualization** — SVG circumplex chart, bar charts, priority cards
5. **Server Pipeline** — Score calculation, PDF generation, email delivery
6. **Staff Portal** — Real-time progress tracking, PDF downloads, quiz reset

**Candidate Journey:**
```
Login → OTP Verify → Onboarding (6-step form) → DISC Quiz (5 steps) → Results → Sign Out
```

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15+ (App Router, Server Components, Server Actions) |
| Backend | Supabase (Auth, Database, Storage, Realtime) |
| Styling | Tailwind CSS (responsive, mobile-first) |
| Language | TypeScript (strict mode) |
| PDF | PDFKit |
| Email | AWS SES / Nodemailer |
| Testing | Vitest (unit), Playwright (E2E) |

---

## 3. Database Schema

### `disc_responses` — Raw quiz answers (auto-saved during quiz)

```sql
CREATE TABLE disc_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  responses JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: users can only read/write their own data
ALTER TABLE disc_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own responses" ON disc_responses
  FOR ALL USING (auth.uid() = user_id);
```

**`responses` JSONB format:** `{ "1": 3, "2": 5, "3": 2, ..., "38": 1 }`

### `disc_results` — Calculated DISC scores (written on submission)

```sql
CREATE TABLE disc_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  d_raw NUMERIC NOT NULL,
  i_raw NUMERIC NOT NULL,
  s_raw NUMERIC NOT NULL,
  c_raw NUMERIC NOT NULL,
  d_pct NUMERIC NOT NULL,   -- Independent 0-100 scales (do NOT sum to 100)
  i_pct NUMERIC NOT NULL,
  s_pct NUMERIC NOT NULL,
  c_pct NUMERIC NOT NULL,
  disc_type TEXT NOT NULL,   -- One of: D, Di, Id, I, Is, Si, S, Sc, Cs, C, Cd, Dc
  angle NUMERIC NOT NULL,    -- 0-360 circumplex position
  results_email TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE disc_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own results" ON disc_results
  FOR ALL USING (auth.uid() = user_id);
```

### `invitations` — Links to generated PDFs

```sql
ALTER TABLE invitations ADD COLUMN disc_pdf_path TEXT;
ALTER TABLE invitations ADD COLUMN profile_pdf_path TEXT;
```

### `progress_signals` — Real-time trigger table

```sql
CREATE TABLE progress_signals (
  id INTEGER PRIMARY KEY,
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- Triggers fire on candidate_profiles, disc_responses, disc_results changes
-- Staff portal subscribes to this table for real-time updates
```

### Derived fields NOT stored in DB (computed on-the-fly):
- `profile_strength` — `"balanced"` | `"moderate"` | `"strong"`
- `strength_pct` — 0-100
- `priorities` — array of 3-5 priority names

---

## 4. Questions — All 38

### TypeScript Types

```typescript
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
```

### Step 1 — Format A: Word Pairs (8 questions)

5-point scale where 1 = strongly identifies with LEFT word, 3 = neutral, 5 = strongly identifies with RIGHT word.

| ID | Left Word | Right Word | Left → | Right → |
|----|-----------|------------|--------|---------|
| 1 | Open | Discerning | I | C |
| 2 | Spontaneous | Methodical | I | C |
| 3 | Reserved | Dynamic | C | D |
| 4 | Energetic | Calm | I | S |
| 5 | Generous | Strict | S | C |
| 6 | Focused | Cheerful | D | I |
| 7 | Vibrant | Steady | I | S |
| 8 | Reliable | Confident | S | D |

### Step 2 — Format A: Word Pairs (9 questions, includes Q39)

| ID | Left Word | Right Word | Left → | Right → |
|----|-----------|------------|--------|---------|
| 9 | Supportive | Resolute | S | D |
| 10 | Enthusiastic | Objective | I | C |
| 11 | Compliant | Enterprising | C | D |
| 12 | Diplomatic | Direct | S | D |
| 13 | Upbeat | Grounded | I | S |
| 14 | Independent | Engaging | D | I |
| 15 | Purposeful | Charming | D | I |
| 16 | Even-Tempered | Driven | S | D |
| 39 | Warm | Logical | S | C |

> **Note:** Question 39 is intentionally grouped in Step 2 despite non-sequential numbering. The ID doesn't affect scoring.

### Step 3 — Format A: Word Pairs (8 questions)

| ID | Left Word | Right Word | Left → | Right → |
|----|-----------|------------|--------|---------|
| 17 | Accepting | Matter-of-Fact | S | C |
| 18 | Persuasive | Meticulous | I | C |
| 19 | Reflective | Expressive | C | I |
| 20 | Cooperative | Assertive | S | D |
| 21 | Outgoing | Measured | I | C |
| 22 | Animated | Precise | I | C |
| 23 | Cautious | Adventurous | C | D |
| 24 | Receptive | Proactive | S | D |

### Step 4 — Format B: Single-Word Ratings (8 questions)

5-point Likert scale: 1 = "Not Like Me", 3 = Neutral, 5 = "Like Me". Each word maps to one DISC type.

| ID | Word | DISC Type |
|----|------|-----------|
| 25 | Agreeable | S |
| 26 | Daring | D |
| 27 | Sociable | I |
| 28 | Optimistic | I |
| 29 | Patient | S |
| 30 | Systematic | C |
| 31 | Detail-Oriented | C |
| 32 | Determined | D |

### Step 5 — Format C: Scenario Binary Choice (6 questions)

Binary choice: answer is 1 (Option A) or 2 (Option B). Each option has an axis code that boosts two adjacent DISC types by +1.

**Axis Effects:**
```typescript
const AXIS_EFFECTS: Record<AxisCode, [DISCType, DISCType]> = {
  n: ["D", "I"],  // Active (north)
  s: ["S", "C"],  // Receptive (south)
  e: ["D", "C"],  // Skeptical (east)
  w: ["I", "S"],  // Agreeable (west)
};
```

| ID | Stem | Option A | Axis A | Option B | Axis B |
|----|------|----------|--------|----------|--------|
| 33 | In a group, I am… | Likely to share my ideas first | n | Likely to listen to others first | s |
| 34 | On a team project, I am most concerned with… | Getting things done correctly and efficiently | e | Making sure the people involved are engaged and supported | w |
| 35 | I am most comfortable… | Making the call when a decision is needed | n | Building consensus before deciding | s |
| 36 | When giving feedback to someone, I focus on… | Motivating the person and letting them know they're appreciated | w | Being accurate and factual about the person's performance | e |
| 37 | I am most attracted to… | Work I can do alone | e | Work that requires lots of interaction with others | w |
| 38 | When someone presents a plan, I'm more likely to… | Evaluate the plan's risks and gaps | e | Think about how to support the plan's success | w |

---

## 5. Scoring Algorithm

Implement `calculateDiscScores(responses: Record<string, number>): DISCScores`

### Step A: Accumulate Raw Scores

```typescript
const raw: Record<DISCType, number> = { D: 0, I: 0, S: 0, C: 0 };

for (const question of ALL_QUESTIONS) {
  const answer = responses[String(question.id)];
  if (answer === undefined) continue;

  if (question.format === "A") {
    // Format A: Word Pair — contribution = userValue - 3 (range [-2, +2])
    const contribution = answer - 3;
    raw[question.leftType] += contribution;
    raw[question.rightType] -= contribution;
  } else if (question.format === "B") {
    // Format B: Single-Word — primary type only
    const contribution = answer - 3;
    raw[question.discType] += contribution;
  } else if (question.format === "C") {
    // Format C: Scenario — chosen axis adds +1 to two adjacent types
    const chosenAxis = answer === 1 ? question.optionA.axis : question.optionB.axis;
    const [type1, type2] = AXIS_EFFECTS[chosenAxis];
    raw[type1] += 1;
    raw[type2] += 1;
  }
}
```

### Step B: Compute Theoretical Min/Max Per Dimension

For each DISC type, compute the best and worst possible raw score by analysing all questions:

```typescript
function computeDimensionRanges(): Record<DISCType, { min: number; max: number }> {
  const ranges = { D: { min: 0, max: 0 }, I: { min: 0, max: 0 }, S: { min: 0, max: 0 }, C: { min: 0, max: 0 } };

  for (const q of ALL_QUESTIONS) {
    if (q.format === "A") {
      ranges[q.leftType].min += -2;
      ranges[q.leftType].max += 2;
      ranges[q.rightType].min += -2;
      ranges[q.rightType].max += 2;
    } else if (q.format === "B") {
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
```

**Approximate theoretical ranges:**
- D: min ≈ -28, max ≈ +32
- I: min ≈ -28, max ≈ +34
- S: min ≈ -26, max ≈ +30
- C: min ≈ -28, max ≈ +32

### Step C: Normalize to 0-100

Each dimension is independently normalised using its theoretical range:

```typescript
const pct: Record<DISCType, number> = {};
for (const t of ["D", "I", "S", "C"] as DISCType[]) {
  const { min, max } = DIMENSION_RANGES[t];
  const range = max - min;
  pct[t] = range === 0
    ? 50
    : Math.max(0, Math.min(100, Math.round(((raw[t] - min) / range) * 100)));
}
```

**Critical:** Dimensions are NOT constrained to sum to 100%. Each is an independent measure of how strongly the respondent exhibits that trait (50 = midline, typical response).

### Step D: Calculate Circumplex Angle

Map responses to a 2D circumplex space using Vertical and Horizontal axes:

```typescript
const verticalScore = raw.D + raw.I - (raw.S + raw.C);   // Active vs Receptive
const horizontalScore = raw.I + raw.S - (raw.D + raw.C); // Agreeable vs Skeptical

let angle = Math.atan2(verticalScore, horizontalScore) * (180 / Math.PI);
if (angle < 0) angle += 360;
```

**Circumplex Axes:**
- **0°** = Agreeable (I+S axis, positive x)
- **90°** = Active (D+I axis, positive y)
- **180°** = Skeptical (D+C axis, negative x)
- **270°** = Receptive (S+C axis, negative y)

### Step E: Map Angle to Type (12 segments of 30°)

```typescript
function getCircumplexType(angle: number): string {
  if (angle >= 0 && angle < 30) return "Is";    // Influence/Support
  if (angle >= 30 && angle < 60) return "I";     // Pure Influence
  if (angle >= 60 && angle < 90) return "Id";    // Influence/Drive
  if (angle >= 90 && angle < 120) return "Di";   // Drive/Influence
  if (angle >= 120 && angle < 150) return "D";   // Pure Drive
  if (angle >= 150 && angle < 180) return "Dc";  // Drive/Clarity
  if (angle >= 180 && angle < 210) return "Cd";  // Clarity/Drive
  if (angle >= 210 && angle < 240) return "C";   // Pure Clarity
  if (angle >= 240 && angle < 270) return "Cs";  // Clarity/Support
  if (angle >= 270 && angle < 300) return "Sc";  // Support/Clarity
  if (angle >= 300 && angle < 330) return "S";   // Pure Support
  return "Si";                                    // Support/Influence (330-360)
}
```

### Return Type

```typescript
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
  profile_strength: "strong" | "moderate" | "balanced";
  strength_pct: number;
  priorities: string[];
}
```

---

## 6. Result Types — All 13

Each type has: `name`, `fullName`, `motto`, `descriptors` (3 adjectives), `description` (paragraph), `strengths` (4 items), `blindSpots` (4 items).

### D (Drive) — Angle 120-150°

- **Full Name:** Drive
- **Motto:** "Let's get results."
- **Descriptors:** Results-oriented, Decisive, Competitive
- **Description:** Takes charge to get things done. Makes decisions and takes action. At work: Results-oriented and decisive; a competitive risk-taker; confident and a natural leader.
- **Strengths:**
  1. Makes quick, confident decisions under pressure
  2. Drives projects forward and holds people accountable
  3. Tackles challenges head-on without hesitation
  4. Sets ambitious goals and delivers results efficiently
- **Blind Spots:**
  1. May come across as impatient or dismissive of others' input
  2. Can prioritise speed over people's feelings
  3. Tendency to take over instead of delegating
  4. May overlook details when focused on the big picture

### I (Influence) — Angle 30-60°

- **Full Name:** Influence
- **Motto:** "Let's do this together!"
- **Descriptors:** Enthusiastic, Collaborative, Optimistic
- **Description:** Engages others and shares enthusiasm. Inspires and persuades others. At work: Enthusiastic and optimistic; a natural communicator; collaborative and people-focused.
- **Strengths:**
  1. Energises teams and creates a positive atmosphere
  2. Builds rapport quickly and connects people together
  3. Generates creative ideas and inspires new directions
  4. Communicates persuasively and rallies support for initiatives
- **Blind Spots:**
  1. May struggle with follow-through on routine tasks
  2. Can over-commit by saying yes to too many things
  3. Tendency to talk more than listen in discussions
  4. May avoid detailed planning or structured processes

### S (Support) — Angle 300-330°

- **Full Name:** Support
- **Motto:** "How can I help?"
- **Descriptors:** Patient, Dependable, Supportive
- **Description:** Is helpful and shows care for others. Looks for ways to assist and serve. At work: Patient and dependable; a steady team player; warm and supportive.
- **Strengths:**
  1. Creates a stable, supportive environment for the team
  2. Listens carefully and makes others feel heard
  3. Follows through consistently — people can count on them
  4. Keeps calm during stressful or chaotic situations
- **Blind Spots:**
  1. May agree to things they're not comfortable with to avoid conflict
  2. Can be slow to adapt when plans or priorities shift
  3. Tendency to put others' needs ahead of their own too often
  4. May hold back opinions even when their input is valuable

### C (Clarity) — Angle 210-240°

- **Full Name:** Clarity
- **Motto:** "Let's get this right."
- **Descriptors:** Detail-oriented, Analytical, Thorough
- **Description:** Works steadily within systems. Focuses on order, accuracy, and precision. At work: Detail-oriented and thorough; a quality-focused thinker; careful and systematic.
- **Strengths:**
  1. Catches errors and inconsistencies others miss
  2. Produces high-quality, well-researched work
  3. Brings logical structure to complex problems
  4. Maintains high standards and ensures compliance
- **Blind Spots:**
  1. May spend too long perfecting when 'good enough' would do
  2. Can come across as overly critical or nitpicky
  3. Tendency to delay decisions while gathering more data
  4. May struggle to delegate when others' standards differ

### Di (Drive/Influence) — Angle 90-120°

- **Full Name:** Drive/influence
- **Motto:** "Let's make it happen!"
- **Descriptors:** Charismatic, Resourceful, Action-oriented
- **Description:** Resourceful and charismatic. Takes charge of social situations. Builds rapport and brings people together while driving toward results.
- **Strengths:**
  1. Inspires confidence and gets people on board quickly
  2. Takes initiative and leads by example in high-pressure moments
  3. Balances people skills with a strong results focus
  4. Adapts approach to win support from different personalities
- **Blind Spots:**
  1. May dominate conversations or push ideas too forcefully
  2. Can lose patience with slower, more methodical colleagues
  3. Tendency to move on before fully completing current tasks
  4. May underestimate risks when enthusiasm runs high

### Dc (Drive/Clarity) — Angle 150-180°

- **Full Name:** Drive/clarity
- **Motto:** "Let's do this the right way — fast."
- **Descriptors:** Focused, Efficient, High-standards
- **Description:** Focused on realistic results more than relationships. Maintains efficiency and continuous improvement. Has high expectations.
- **Strengths:**
  1. Combines speed with precision — gets quality results fast
  2. Sets and maintains very high standards for output
  3. Works independently and stays focused without oversight
  4. Identifies inefficiencies and streamlines processes
- **Blind Spots:**
  1. Can come across as cold or unapproachable
  2. May dismiss others' ideas if they seem impractical
  3. Tendency to be blunt in feedback, hurting team morale
  4. May resist collaborative approaches, preferring to work alone

### Id (Influence/Drive) — Angle 60-90°

- **Full Name:** Influence/drive
- **Motto:** "Let's try something new!"
- **Descriptors:** Adventurous, Energetic, Big-picture
- **Description:** Approaches relationships and tasks with equal energy. Discusses big-picture ideas. Adventurous and able to create novel solutions.
- **Strengths:**
  1. Brings infectious energy that motivates the whole team
  2. Sees opportunities and possibilities others overlook
  3. Moves quickly from idea to action with enthusiasm
  4. Creates an exciting, dynamic work environment
- **Blind Spots:**
  1. May jump between ideas without finishing what was started
  2. Can overlook practical details and logistics
  3. Tendency to act on impulse rather than careful analysis
  4. May underestimate timelines and overcommit resources

### Is (Influence/Support) — Angle 0-30°

- **Full Name:** Influence/support
- **Motto:** "Everyone belongs here."
- **Descriptors:** Inclusive, Adaptable, Collaborative
- **Description:** Fosters a collaborative environment where everyone belongs. Adapts easily to different work styles. Involves people in discussions.
- **Strengths:**
  1. Makes everyone feel included and valued in the team
  2. Reads the room well and adapts communication style
  3. Builds strong, trusting relationships across the organisation
  4. Creates psychological safety that encourages open dialogue
- **Blind Spots:**
  1. May avoid giving direct feedback to preserve harmony
  2. Can struggle with making unpopular but necessary decisions
  3. Tendency to prioritise consensus over speed
  4. May take criticism personally and dwell on it

### Si (Support/Influence) — Angle 330-360°

- **Full Name:** Support/influence
- **Motto:** "I'm here for you."
- **Descriptors:** Empathetic, Encouraging, Team-oriented
- **Description:** Shows support and empathy. Helps people achieve their goals. Easily adapts to difficult situations. Promotes teamwork.
- **Strengths:**
  1. Naturally empathetic — understands what people need
  2. Encourages and uplifts teammates during tough times
  3. Adapts smoothly to changing situations and group dynamics
  4. Builds strong team cohesion through genuine care
- **Blind Spots:**
  1. May agree too readily to keep everyone happy
  2. Can avoid raising issues until they become serious
  3. Tendency to absorb others' stress and burn out quietly
  4. May hesitate to take the lead even when it's needed

### Sc (Support/Clarity) — Angle 270-300°

- **Full Name:** Support/clarity
- **Motto:** "Let's be thorough and steady."
- **Descriptors:** Careful, Consistent, Organized
- **Description:** Seeks predictability and consistency. Makes decisions carefully. Organized and attentive to details. Accommodates others.
- **Strengths:**
  1. Brings order and reliability to every project they touch
  2. Plans carefully and anticipates potential issues early
  3. Delivers consistent, high-quality work without drama
  4. Creates stable systems and processes the team can rely on
- **Blind Spots:**
  1. May resist change even when it's clearly beneficial
  2. Can get stuck in analysis paralysis on decisions
  3. Tendency to play it safe rather than take calculated risks
  4. May struggle to speak up in fast-moving group settings

### Cs (Clarity/Support) — Angle 240-270°

- **Full Name:** Clarity/support
- **Motto:** "Let's do this properly."
- **Descriptors:** Responsible, Reliable, Exacting
- **Description:** Responsible, reliable and accountable. Exacting in their work. Considers many factors when deciding. Appreciates guidance.
- **Strengths:**
  1. Takes full ownership and follows through on commitments
  2. Produces meticulous, well-considered work every time
  3. Balances quality standards with consideration for the team
  4. Documents processes and ensures knowledge is shared
- **Blind Spots:**
  1. May be overly cautious and miss time-sensitive opportunities
  2. Can get rigid about procedures when flexibility is needed
  3. Tendency to need reassurance before making decisions
  4. May struggle to push back on unreasonable requests

### Cd (Clarity/Drive) — Angle 180-210°

- **Full Name:** Clarity/drive
- **Motto:** "Let's improve the process."
- **Descriptors:** Purposeful, Efficient, Rational
- **Description:** Purposeful, efficient and focused. Focused on goals rather than relationships. Extremely rational. Strives to improve performance.
- **Strengths:**
  1. Combines analytical rigour with drive to execute
  2. Identifies the most efficient path to any goal
  3. Makes tough, data-driven decisions without hesitation
  4. Continuously improves systems and raises the performance bar
- **Blind Spots:**
  1. May come across as emotionally detached or aloof
  2. Can be overly critical of others' work and methods
  3. Tendency to undervalue relationship-building and team morale
  4. May push too hard for efficiency at the expense of people

### Balanced — (Profile strength < 15%)

- **Full Name:** Balanced
- **Motto:** "Versatile across all styles."
- **Descriptors:** Adaptable, Flexible, Perceptive
- **Description:** Your scores are closely balanced across all four DISC styles. You naturally adapt your approach to fit different situations — drawing on Drive, Influence, Support, or Clarity as needed. This versatility is a rare and valuable quality.
- **Strengths:**
  1. Adapts naturally to different work situations and team dynamics
  2. Relates effectively with all personality types
  3. Can fill multiple roles and switch between leadership and support
  4. Brings a balanced perspective to problem-solving
- **Blind Spots:**
  1. May find it harder to identify a single strongest contribution
  2. Can experience indecision about which approach to use
  3. Others may find it difficult to predict your communication style
  4. May spread energy across too many areas rather than specialising

---

## 7. Priorities System

8 priorities positioned at 45° intervals around the circumplex, each with a description:

```typescript
export const DISC_PRIORITIES: PriorityDef[] = [
  { name: "Collaboration", angle: 0,   dimension: "I", description: "You value working together, building relationships, and inclusivity." },
  { name: "Enthusiasm",    angle: 45,  dimension: "I", description: "You bring energy, positivity, and excitement to every interaction." },
  { name: "Action",        angle: 90,  dimension: "D", description: "You focus on starting quickly and making things happen." },
  { name: "Results",       angle: 135, dimension: "D", description: "You focus on outcomes, efficiency, and achieving goals quickly." },
  { name: "Challenge",     angle: 180, dimension: "C", description: "You question assumptions, drive improvement, and hold high standards." },
  { name: "Accuracy",      angle: 225, dimension: "C", description: "You value precision, quality, and getting the details right." },
  { name: "Stability",     angle: 270, dimension: "S", description: "You prefer consistency, careful processes, and reliable outcomes." },
  { name: "Support",       angle: 315, dimension: "S", description: "You focus on helping others, creating stability, and being dependable." },
];
```

### Selection Logic

```typescript
function computePriorities(angle: number): string[] {
  const ranked = DISC_PRIORITIES
    .map((p) => ({ name: p.name, dist: angularDistance(p.angle, angle) }))
    .sort((a, b) => a.dist - b.dist);

  // Always include 3 closest priorities
  const names = ranked.slice(0, 3).map((r) => r.name);
  // Conditionally include 4th and 5th if within 60°
  for (let i = 3; i < Math.min(5, ranked.length); i++) {
    if (ranked[i].dist <= 60) names.push(ranked[i].name);
  }
  return names;
}

function angularDistance(a: number, b: number): number {
  let diff = Math.abs(a - b);
  if (diff > 180) diff = 360 - diff;
  return diff;
}
```

---

## 8. Profile Strength

```typescript
export function computeDerivedFields(d_raw, i_raw, s_raw, c_raw, angle) {
  const vScore = d_raw + i_raw - (s_raw + c_raw);
  const hScore = i_raw + s_raw - (d_raw + c_raw);
  const magnitude = Math.sqrt(vScore ** 2 + hScore ** 2);
  const strengthPct = Math.min(100, Math.round((magnitude / 100) * 100));
  const profileStrength =
    strengthPct < 15 ? "balanced" :
    strengthPct < 45 ? "moderate" :
    "strong";
  const priorities = computePriorities(angle);
  return { profile_strength: profileStrength, strength_pct: strengthPct, priorities };
}
```

**Classification:**
- **Balanced (< 15%):** Scores are evenly distributed. Show "Balanced" profile instead of the 12-type result.
- **Moderate (15-44%):** Clear leanings but not extreme. Display ●●○ indicator.
- **Strong (≥ 45%):** Strong, consistent inclinations. Display ●●● indicator.

---

## 9. Quiz UI/UX — Full Flow

### Entry Point: `/candidate/disc-quiz` (Server Component)

```
1. Check authentication → redirect to /candidate/login if not authenticated
2. Check candidate_profiles.completed = true → redirect to /candidate/onboarding if not
3. Check existing disc_results → redirect to /candidate/disc-results if already completed
4. Fetch saved responses from disc_responses table
5. Fetch email from candidate_profiles
6. Render page with DiscQuiz client component
```

### Page Header

```
<h1> DISC Personality Quiz </h1>
<p> Answer honestly — there are no right or wrong answers. This helps us understand your work style. </p>
```

### Intro Screen (shown if no prior responses)

- Progress indicator: ✓ Application → ② Personality Quiz
- Title: "Almost There!"
- Subtitle: "Your application form is saved. Complete a short personality quiz to finish your registration."
- Info box (orange-50 bg, orange-100 border):
  - Clock icon
  - "~5 minutes"
  - "38 questions"
  - "No right or wrong answers — just answer honestly based on how you naturally think and behave."
- "Continue to Quiz →" button — starts the timer (`quizStartRef.current = Date.now()`)

### Quiz Steps (5 total)

**Step Navigation:**
- Step indicator (see [Section 12](#12-step-indicator-component))
- Labels: `["Pairs 1", "Pairs 2", "Pairs 3", "Ratings", "Scenarios"]`
- Back button: visible but `disabled:invisible` on Step 1
- Next button: "Next" on Steps 1-4, "See Results" on Step 5
- Validation: all questions on current step must be answered before advancing
- Error: "Please answer all questions before continuing." (red-50 bg, red-600 text)
- On navigation: `window.scrollTo({ top: 0, behavior: "smooth" })`

**Step 1 Disclaimer:**
```
"This work style quiz is designed to help you reflect on your natural work preferences.
It is not a psychometric instrument."
```
(stone-50 bg, stone-200 border, xs text)

**Format Instructions:**
- Steps 1-3: "In each pair, mark the circle near the word that describes you best. If neither word describes you or both describe you equally well, mark the circle in the center."
- Step 4: "Rate how well each word describes you, from 'Not Like Me' to 'Like Me'."
- Step 5: "Choose the option that best describes you in each scenario."

### Format A UI — Word Pair

```
Container: rounded-2xl border p-4 transition-colors
  Answered: border-stone-200 bg-stone-50
  Unanswered: border-stone-100 bg-white

Mobile (sm:hidden):
  Row 1: Left word label ←→ Right word label (xs font, stone-500)
  Row 2: 5 circular buttons (values 5, 4, 3, 2, 1 left-to-right)

Desktop (hidden sm:flex):
  Left label (w-32, right-aligned) | 5 buttons | Right label (w-32, left-aligned)

Buttons:
  Size: h-9 w-9 rounded-full border-2 (center button h-8 w-8)
  Unselected: border-stone-300 bg-white hover:border-orange-300
  Selected: border-orange-500 bg-orange-500
```

### Format B UI — Single Word

```
Container: same as Format A

Word: text-center text-sm font-semibold text-stone-800, mb-3

Mobile: "Not Like Me" / "Like Me" labels above buttons (xs, stone-400)
Desktop: labels flanking the buttons inline

Buttons: 5 numbered circles (1-5)
  Size: h-9 w-9 rounded-full border-2 text-xs font-medium
  Unselected: border-stone-300 bg-white text-stone-500 hover:border-orange-300
  Selected: border-orange-500 bg-orange-500 text-white
```

### Format C UI — Scenario

```
Container: same as Format A

Stem: text-sm font-medium text-stone-800, mb-3

Options: 2 full-width stacked buttons, space-y-2
  Each: w-full rounded-xl border-2 px-4 py-3 text-left text-sm transition-all
  Unselected: border-stone-200 bg-white text-stone-600 hover:border-orange-200
  Selected: border-orange-500 bg-orange-50 text-orange-800
```

### Email Field (Step 5 only)

```
Container: mt-8 rounded-2xl border-stone-200 bg-stone-50 p-5
Label: "Save my results to this email:"
Input: h-12 rounded-xl border-stone-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100
Placeholder: "you@example.com"
Helper: "Enter your email to save your results and get more info on your personality type."
Pre-populated from candidate profile email
```

### Calculating Overlay

Full-screen overlay shown during submission:

```
Container: fixed inset-0 z-50 bg-white/80 backdrop-blur-sm

Spinner: mx-auto h-12 w-12 animate-spin rounded-full border-4 border-stone-200 border-t-orange-500

Progress bar: h-2.5 rounded-full bg-stone-200
  Fill: h-2.5 rounded-full bg-orange-500 transition-all duration-500 ease-out

Percentage: text-2xl font-bold text-stone-800
Stage label: text-sm text-stone-500
```

**5-Stage Progression** (advances every 800ms):
1. 15% — "Saving your responses…"
2. 40% — "Analysing personality patterns…"
3. 65% — "Calculating DISC scores…"
4. 85% — "Generating your profile…"
5. 95% — "Almost there…"
6. 100% — "Done!" (set on success)

---

## 10. Results Page UI

### Server Component: `/candidate/disc-results`

```
1. Check authentication → redirect to /candidate/login
2. Fetch disc_results → redirect to /candidate/disc-quiz if none
3. Compute derived fields (profile_strength, strength_pct, priorities)
4. Determine display type (Balanced override if strength < 15%)
5. Sort scores highest-first for bar chart
6. Determine primary color based on first letter of disc_type
```

### Layout (space-y-6)

#### 1. Hero Card — Type Result

```
Container: rounded-3xl border {primaryColor.border} {primaryColor.bg} px-6 py-8 text-center
  Decorative gradients: top-right and bottom-left white circles

Content:
  "Your DISC Profile" — xs uppercase tracking-[0.2em] text-stone-400
  Type full name — text-4xl font-bold {primaryColor.text}
  Motto — text-base italic text-stone-500, in quotes
  Descriptors — flex wrap gap-2, each as rounded-full pill with border and bg-white/70
  Description — mx-auto max-w-md text-sm text-stone-600

Profile Strength:
  Balanced → "Your closest style: {angleType fullName}" (xs text-stone-400)
  Strong → ●●● "Strong inclination" (primaryColor.text)
  Moderate → ●●○ "Moderate inclination" (primaryColor.text)
```

#### 2. Chart + Score Breakdown (grid gap-6 lg:grid-cols-5)

**Personality Map** (lg:col-span-3):
```
Container: rounded-3xl border-stone-200 bg-white px-8 py-5
Title: "Personality Map" — xs uppercase tracking-[0.15em] text-stone-400
CircumplexChart component (see Section 11)
```

**Style Tendencies** (lg:col-span-2):
```
Container: rounded-3xl border-stone-200 bg-white p-5
Title: "Style Tendencies" — same as above
4 rows, sorted by percentage (highest first):
  Each row:
    Label: text-sm font-semibold {dimension color}
    Percentage: text-lg font-bold text-stone-800
    Bar: h-2.5 rounded-full bg-stone-100
      Fill: h-2.5 rounded-full {dimension bar color}, width = pct%
      Midline: absolute left-1/2 h-2.5 w-px border-l border-dashed border-stone-300
Footer: "50% midline" — text-[10px] text-stone-300
Balanced note: "Your scores are closely balanced..." (xs text-stone-400)
```

#### 3. Your Priorities

```
Container: rounded-3xl border-stone-200 bg-white p-5
Title: "Your Priorities"
Subtitle: "The areas where you focus your energy"

Top 3: grid gap-3 sm:grid-cols-3
  Each card:
    Container: rounded-2xl border-stone-100 bg-stone-50/50
    Top bar: h-1, backgroundColor = dimension hex
    Content (p-4):
      Dot (h-2 w-2 rounded-full, dimension color) + Priority name (text-sm font-semibold)
      Description (text-xs text-stone-500)

Additional (if > 3):
  "Also relevant: {names}" — xs text-stone-400, names in font-medium text-stone-500
```

#### 4. Strengths & Blind Spots (grid gap-4 sm:grid-cols-2)

**Strengths:**
```
Container: rounded-2xl border-emerald-100 bg-emerald-50/50 p-5
Header: "+" icon (h-6 w-6 rounded-full bg-emerald-100 text-emerald-700) + "Strengths" (text-sm font-semibold text-emerald-800)
Items: 4 bullets, each with emerald-400 dot + text in emerald-700/80
```

**Blind Spots:**
```
Container: rounded-2xl border-amber-100 bg-amber-50/50 p-5
Header: "!" icon (h-6 w-6 rounded-full bg-amber-100 text-amber-700) + "Blind Spots" (text-sm font-semibold text-amber-800)
Items: 4 bullets, each with amber-400 dot + text in amber-700/80
```

#### 5. Disclaimer

```
"This assessment is for personal reflection only. Your work style may vary across situations and over time."
— text-center text-xs text-stone-400
```

#### 6. Completion Card

```
Container: rounded-3xl border-orange-200/60 bg-gradient-to-br from-orange-50 to-amber-50/50 p-6 text-center
Title: "Application Complete" — text-lg font-semibold text-stone-800
Message: "Thank you for completing your application and personality assessment. Our team will review your profile and get back to you soon."
Sign Out button
```

---

## 11. Circumplex Chart (SVG)

Interactive SVG visualisation rendered as a client component.

### Props

```typescript
interface CircumplexChartProps {
  d: number;        // D percentile
  i: number;        // I percentile
  s: number;        // S percentile
  c: number;        // C percentile
  angle: number;    // Circumplex angle 0-360
  priorities: string[];
  priorityDefs: PriorityDef[];
  profileStrength: "strong" | "moderate" | "balanced";
  strengthPct: number;
}
```

### Layout

```
SVG viewBox="0 -14 400 428", max-w-[340px]
Center: cx=200, cy=200
Outer radius: 140px
```

### Quadrant Configuration

```typescript
const QUADRANTS = {
  D: { color: "#2B8C8C", startAngle: 90,  endAngle: 180, labelPos: { x: -0.42, y: -0.42 } },
  I: { color: "#7B5EA7", startAngle: 0,   endAngle: 90,  labelPos: { x: 0.42,  y: -0.42 } },
  S: { color: "#D4876C", startAngle: 270, endAngle: 360, labelPos: { x: 0.42,  y: 0.48 } },
  C: { color: "#4A7FB5", startAngle: 180, endAngle: 270, labelPos: { x: -0.42, y: 0.48 } },
};
```

### Elements (layered bottom to top)

1. **Quadrant tints** — 4 arc paths, fill = quadrant color at opacity 0.06
2. **Bloom overlay** — Radial gradient circle from user dot position, hidden for balanced profiles
3. **Outer circle** — stroke #d6d3d1, strokeWidth 1.5
4. **Reference circles** — 2 concentric at 33% and 66% radius, dashed, light gray
5. **Axis lines** — Horizontal and vertical through center
6. **Quadrant letters** — D, I, S, C at quadrant label positions, dimmed when a priority is active
7. **Priority labels** — 8 labels at outerR + 16px, positioned by angle:
   - User priorities: text-[10px] font-bold, dimension color, opacity 0.9
   - Non-priorities: text-[9px] font-medium, #c4c0b8, opacity 0.4
   - Interactive: hover/click to select, shows tooltip below chart
8. **User dot** — White circle (r=7) with dark stroke (r=3 inner dot), glow filter
   - Distance from center = `outerR * (0.15 + normalizedMag * 0.7)` (15-85% of radius)
   - Position angle = circumplex angle
9. **Balanced pulse ring** — Animated dashed circle if profile is balanced:
   - `<animate>` radius: 12→18→12, opacity: 0.4→0.1→0.4, dur=3s, infinite

### Tooltip

```
Appears below SVG on priority hover/click:
Container: mx-auto mt-1 max-w-[260px] rounded-xl border px-4 py-2.5 text-center animate-in fade-in duration-200
  Border/bg tinted with priority's dimension color
  Priority name in bold + "Your priority" badge if applicable
```

---

## 12. Step Indicator Component

Shared between onboarding and quiz. Accepts `currentStep`, `totalSteps`, `labels`.

### Mobile (`sm:hidden`)

```
Row: "Step {n} of {total}" + current label (font-medium text-stone-700)
Progress bar: h-2 rounded-full bg-stone-200
  Fill: h-2 rounded-full bg-orange-500, width = (step/total)*100%, transition-all duration-300
```

### Desktop (`hidden sm:flex`)

```
Horizontal row of numbered circles connected by lines:
  Completed step: bg-orange-500 text-white + checkmark SVG
  Current step: border-2 border-orange-500 bg-white text-orange-500
  Future step: border-2 border-stone-200 bg-white text-stone-400
  Labels below: current = font-medium text-orange-600, completed = text-stone-500, future = text-stone-400
  Connectors: mx-1 h-0.5 w-8 lg:w-12, completed = bg-orange-500, else bg-stone-200
```

---

## 13. Auto-Save & Progress Recovery

### Auto-Save (every answer change)

```typescript
// In DiscQuiz.tsx useEffect
useEffect(() => {
  if (Object.keys(responses).length === 0) return;
  saveQuizProgress(responses).catch(() => {});
  broadcastProgress(userId, "quiz");
}, [responses]);
```

`saveQuizProgress` upserts to `disc_responses` table (on conflict: user_id).

### Progress Recovery (page load)

```typescript
// In page.tsx (server component)
const { data: savedResponses } = await supabase
  .from("disc_responses")
  .select("responses")
  .eq("user_id", user.id)
  .single();

<DiscQuiz initialResponses={savedResponses?.responses} />
```

If `initialResponses` has entries, skip the intro screen and resume the quiz.

---

## 14. Real-Time Progress Broadcasting

```typescript
type CandidateState = "form" | "quiz" | "viewing-results" | "signed-out";

// Broadcast from candidate browser
broadcastProgress(userId: string, state: CandidateState);

// Staff portal subscribes
onProgress(callback: (payload: ProgressPayload) => void);
```

**Integration Points:**
- `DiscQuiz.tsx` → broadcasts "quiz" on every answer
- `ResultsLive.tsx` → broadcasts "viewing-results" when viewing results page
- `SignOutButton.tsx` → broadcasts "signed-out" before redirect
- `OnboardingForm.tsx` → broadcasts "form" during profile completion

**Staff Portal Behaviour:**
- Real-time state updates without DB polling
- Debounced refresh (500ms) only for data-changing states ("quiz", "form")
- Auto-clear "signed-out" state after 60 seconds
- Fallback polling every 30s

---

## 15. Submission Pipeline

```typescript
export async function submitDiscQuiz(responses, resultsEmail?, durationSeconds?) {
  // 1. Authenticate
  const user = await getUser();
  if (!user) return { error: "Not authenticated." };

  // 2. Validate all 38 questions answered
  if (Object.keys(responses).length < 38) {
    return { error: `Please answer all questions (${count}/38).` };
  }

  // 3. Save raw responses
  await supabase.from("disc_responses").upsert({ user_id, responses, updated_at });

  // 4. Calculate DISC scores
  const scores = calculateDiscScores(responses);

  // 5. Save results (exclude derived fields)
  const { profile_strength, strength_pct, priorities, ...dbScores } = scores;
  await supabase.from("disc_results").upsert({ user_id, results_email, duration_seconds, ...dbScores });

  // 6. Fetch candidate name for PDF/email
  const profile = await supabase.from("candidate_profiles").select("full_name, contact_number");

  // 7. Background: Generate PDF → upload to Supabase Storage → update invitation
  (async () => {
    const pdfBuffer = await generateDiscPdf({ ...data });
    const filePath = await uploadCandidatePdf(user.id, "disc-profile", pdfBuffer);
    await admin.from("invitations").update({ disc_pdf_path: filePath });
  })();

  // 8. Background: Send email with results
  sendDiscResultsEmail({ ...data }).catch(() => {});

  // 9. Redirect to results page
  redirect("/candidate/disc-results");
}
```

### Duration Tracking

```typescript
// Timer starts when user clicks "Continue to Quiz"
quizStartRef.current = Date.now();

// On submission
const durationSeconds = Math.round((Date.now() - quizStartRef.current) / 1000);
```

Stored in `disc_results.duration_seconds`.

---

## 16. PDF Generation

Uses PDFKit. The PDF mirrors the web results page:

- **Header:** Lyfe logo + "DISC PERSONALITY PROFILE" subtitle
- **Hero section:** Name, type, motto, descriptors, strength indicator, description
- **Circumplex chart:** Full-width circle with quadrant tints, axes, reference circles, 8 priority labels, user position dot
- **Style tendencies:** 4 horizontal progress bars (D, I, S, C percentages)
- **Priorities section:** Top 3+ priorities with descriptions
- **Strengths & blind spots:** Two-column bullet lists

**Storage:** Uploaded to Supabase Storage bucket `candidate-pdfs` at path `{userId}/disc-profile.pdf`. File path saved to `invitations.disc_pdf_path`.

---

## 17. Email Delivery

HTML email sent to the `results_email` address with:

- Hero card: name, type, motto, descriptors, strength dots
- Style tendencies: 4 score bars
- Priorities: top 3 + additional
- Strengths & blind spots: green/amber lists
- Contact info

PDF attached to the email.

---

## 18. Staff Portal Integration

### Progress Tracking

```typescript
interface InvitationProgress {
  profile_completed: boolean;
  onboarding_step: number;
  quiz_answered: number;         // 0-38 questions answered
  quiz_completed: boolean;       // Has disc_results record
  disc_type?: string;            // Type if completed
}
```

### Progress Bar Display

- Form stage: 0-50% progress
- Quiz in progress: 50-100% (based on questions answered / 38)
- Completed: 100% (green)

### Real-Time State Badges

- "quiz" → Blue bar with question count
- "viewing-results" → Green bar with "Viewing results"
- "signed-out" → Gray with "Signed out"
- "completed" → Green with "Completed"

### Staff Actions

- **Reset quiz** — Deletes `disc_results` and `disc_responses`, candidate must retake
- **Download DISC PDF** — Signed URL from `invitations.disc_pdf_path` (5-minute expiry)
- **Archive candidate** — Sets `archived_at` timestamp

---

## 19. Route Guards

| Route | Requires | Redirect |
|-------|----------|----------|
| `/candidate/disc-quiz` | Authenticated | → `/candidate/login` |
| `/candidate/disc-quiz` | `candidate_profiles.completed = true` | → `/candidate/onboarding` |
| `/candidate/disc-quiz` | No existing `disc_results` | → `/candidate/disc-results` |
| `/candidate/disc-results` | Authenticated | → `/candidate/login` |
| `/candidate/disc-results` | Existing `disc_results` | → `/candidate/disc-quiz` |

---

## 20. Color System

### DISC Dimension Colors

| Dimension | Hex | Usage |
|-----------|-----|-------|
| D (Drive) | `#2B8C8C` | Teal — text, bar fills, chart quadrant, priority labels |
| I (Influence) | `#7B5EA7` | Purple |
| S (Support) | `#D4876C` | Coral |
| C (Clarity) | `#4A7FB5` | Blue |
| Balanced | `#78716c` | Stone-700 |

### Tailwind Classes Per Dimension

```typescript
const DISC_COLORS = {
  D: { hex: "#2B8C8C", text: "text-[#2B8C8C]", bg: "bg-[#2B8C8C]/5", bar: "bg-[#2B8C8C]", border: "border-[#2B8C8C]/20" },
  I: { hex: "#7B5EA7", text: "text-[#7B5EA7]", bg: "bg-[#7B5EA7]/5", bar: "bg-[#7B5EA7]", border: "border-[#7B5EA7]/20" },
  S: { hex: "#D4876C", text: "text-[#D4876C]", bg: "bg-[#D4876C]/5", bar: "bg-[#D4876C]", border: "border-[#D4876C]/20" },
  C: { hex: "#4A7FB5", text: "text-[#4A7FB5]", bg: "bg-[#4A7FB5]/5", bar: "bg-[#4A7FB5]", border: "border-[#4A7FB5]/20" },
};
```

### UI Accent Colors

- **Primary accent:** orange-500 (buttons, selection states, progress fills)
- **Hover accent:** orange-600 (button hover), orange-300 (radio hover)
- **Selection:** orange-500 bg + white text (Format B), orange-500 border + orange-50 bg (Format C)
- **Strengths:** emerald-50/100/400/700/800
- **Blind Spots:** amber-50/100/400/700/800
- **Errors:** red-50 bg, red-600 text

---

## 21. Responsive Design

### Breakpoints

- `sm:` (640px) — Primary breakpoint for layout switches
- `lg:` (1024px) — Desktop refinements

### Component-Level Responsiveness

**Word Pair (Format A):**
- Mobile: Stacked — labels row above, buttons row below
- Desktop: Inline — left label | buttons | right label

**Single Word (Format B):**
- Mobile: "Not Like Me" / "Like Me" labels stacked above buttons
- Desktop: Labels inline on left/right sides

**Scenario (Format C):**
- Same on all viewports (full-width stacked buttons)

**Step Indicator:**
- Mobile: Simple text + progress bar
- Desktop: Numbered circles with connecting lines

**Results Layout:**
- Mobile: Single column
- Desktop: `lg:grid-cols-5` — Chart (3 cols) + Scores (2 cols)
- Priorities: `sm:grid-cols-3`
- Strengths/Blind Spots: `sm:grid-cols-2`

---

## 22. Testing Requirements

### Unit Tests (Vitest)

**Scoring algorithm:**
- All-left answers (all 1s) → verify raw scores, percentiles, angle, type
- All-right answers (all 5s) → verify opposite
- All-neutral answers (all 3s) → verify balanced result
- Mixed answers → verify correct type mapping
- Verify angle calculation matches expected quadrant
- Verify profile strength thresholds (< 15 = balanced, < 45 = moderate, ≥ 45 = strong)
- Verify priority selection (3 closest + conditionally 4th/5th within 60°)
- Verify dimension ranges are computed correctly
- Edge cases: exactly on type boundary angles (0°, 30°, 60°, etc.)

**Validation:**
- Reject submission with < 38 answers
- Accept submission with exactly 38 answers

### E2E Tests (Playwright)

- Complete quiz flow: intro → all 5 steps → results display
- Verify all question formats render correctly
- Verify step navigation (back/forward)
- Verify validation prevents skipping unanswered questions
- Verify results page shows correct type, chart, bars, priorities
- Verify auto-save and progress recovery (leave and return)

---

## 23. Key Implementation Notes

1. **Dimensions are independent** — Percentiles do NOT sum to 100%. A person can score high on both D and I simultaneously. Each dimension is an independent 0-100 measure where 50 = midline.

2. **The circumplex model is the core** — The angle determines the type, the magnitude determines the strength. Raw scores feed both the percentile bars AND the circumplex position, but they serve different purposes.

3. **"Balanced" is not a 13th type on the circle** — It's a strength-based override. When magnitude < 15%, the circumplex position is too weak to meaningfully differentiate, so the system falls back to "Balanced" with the closest type noted.

4. **Question 39 is intentional** — It's grouped in Step 2 despite non-sequential numbering. There are 38 total questions, IDs are: 1-24, 25-32, 33-38, 39. The ID has no effect on scoring.

5. **Auto-save is critical** — Candidates may close or reopen the browser mid-quiz. All progress must survive. The useEffect on `responses` state fires `saveQuizProgress` on every answer change.

6. **PDF must match the web results** — Same chart, same data, same layout. Use PDFKit to render an equivalent circumplex visualisation.

7. **All DISC colors are intentional** — Teal (D), Purple (I), Coral (S), Blue (C). These are the brand colours for this assessment — do not substitute with generic chart colours.

8. **Server actions handle the heavy lifting** — `submitDiscQuiz` is the single entry point that calculates, saves, generates PDF, sends email, and redirects. PDF and email are non-blocking (fire-and-forget with error logging).

9. **Derived fields are NOT stored in the database** — `profile_strength`, `strength_pct`, and `priorities` are computed on-the-fly from raw scores and angle using `computeDerivedFields()`. This avoids schema migration when the algorithm changes.

10. **Button value order matters for Format A** — The buttons render as `[5, 4, 3, 2, 1]` left-to-right, so clicking near the LEFT word gives value 5 (which maps to `contribution = +2` for the left type). This is correct — higher value = stronger identification with the left word.

---

## 24. File Inventory

### Core Quiz Logic

| File | Purpose |
|------|---------|
| `src/app/candidate/disc-quiz/questions.ts` | All 38 questions, format types, step groupings |
| `src/app/candidate/disc-quiz/scoring.ts` | Scoring algorithm, 12+1 result types, priorities, derived fields |
| `src/app/candidate/disc-quiz/actions.ts` | Server actions: submitDiscQuiz, saveQuizProgress |
| `src/app/candidate/disc-quiz/page.tsx` | Quiz page: auth guards, progress recovery, server component |
| `src/app/candidate/disc-quiz/DiscQuiz.tsx` | Quiz UI: state, navigation, all 3 question formats, overlay |

### Results Display

| File | Purpose |
|------|---------|
| `src/app/candidate/disc-results/page.tsx` | Results page: hero card, bars, priorities, strengths/blind spots |
| `src/app/candidate/disc-results/CircumplexChart.tsx` | SVG circumplex chart with interactive priority labels |
| `src/app/candidate/disc-results/ResultsLive.tsx` | Broadcasts "viewing-results" state (side-effect component) |
| `src/app/candidate/disc-results/SignOutButton.tsx` | Sign out with "signed-out" broadcast |
| `src/app/candidate/disc-results/loading.tsx` | Skeleton loading state |

### Shared Components

| File | Purpose |
|------|---------|
| `src/components/ui/StepIndicator.tsx` | Step progress indicator (mobile bar + desktop circles) |

### Server Infrastructure

| File | Purpose |
|------|---------|
| `src/lib/pdf.ts` | PDFKit-based DISC PDF generation |
| `src/lib/email.ts` | HTML email with results + PDF attachment |
| `src/lib/supabase/storage.ts` | Upload/download PDF to Supabase Storage |
| `src/lib/supabase/progress-broadcast.ts` | Real-time broadcast system |
| `src/lib/supabase/server.ts` | Server-side Supabase client |
| `src/lib/supabase/admin.ts` | Admin client (service role, bypasses RLS) |
| `src/lib/supabase/client.ts` | Browser-side Supabase client |
| `src/lib/supabase/database.types.ts` | Auto-generated TypeScript types |

### Database Migrations

| File | Purpose |
|------|---------|
| `supabase/migrations/001_candidate_tables.sql` | disc_responses, disc_results, candidate_profiles, invitations |
| `supabase/migrations/005_enable_realtime.sql` | progress_signals table + triggers |
| `supabase/migrations/006_hardening.sql` | results_email column |
| `supabase/migrations/007_disc_duration.sql` | duration_seconds column |
| `supabase/migrations/008_pdf_storage.sql` | PDF path columns on invitations |

### Staff Portal

| File | Purpose |
|------|---------|
| `src/app/staff/invite/InviteClient.tsx` | Real-time progress tracking, PDF download, quiz reset |
| `src/app/staff/actions.ts` | Staff server actions |

### Tests

| File | Purpose |
|------|---------|
| `src/app/candidate/disc-quiz/__tests__/scoring.test.ts` | Scoring algorithm unit tests (Vitest) |
| `tests/e2e/candidate-disc-quiz.spec.ts` | Quiz E2E tests (Playwright) |
| `tests/e2e/candidate-disc-results.spec.ts` | Results E2E tests (Playwright) |
