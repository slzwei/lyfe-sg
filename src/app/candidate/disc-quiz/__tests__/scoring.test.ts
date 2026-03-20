import { describe, it, expect } from "vitest";
import {
  calculateDiscScores,
  computeDerivedFields,
  type DISCScores,
} from "../scoring";
import { DISC_STEPS, type Question } from "../questions";

/** Flat list of every question for building responses. */
const ALL_QUESTIONS: Question[] = DISC_STEPS.flat();

/** Helper: build a responses map with the same value for every question. */
function uniformResponses(value: number): Record<string, number> {
  const responses: Record<string, number> = {};
  for (const q of ALL_QUESTIONS) {
    if (q.format === "C") {
      // Format C is binary: 1 or 2
      responses[String(q.id)] = value <= 1 ? 1 : 2;
    } else {
      responses[String(q.id)] = value;
    }
  }
  return responses;
}

describe("calculateDiscScores", () => {
  // ─── Test 1: All neutral answers ───────────────────────────────────────────
  it("returns mid-range percentages (~50) for all-neutral (value 3) answers", () => {
    const responses = uniformResponses(3);
    const scores = calculateDiscScores(responses);

    // With all Format A/B answers at 3, contribution = 3-3 = 0 for those.
    // Format C still contributes +-1 to some dimensions, so percentages
    // will be near 50 but may not be exactly 50.
    for (const key of ["d_pct", "i_pct", "s_pct", "c_pct"] as const) {
      expect(scores[key]).toBeGreaterThanOrEqual(30);
      expect(scores[key]).toBeLessThanOrEqual(70);
    }
  });

  // ─── Test 2: High-D profile ────────────────────────────────────────────────
  it("produces highest D percentage and D-family disc_type for a high-D profile", () => {
    const responses: Record<string, number> = {};

    for (const q of ALL_QUESTIONS) {
      if (q.format === "A") {
        // Maximise D: if leftType is D, push slider left (5); if rightType is D,
        // push slider right (1). Otherwise neutral (3).
        if (q.leftType === "D") {
          responses[String(q.id)] = 5;
        } else if (q.rightType === "D") {
          responses[String(q.id)] = 1;
        } else {
          responses[String(q.id)] = 3;
        }
      } else if (q.format === "B") {
        // Maximise D: if discType is D set to 5; otherwise 1 to avoid boosting others.
        responses[String(q.id)] = q.discType === "D" ? 5 : 1;
      } else if (q.format === "C") {
        // Pick whichever option uses axis "n" (D,I) or "e" (D,C) — both boost D.
        // Prefer "n" or "e"; fall back to option A.
        const aBoostsD = q.optionA.axis === "n" || q.optionA.axis === "e";
        const bBoostsD = q.optionB.axis === "n" || q.optionB.axis === "e";
        if (aBoostsD) {
          responses[String(q.id)] = 1;
        } else if (bBoostsD) {
          responses[String(q.id)] = 2;
        } else {
          responses[String(q.id)] = 1;
        }
      }
    }

    const scores = calculateDiscScores(responses);

    // D percentage should be the highest
    expect(scores.d_pct).toBeGreaterThan(scores.i_pct);
    expect(scores.d_pct).toBeGreaterThan(scores.s_pct);
    expect(scores.d_pct).toBeGreaterThan(scores.c_pct);

    // disc_type should start with "D" (could be D, Di, or Dc)
    expect(scores.disc_type).toMatch(/^D/);
  });

  // ─── Test 5: Return object has all expected fields ─────────────────────────
  it("returns an object with all expected DISCScores fields", () => {
    const responses = uniformResponses(3);
    const scores = calculateDiscScores(responses);

    const expectedFields: (keyof DISCScores)[] = [
      "d_raw",
      "i_raw",
      "s_raw",
      "c_raw",
      "d_pct",
      "i_pct",
      "s_pct",
      "c_pct",
      "disc_type",
      "angle",
      "profile_strength",
      "strength_pct",
      "priorities",
    ];

    for (const field of expectedFields) {
      expect(scores).toHaveProperty(field);
    }

    // Type-level checks
    expect(typeof scores.d_raw).toBe("number");
    expect(typeof scores.i_raw).toBe("number");
    expect(typeof scores.s_raw).toBe("number");
    expect(typeof scores.c_raw).toBe("number");
    expect(typeof scores.d_pct).toBe("number");
    expect(typeof scores.i_pct).toBe("number");
    expect(typeof scores.s_pct).toBe("number");
    expect(typeof scores.c_pct).toBe("number");
    expect(typeof scores.disc_type).toBe("string");
    expect(typeof scores.angle).toBe("number");
    expect(typeof scores.profile_strength).toBe("string");
    expect(typeof scores.strength_pct).toBe("number");
    expect(Array.isArray(scores.priorities)).toBe(true);
  });
});

describe("computeDerivedFields", () => {
  // ─── Test 3: Profile strength thresholds ───────────────────────────────────
  it('returns "balanced" when strength_pct < 15', () => {
    // All raw scores equal → vScore = 0, hScore = 0 → magnitude = 0 → strengthPct = 0
    const result = computeDerivedFields(0, 0, 0, 0, 0);
    expect(result.strength_pct).toBeLessThan(15);
    expect(result.profile_strength).toBe("balanced");
  });

  it('returns "moderate" when strength_pct is 15-44', () => {
    // vScore = d+i - (s+c) = 20+0 - (0+0) = 20
    // hScore = i+s - (d+c) = 0+0 - (20+0) = -20
    // magnitude = sqrt(400 + 400) ≈ 28.28 → strengthPct = min(100, round(28.28)) = 28
    const result = computeDerivedFields(20, 0, 0, 0, 90);
    expect(result.strength_pct).toBeGreaterThanOrEqual(15);
    expect(result.strength_pct).toBeLessThan(45);
    expect(result.profile_strength).toBe("moderate");
  });

  it('returns "strong" when strength_pct >= 45', () => {
    // vScore = 50+0 - (0+0) = 50
    // hScore = 0+0 - (50+0) = -50
    // magnitude = sqrt(2500 + 2500) ≈ 70.71 → strengthPct = 71
    const result = computeDerivedFields(50, 0, 0, 0, 90);
    expect(result.strength_pct).toBeGreaterThanOrEqual(45);
    expect(result.profile_strength).toBe("strong");
  });

  // ─── Test 4: Priorities ────────────────────────────────────────────────────
  it("returns 3-5 priorities, closest angles first", () => {
    // Angle 90 = Action priority (exact match at 90°).
    // Closest priorities: Action (90°), Enthusiasm (45°), Results (135°), then
    // Collaboration (0°) and Challenge (180°) at 90° — beyond 60° threshold.
    const result = computeDerivedFields(10, 10, 0, 0, 90);
    expect(result.priorities.length).toBeGreaterThanOrEqual(3);
    expect(result.priorities.length).toBeLessThanOrEqual(5);

    // The exact-match priority (Action at 90°) must be first
    expect(result.priorities[0]).toBe("Action");
  });

  it("includes 4th/5th priorities only if within 60 degrees", () => {
    // Angle 0 = Collaboration (0°), Support (315° → dist 45), Enthusiasm (45° → dist 45),
    // Stability (270° → dist 90), Accuracy (225° → dist 135)
    // Top 3 guaranteed; 4th at dist 90 > 60 → should NOT be included
    const result = computeDerivedFields(0, 10, 10, 0, 0);
    expect(result.priorities.length).toBe(3);
  });
});
