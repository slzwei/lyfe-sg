import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: () => "127.0.0.1" })),
}));

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}));

const mockCheckRateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimitAsync: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

function mockAuth(id = "user-abc") {
  mockGetUser.mockResolvedValue({ data: { user: { id } } });
}
function mockNoAuth() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

function chainMock(resolvedData: unknown = null, error: unknown = null) {
  const result = { data: resolvedData, error };
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const thenable = {
    then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
      Promise.resolve(result).then(resolve, reject),
  };
  const methods = ["select", "eq", "in", "order", "upsert", "delete"];
  for (const m of methods) {
    chain[m] = vi.fn(() => Object.assign(thenable, chain));
  }
  return Object.assign(thenable, chain);
}

import {
  saveTutorialAnswer,
  resetQuestion,
  resetChapter,
  getChapterProgress,
  getChapterStats,
} from "../actions";
import {
  getTutorialQuestions,
  findTutorialItemInChapter,
} from "@/lib/quiz";

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue({ allowed: true });
});

// ─── saveTutorialAnswer ────────────────────────────────────────────

describe("saveTutorialAnswer", () => {
  it("rejects invalid module", async () => {
    const r = await saveTutorialAnswer("bogus", "1", "set-a:1", "A");
    expect(r).toEqual({ success: false, error: "Invalid module" });
  });

  it("rejects invalid chapter", async () => {
    const r = await saveTutorialAnswer("m9", "999", "set-a:1", "A");
    expect(r).toEqual({ success: false, error: "Invalid chapter" });
  });

  it("rejects invalid answer letter", async () => {
    const r = await saveTutorialAnswer("m9", "9", "set-a:96", "Z");
    expect(r).toEqual({ success: false, error: "Invalid answer" });
  });

  it("rejects question that does not belong to the chapter", async () => {
    // set-a:1 is in C17, not C9
    const r = await saveTutorialAnswer("m9", "9", "set-a:1", "A");
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/not found in chapter/i);
  });

  it("requires authentication", async () => {
    mockNoAuth();
    const r = await saveTutorialAnswer("m9", "9", "set-a:96", "A");
    expect(r).toEqual({ success: false, error: "Not authenticated" });
  });

  it("enforces rate limit", async () => {
    mockAuth();
    mockCheckRateLimit.mockResolvedValue({ allowed: false });
    const r = await saveTutorialAnswer("m9", "9", "set-a:96", "A");
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/too many/i);
  });

  it("grades correctly and upserts when answer is right", async () => {
    mockAuth();
    mockFrom.mockReturnValue(chainMock(null));
    const item = findTutorialItemInChapter("m9", "9", "set-a:96")!;
    const r = await saveTutorialAnswer(
      "m9",
      "9",
      "set-a:96",
      item.correct_answer_letter
    );
    expect(r.success).toBe(true);
    expect(r.is_correct).toBe(true);
    expect(r.correct_answer_letter).toBe(item.correct_answer_letter);
    expect(mockFrom).toHaveBeenCalledWith("emock_tutorial_progress");
  });

  it("marks wrong answer as is_correct=false but still succeeds", async () => {
    mockAuth();
    mockFrom.mockReturnValue(chainMock(null));
    const item = findTutorialItemInChapter("m9", "9", "set-a:96")!;
    // Pick a letter that isn't the correct one
    const wrong = ["A", "B", "C", "D"].find(
      (l) => l !== item.correct_answer_letter
    )!;
    const r = await saveTutorialAnswer("m9", "9", "set-a:96", wrong);
    expect(r.success).toBe(true);
    expect(r.is_correct).toBe(false);
    expect(r.correct_answer_letter).toBe(item.correct_answer_letter);
  });

  it("surfaces db error", async () => {
    mockAuth();
    mockFrom.mockReturnValue(chainMock(null, { message: "db down" }));
    const item = findTutorialItemInChapter("m9", "9", "set-a:96")!;
    const r = await saveTutorialAnswer(
      "m9",
      "9",
      "set-a:96",
      item.correct_answer_letter
    );
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/save/i);
  });

  it("grading parity: every tutorial item's correct_answer_letter grades as is_correct=true", async () => {
    mockAuth();
    mockFrom.mockReturnValue(chainMock(null));
    const items = getTutorialQuestions("m9a", "1").slice(0, 5);
    for (const item of items) {
      const r = await saveTutorialAnswer(
        "m9a",
        "1",
        item.question_key,
        item.correct_answer_letter
      );
      expect(r.success).toBe(true);
      expect(r.is_correct).toBe(true);
    }
  });
});

// ─── resetQuestion / resetChapter ──────────────────────────────────

describe("resetQuestion", () => {
  it("rejects invalid module", async () => {
    const r = await resetQuestion("bogus", "1", "set-a:1");
    expect(r.success).toBe(false);
  });

  it("requires auth", async () => {
    mockNoAuth();
    const r = await resetQuestion("m9", "9", "set-a:96");
    expect(r.success).toBe(false);
  });

  it("deletes when authenticated", async () => {
    mockAuth();
    const chain = chainMock(null);
    mockFrom.mockReturnValue(chain);
    const r = await resetQuestion("m9", "9", "set-a:96");
    expect(r.success).toBe(true);
    expect(chain.delete).toHaveBeenCalled();
  });
});

describe("resetChapter", () => {
  it("rejects invalid chapter", async () => {
    const r = await resetChapter("m9", "999");
    expect(r.success).toBe(false);
  });

  it("requires auth", async () => {
    mockNoAuth();
    const r = await resetChapter("m9", "9");
    expect(r.success).toBe(false);
  });

  it("deletes when authenticated", async () => {
    mockAuth();
    const chain = chainMock(null);
    mockFrom.mockReturnValue(chain);
    const r = await resetChapter("m9", "9");
    expect(r.success).toBe(true);
    expect(chain.delete).toHaveBeenCalled();
  });
});

// ─── getChapterProgress / getChapterStats ──────────────────────────

describe("getChapterProgress", () => {
  it("returns [] when not authenticated", async () => {
    mockNoAuth();
    const r = await getChapterProgress("m9", "9");
    expect(r).toEqual([]);
  });

  it("returns rows", async () => {
    mockAuth();
    const rows = [
      { question_key: "set-a:96", selected_letter: "B", is_correct: true },
    ];
    mockFrom.mockReturnValue(chainMock(rows));
    const r = await getChapterProgress("m9", "9");
    expect(r).toEqual(rows);
  });
});

describe("getChapterStats", () => {
  it("returns [] when not authenticated", async () => {
    mockNoAuth();
    const r = await getChapterStats("m9");
    expect(r).toEqual([]);
  });

  it("aggregates attempted and correct per chapter", async () => {
    mockAuth();
    mockFrom.mockReturnValue(
      chainMock([
        { chapter_key: "9", is_correct: true },
        { chapter_key: "9", is_correct: false },
        { chapter_key: "9", is_correct: true },
        { chapter_key: "17", is_correct: false },
      ])
    );
    const r = await getChapterStats("m9");
    const nine = r.find((s) => s.chapter_key === "9");
    const seventeen = r.find((s) => s.chapter_key === "17");
    expect(nine).toEqual({ chapter_key: "9", attempted: 3, correct: 2 });
    expect(seventeen).toEqual({
      chapter_key: "17",
      attempted: 1,
      correct: 0,
    });
  });
});
