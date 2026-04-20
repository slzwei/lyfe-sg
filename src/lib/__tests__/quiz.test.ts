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
  parseChapter,
  getChaptersForModule,
  getTutorialQuestions,
  isValidChapterKey,
  findTutorialItem,
  UNCATEGORISED_KEY,
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

describe("parseChapter", () => {
  it.each([
    ["C9", "9"],
    ["C14", "14"],
    ["C14/8.15(ii)", "14"],
    ["C23/2.5", "23"],
    ["C3/5.3", "3"],
    ["C27", "27"],
    ["C1/10.42", "1"],
  ])("parses %s to %s", (ref, expected) => {
    expect(parseChapter(ref)).toBe(expected);
  });

  it.each([
    [""],
    ["   "],
    [null],
    [undefined],
    ["C.14/8.15(ii)"], // leading dot — not a valid chapter pattern, should be normalised upstream
    ["4/3.3"], // missing C prefix — should be normalised upstream
    ["Chapter 9"],
    ["random"],
  ])("returns uncat for %o", (ref) => {
    expect(parseChapter(ref as string | null | undefined)).toBe(
      UNCATEGORISED_KEY
    );
  });
});

describe("getChaptersForModule", () => {
  it.each(MODULE_IDS)("%s returns metas that sum to the module's pool", (id) => {
    const mod = getModuleDef(id);
    const chapters = getChaptersForModule(id);
    const expectedTotal = mod.questionCount * mod.quizIds.length;
    const sum = chapters.reduce((s, c) => s + c.questionCount, 0);
    expect(sum).toBe(expectedTotal);
  });

  it("pins Uncategorised last", () => {
    for (const id of MODULE_IDS) {
      const chapters = getChaptersForModule(id);
      const uncatIdx = chapters.findIndex((c) => c.key === UNCATEGORISED_KEY);
      if (uncatIdx !== -1) {
        expect(uncatIdx).toBe(chapters.length - 1);
      }
    }
  });

  it("sorts numeric chapters ascending", () => {
    const chapters = getChaptersForModule("m9").filter(
      (c) => c.key !== UNCATEGORISED_KEY
    );
    const nums = chapters.map((c) => Number(c.key));
    const sorted = [...nums].sort((a, b) => a - b);
    expect(nums).toEqual(sorted);
  });

  it("m9a has chapters 1-6 only, no Uncategorised", () => {
    const chapters = getChaptersForModule("m9a");
    expect(chapters.map((c) => c.key)).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("hi has only Uncategorised (references not yet backfilled)", () => {
    const chapters = getChaptersForModule("hi");
    expect(chapters).toHaveLength(1);
    expect(chapters[0].key).toBe(UNCATEGORISED_KEY);
    expect(chapters[0].questionCount).toBe(200);
  });

  it("m9 Uncategorised holds exactly the 5 known unlabelled questions", () => {
    const chapters = getChaptersForModule("m9");
    const uncat = chapters.find((c) => c.key === UNCATEGORISED_KEY);
    expect(uncat).toBeDefined();
    expect(uncat!.questionCount).toBe(5);
  });

  it("labels are human-readable", () => {
    const chapters = getChaptersForModule("m9");
    for (const c of chapters) {
      if (c.key === UNCATEGORISED_KEY) {
        expect(c.label).toBe("Uncategorised");
      } else {
        expect(c.label).toBe(`Chapter ${c.key}`);
      }
    }
  });
});

describe("getTutorialQuestions", () => {
  it("returns items with correct answers embedded", () => {
    const items = getTutorialQuestions("m9", "9");
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.correct_answer_letter).toMatch(/^[A-E]$/);
      expect(item.correct_answer).toBeTruthy();
      expect(item.question_key).toMatch(/^[a-z0-9-]+:\d+$/);
    }
  });

  it("keeps shared-passage groups contiguous", () => {
    const items = getTutorialQuestions("res5", "23");
    // RES5 Mock 2 Q117-122 all share a passage and all belong to C23.
    const passageItems = items.filter(
      (i) => i.shared_passage && i.quiz_id === "mock-2"
    );
    expect(passageItems.length).toBe(6);
    const nums = passageItems.map((i) => i.question_number);
    expect(nums).toEqual([117, 118, 119, 120, 121, 122]);
  });

  it("shared-passage group with mixed labelling inherits the labelled chapter", () => {
    // M9 SetA Q96 (C9), Q97 (backfilled C9), Q98 (backfilled C9) share a passage.
    const items = getTutorialQuestions("m9", "9");
    const setaPassageQs = items
      .filter((i) => i.quiz_id === "set-a" && i.shared_passage)
      .map((i) => i.question_number);
    expect(setaPassageQs).toEqual([96, 97, 98]);
  });

  it("returns empty array for unknown chapter", () => {
    expect(getTutorialQuestions("m9", "999")).toEqual([]);
  });

  it("returns empty array for unknown module + chapter combo", () => {
    // @ts-expect-error intentionally passing wrong module id to test robustness
    expect(getTutorialQuestions("fake", "1")).toEqual([]);
  });
});

describe("isValidChapterKey", () => {
  it("accepts known chapter keys", () => {
    expect(isValidChapterKey("m9", "9")).toBe(true);
    expect(isValidChapterKey("m9a", "1")).toBe(true);
    expect(isValidChapterKey("hi", UNCATEGORISED_KEY)).toBe(true);
  });

  it("rejects unknown chapter keys", () => {
    expect(isValidChapterKey("m9", "999")).toBe(false);
    expect(isValidChapterKey("m9a", "99")).toBe(false);
    expect(isValidChapterKey("m9", "")).toBe(false);
  });
});

describe("findTutorialItem", () => {
  it("finds a known question by key", () => {
    const item = findTutorialItem("m9", "set-a:96");
    expect(item).toBeTruthy();
    expect(item!.question_number).toBe(96);
    expect(item!.quiz_id).toBe("set-a");
  });

  it("returns null for unknown key", () => {
    expect(findTutorialItem("m9", "set-a:9999")).toBeNull();
    expect(findTutorialItem("m9", "bogus:1")).toBeNull();
  });
});
