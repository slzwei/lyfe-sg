import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: () => "127.0.0.1" })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("REDIRECT");
  }),
}));

const mockGetUser = vi.fn();
const mockSignInWithOtp = vi.fn();
const mockVerifyOtp = vi.fn();
const mockSignOut = vi.fn();
const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
        signInWithOtp: mockSignInWithOtp,
        verifyOtp: mockVerifyOtp,
        signOut: mockSignOut,
      },
      from: mockFrom,
    })
  ),
}));

const mockCheckRateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimitAsync: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function mockAuthUser(id = "user-abc") {
  mockGetUser.mockResolvedValue({
    data: { user: { id, phone: "+6591234567" } },
  });
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
  const methods = [
    "select",
    "eq",
    "in",
    "order",
    "single",
    "maybeSingle",
    "insert",
    "update",
    "delete",
  ];
  for (const m of methods) {
    chain[m] = vi.fn(() => Object.assign(thenable, chain));
  }
  chain.single = vi.fn(() => Promise.resolve(result));
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return Object.assign(thenable, chain);
}

// ─── Import ─────────────────────────────────────────────────────────────────

import {
  emockSendOtp,
  emockVerifyOtp,
  emockSignOut,
  getEmockUser,
  getInProgressAttempt,
  startQuiz,
  saveQuizProgress,
  clearQuizProgress,
  gradeQuiz,
  getAttempts,
  getInProgressQuizIds,
} from "../actions";

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue({ allowed: true });
});

// ════════════════════════════════════════════════════════════════
// Auth
// ════════════════════════════════════════════════════════════════

describe("emockSendOtp", () => {
  it("rejects invalid phone format", async () => {
    const result = await emockSendOtp("+6512"); // too short
    expect(result).toEqual({
      success: false,
      error: "Please enter a valid SG mobile number.",
    });
    expect(mockSignInWithOtp).not.toHaveBeenCalled();
  });

  it("rejects non-SG numbers", async () => {
    const result = await emockSendOtp("+4412345678");
    expect(result).toEqual({
      success: false,
      error: "Please enter a valid SG mobile number.",
    });
  });

  it("enforces rate limiting", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false });
    const result = await emockSendOtp("+6591234567");
    expect(result).toEqual({
      success: false,
      error: "Too many attempts. Please wait a minute.",
    });
    expect(mockSignInWithOtp).not.toHaveBeenCalled();
  });

  it("sends OTP for valid SG number", async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null });
    const result = await emockSendOtp("+6591234567");
    expect(result).toEqual({ success: true });
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      phone: "+6591234567",
    });
  });

  it("strips spaces from phone", async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null });
    await emockSendOtp("+65 9123 4567");
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      phone: "+6591234567",
    });
  });

  it("returns friendly message for hook error", async () => {
    mockSignInWithOtp.mockResolvedValue({
      error: { message: "Invalid payload sent to hook" },
    });
    const result = await emockSendOtp("+6591234567");
    expect(result.success).toBe(false);
    expect(result.error).toContain("not registered");
  });

  it("passes through other Supabase errors", async () => {
    mockSignInWithOtp.mockResolvedValue({
      error: { message: "Rate limit exceeded" },
    });
    const result = await emockSendOtp("+6591234567");
    expect(result).toEqual({
      success: false,
      error: "Rate limit exceeded",
    });
  });
});

describe("emockVerifyOtp", () => {
  it("rejects non-6-digit tokens", async () => {
    const result = await emockVerifyOtp("+6591234567", "123");
    expect(result.success).toBe(false);
    expect(result.error).toContain("6-digit");
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it("rejects non-numeric tokens", async () => {
    const result = await emockVerifyOtp("+6591234567", "abcdef");
    expect(result.success).toBe(false);
  });

  it("enforces rate limiting", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false });
    const result = await emockVerifyOtp("+6591234567", "123456");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Too many attempts");
  });

  it("verifies valid OTP successfully", async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { user: { id: "user-abc" } },
      error: null,
    });
    const result = await emockVerifyOtp("+6591234567", "123456");
    expect(result).toEqual({ success: true });
    expect(mockVerifyOtp).toHaveBeenCalledWith({
      phone: "+6591234567",
      token: "123456",
      type: "sms",
    });
  });

  it("returns error for invalid OTP", async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { user: null },
      error: { message: "Token expired" },
    });
    const result = await emockVerifyOtp("+6591234567", "999999");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid or expired");
  });

  it("handles null user after verification", async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const result = await emockVerifyOtp("+6591234567", "123456");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Verification failed.");
  });
});

describe("emockSignOut", () => {
  it("signs out and redirects to login", async () => {
    await expect(emockSignOut()).rejects.toThrow("REDIRECT");
    expect(mockSignOut).toHaveBeenCalled();
  });
});

describe("getEmockUser", () => {
  it("returns user when authenticated", async () => {
    mockAuthUser("user-abc");
    const user = await getEmockUser();
    expect(user).toEqual({ id: "user-abc", phone: "+6591234567" });
  });

  it("returns null when not authenticated", async () => {
    mockNoAuth();
    const user = await getEmockUser();
    expect(user).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════
// In-progress attempts
// ════════════════════════════════════════════════════════════════

describe("getInProgressAttempt", () => {
  it("returns null when not authenticated", async () => {
    mockNoAuth();
    const result = await getInProgressAttempt("m9", "set-a");
    expect(result).toBeNull();
  });

  it("returns null when no in-progress attempt exists", async () => {
    mockAuthUser();
    mockFrom.mockReturnValue(chainMock(null));
    const result = await getInProgressAttempt("m9", "set-a");
    expect(result).toBeNull();
  });

  it("returns attempt data when in-progress exists", async () => {
    mockAuthUser();
    const attemptData = {
      id: "attempt-1",
      answers: { "1": "A", "2": "B" },
      started_at: "2026-04-16T12:00:00Z",
    };
    mockFrom.mockReturnValue(chainMock(attemptData));
    const result = await getInProgressAttempt("m9", "set-a");
    expect(result).toEqual(attemptData);
  });
});

describe("startQuiz", () => {
  it("throws when not authenticated", async () => {
    mockNoAuth();
    await expect(startQuiz("m9", "set-a")).rejects.toThrow(
      "Not authenticated"
    );
  });

  it("returns existing in-progress attempt if one exists", async () => {
    mockAuthUser();
    const existing = {
      id: "attempt-1",
      answers: { "1": "C" },
      started_at: "2026-04-16T12:00:00Z",
    };
    // First call to from() is for getInProgressAttempt, second for insert
    mockFrom.mockReturnValue(chainMock(existing));
    const result = await startQuiz("m9", "set-a");
    expect(result).toEqual(existing);
  });

  it("creates new attempt when none in progress", async () => {
    mockAuthUser();
    const newAttempt = {
      id: "attempt-new",
      answers: {},
      started_at: "2026-04-16T13:00:00Z",
    };
    // First from() for getInProgressAttempt returns null, second for insert
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount <= 1) return chainMock(null); // getInProgressAttempt
      return chainMock(newAttempt); // insert...select...single
    });
    const result = await startQuiz("m9", "set-a");
    expect(result).toEqual(newAttempt);
  });
});

describe("saveQuizProgress", () => {
  it("updates answers for the attempt", async () => {
    const chain = chainMock(null);
    mockFrom.mockReturnValue(chain);
    await saveQuizProgress("attempt-1", { "1": "A", "2": "B" });
    expect(mockFrom).toHaveBeenCalledWith("emock_attempts");
    expect(chain.update).toHaveBeenCalledWith({
      answers: { "1": "A", "2": "B" },
    });
  });
});

describe("clearQuizProgress", () => {
  it("does nothing when not authenticated", async () => {
    mockNoAuth();
    await clearQuizProgress("m9", "set-a");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("deletes in-progress attempt for the user", async () => {
    mockAuthUser();
    const chain = chainMock(null);
    mockFrom.mockReturnValue(chain);
    await clearQuizProgress("m9", "set-a");
    expect(mockFrom).toHaveBeenCalledWith("emock_attempts");
    expect(chain.delete).toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════
// Quiz grading + persistence
// ════════════════════════════════════════════════════════════════

describe("gradeQuiz", () => {
  it("throws for invalid module ID", async () => {
    await expect(
      gradeQuiz("attempt-1", "invalid", "set-a", {}, 60)
    ).rejects.toThrow("Invalid module or quiz ID");
  });

  it("throws for invalid quiz ID", async () => {
    await expect(
      gradeQuiz("attempt-1", "m9", "invalid-quiz", {}, 60)
    ).rejects.toThrow("Invalid module or quiz ID");
  });

  it("grades quiz and updates attempt to completed", async () => {
    const chain = chainMock(null);
    mockFrom.mockReturnValue(chain);

    const answers: Record<string, string> = {};
    for (let i = 1; i <= 100; i++) answers[String(i)] = "A";

    const result = await gradeQuiz("attempt-1", "m9", "set-a", answers, 3600);

    expect(result.total).toBe(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(typeof result.passed).toBe("boolean");
    expect(result.time_taken_seconds).toBe(3600);
    expect(result.questions).toHaveLength(100);

    // Verify attempt was updated
    expect(mockFrom).toHaveBeenCalledWith("emock_attempts");
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
        score: result.score,
        total: 100,
        passed: result.passed,
        time_taken_seconds: 3600,
      })
    );
  });

  it("returns question-level results", async () => {
    mockFrom.mockReturnValue(chainMock(null));
    const result = await gradeQuiz("attempt-1", "m9", "set-a", { "1": "A" }, 60);
    const q1 = result.questions[0];
    expect(q1.question_number).toBe(1);
    expect(q1.selected_letter).toBe("A");
    expect(typeof q1.correct_answer_letter).toBe("string");
    expect(typeof q1.is_correct).toBe("boolean");
  });

  it("handles RES5 two-part grading", async () => {
    mockFrom.mockReturnValue(chainMock(null));
    const answers: Record<string, string> = {};
    for (let i = 1; i <= 150; i++) answers[String(i)] = "A";

    const result = await gradeQuiz(
      "attempt-1",
      "res5",
      "mock-1",
      answers,
      7200
    );
    expect(result.total).toBe(150);
    expect(result.parts).toBeDefined();
    expect(result.parts).toHaveLength(2);
    expect(result.parts![0].name).toBe("Part I");
    expect(result.parts![1].name).toBe("Part II");
  });

  it("marks unanswered questions correctly", async () => {
    mockFrom.mockReturnValue(chainMock(null));
    const result = await gradeQuiz("attempt-1", "m9", "set-a", {}, 60);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    for (const q of result.questions) {
      expect(q.selected_letter).toBeNull();
      expect(q.is_correct).toBe(false);
    }
  });
});

// ════════════════════════════════════════════════════════════════
// Attempt history
// ════════════════════════════════════════════════════════════════

describe("getAttempts", () => {
  it("returns empty array when not authenticated", async () => {
    mockNoAuth();
    const result = await getAttempts("m9");
    expect(result).toEqual([]);
  });

  it("returns completed attempts", async () => {
    mockAuthUser();
    const attempts = [
      {
        id: "a1",
        quiz_id: "set-a",
        score: 80,
        total: 100,
        passed: true,
        time_taken_seconds: 3600,
        completed_at: "2026-04-16T14:00:00Z",
      },
    ];
    mockFrom.mockReturnValue(chainMock(attempts));
    const result = await getAttempts("m9");
    expect(result).toEqual(attempts);
  });

  it("returns empty array when no attempts exist", async () => {
    mockAuthUser();
    mockFrom.mockReturnValue(chainMock(null));
    const result = await getAttempts("m9");
    expect(result).toEqual([]);
  });
});

describe("getInProgressQuizIds", () => {
  it("returns empty array when not authenticated", async () => {
    mockNoAuth();
    const result = await getInProgressQuizIds("m9");
    expect(result).toEqual([]);
  });

  it("returns quiz IDs with in-progress attempts", async () => {
    mockAuthUser();
    mockFrom.mockReturnValue(
      chainMock([{ quiz_id: "set-a" }, { quiz_id: "mock-1" }])
    );
    const result = await getInProgressQuizIds("m9");
    expect(result).toEqual(["set-a", "mock-1"]);
  });

  it("returns empty array when no in-progress attempts", async () => {
    mockAuthUser();
    mockFrom.mockReturnValue(chainMock(null));
    const result = await getInProgressQuizIds("m9");
    expect(result).toEqual([]);
  });
});
