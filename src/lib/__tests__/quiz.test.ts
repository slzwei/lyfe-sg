import { describe, it, expect } from "vitest";
import {
  MODULE_IDS,
  MODULE_META,
  isValidModuleId,
  isValidQuizId,
  getModuleDef,
  getQuizList,
  getClientQuiz,
  gradeQuizAnswers,
} from "@/lib/quiz";

describe("quiz module registry", () => {
  it("has 4 modules", () => {
    expect(MODULE_IDS).toEqual(["m9", "res5", "hi", "m9a"]);
  });

  it("MODULE_META matches MODULE_IDS", () => {
    expect(MODULE_META.map((m) => m.id)).toEqual([...MODULE_IDS]);
  });

  it("validates module IDs", () => {
    expect(isValidModuleId("m9")).toBe(true);
    expect(isValidModuleId("res5")).toBe(true);
    expect(isValidModuleId("hi")).toBe(true);
    expect(isValidModuleId("m9a")).toBe(true);
    expect(isValidModuleId("fake")).toBe(false);
  });
});

describe.each(MODULE_IDS)("module %s", (moduleId) => {
  const mod = getModuleDef(moduleId);
  const quizzes = getQuizList(moduleId);

  it("has valid module definition", () => {
    expect(mod.code).toBeTruthy();
    expect(mod.title).toBeTruthy();
    expect(mod.duration).toBeGreaterThan(0);
    expect(mod.questionCount).toBeGreaterThan(0);
    expect(mod.passingGrade).toBeTruthy();
  });

  it("has quizzes matching quizIds", () => {
    expect(quizzes.length).toBe(mod.quizIds.length);
    quizzes.forEach((q) => {
      expect(isValidQuizId(moduleId, q.id)).toBe(true);
    });
  });

  it("rejects invalid quiz IDs", () => {
    expect(isValidQuizId(moduleId, "nonexistent")).toBe(false);
  });

  describe.each(quizzes.map((q) => q.id))("quiz %s", (quizId) => {
    const clientQuiz = getClientQuiz(moduleId, quizId)!;

    it("loads client quiz with answers stripped", () => {
      expect(clientQuiz).toBeTruthy();
      expect(clientQuiz.moduleId).toBe(moduleId);
      expect(clientQuiz.quizId).toBe(quizId);
      expect(clientQuiz.total_questions).toBe(mod.questionCount);
      expect(clientQuiz.duration).toBe(mod.duration);
      expect(clientQuiz.questions.length).toBe(mod.questionCount);
    });

    it("has no answer data in client quiz", () => {
      clientQuiz.questions.forEach((q) => {
        expect(q).not.toHaveProperty("correct_answer_letter");
        expect(q).not.toHaveProperty("correct_answer");
      });
    });

    it("has sequential question numbers 1..N", () => {
      const nums = clientQuiz.questions.map((q) => q.question_number);
      const expected = Array.from(
        { length: mod.questionCount },
        (_, i) => i + 1
      );
      expect(nums).toEqual(expected);
    });

    it("each question has 4-5 options", () => {
      clientQuiz.questions.forEach((q) => {
        expect(q.options.length).toBeGreaterThanOrEqual(4);
        expect(q.options.length).toBeLessThanOrEqual(5);
      });
    });

    it("grades 100% when all answers correct", () => {
      // Build perfect answers by using the grading function with known-correct answers
      // We need access to the answer letters — grade with all possible letters and find correct ones
      const perfectAnswers: Record<string, string> = {};
      // Try grading with each letter to find correct answers
      for (let qn = 1; qn <= mod.questionCount; qn++) {
        for (const letter of ["A", "B", "C", "D", "E"]) {
          const test = { [String(qn)]: letter };
          const result = gradeQuizAnswers(moduleId, quizId, test, 100);
          const qResult = result.questions.find(
            (q) => q.question_number === qn
          );
          if (qResult?.is_correct) {
            perfectAnswers[String(qn)] = letter;
            break;
          }
        }
      }

      const result = gradeQuizAnswers(moduleId, quizId, perfectAnswers, 100);
      expect(result.score).toBe(mod.questionCount);
      expect(result.total).toBe(mod.questionCount);
      expect(result.passed).toBe(true);
    });

    it("grades 0% when no answers given", () => {
      const result = gradeQuizAnswers(moduleId, quizId, {}, 100);
      expect(result.score).toBe(0);
      expect(result.total).toBe(mod.questionCount);
      expect(result.passed).toBe(false);
    });

    it("returns correct question results structure", () => {
      const result = gradeQuizAnswers(
        moduleId,
        quizId,
        { "1": "A" },
        100
      );
      expect(result.questions.length).toBe(mod.questionCount);

      const q1 = result.questions[0];
      expect(q1.question_number).toBe(1);
      expect(q1.selected_letter).toBe("A");
      expect(q1.correct_answer_letter).toBeTruthy();
      expect(q1.correct_answer).toBeTruthy();
      expect(typeof q1.is_correct).toBe("boolean");

      // Unanswered questions should have null selected_letter
      const q2 = result.questions[1];
      expect(q2.selected_letter).toBeNull();
      expect(q2.is_correct).toBe(false);
    });
  });
});

describe("RES5 two-part grading", () => {
  it("returns part results for RES5", () => {
    const result = gradeQuizAnswers("res5", "mock-1", {}, 100);
    expect(result.parts).toBeDefined();
    expect(result.parts!.length).toBe(2);

    const [p1, p2] = result.parts!;
    expect(p1.name).toBe("Part I");
    expect(p1.total).toBe(110);
    expect(p1.passPercent).toBe(75);
    expect(p1.passRequired).toBe(83);

    expect(p2.name).toBe("Part II");
    expect(p2.total).toBe(40);
    expect(p2.passPercent).toBe(80);
    expect(p2.passRequired).toBe(32);
  });

  it("fails if Part I passes but Part II fails", () => {
    // Answer Part I correctly (Q1-110), skip Part II
    const answers: Record<string, string> = {};
    const fullResult = gradeQuizAnswers("res5", "mock-1", {}, 0);
    // Get correct answers for Part I only
    for (const q of fullResult.questions) {
      if (q.question_number <= 110) {
        answers[String(q.question_number)] = q.correct_answer_letter;
      }
    }

    const result = gradeQuizAnswers("res5", "mock-1", answers, 100);
    expect(result.parts![0].passed).toBe(true); // Part I passed
    expect(result.parts![1].passed).toBe(false); // Part II failed (0/40)
    expect(result.passed).toBe(false); // Overall fail
  });

  it("does NOT return parts for simple-graded modules", () => {
    const result = gradeQuizAnswers("m9", "set-a", {}, 100);
    expect(result.parts).toBeUndefined();
  });
});

describe("shared passage grouping", () => {
  it("M9 Set A has shared passages on Q96-98", () => {
    const quiz = getClientQuiz("m9", "set-a")!;
    const passageQs = quiz.questions.filter((q) => q.shared_passage);
    expect(passageQs.length).toBeGreaterThanOrEqual(2);

    const nums = passageQs.map((q) => q.question_number);
    expect(nums).toContain(96);
    expect(nums).toContain(97);
    expect(nums).toContain(98);

    // All share the same passage
    const passages = new Set(passageQs.map((q) => q.shared_passage));
    expect(passages.size).toBe(1);
  });

  it("RES5 Mock 2 has shared passages on Q117-122", () => {
    const quiz = getClientQuiz("res5", "mock-2")!;
    const passageQs = quiz.questions.filter((q) => q.shared_passage);
    expect(passageQs.length).toBe(6);
    expect(passageQs[0].question_number).toBe(117);
    expect(passageQs[5].question_number).toBe(122);
  });
});
