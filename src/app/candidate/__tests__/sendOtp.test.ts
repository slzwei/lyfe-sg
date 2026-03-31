import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: (name: string) => (name === "x-forwarded-for" ? "192.168.1.1" : null),
  })),
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: vi.fn(),
  })),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Real rate-limit module (in-memory, no external deps)
// We do NOT mock it — the point of this test is to verify it works.

const mockSignInWithOtp = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithOtp: mockSignInWithOtp,
    },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: vi.fn(() => ({
    from: () => ({ select: () => ({ eq: () => ({ single: () => ({}) }) }) }),
  })),
}));

vi.mock("@/lib/email", () => ({
  sendCandidateAssignedEmail: vi.fn(),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("sendOtp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset rate-limit store between tests by re-importing
    vi.resetModules();
  });

  it("rejects non-SG phone numbers", async () => {
    const { sendOtp } = await import("../actions");

    // US number
    expect(await sendOtp("+12025551234")).toEqual({
      success: false,
      error: "Please enter a valid SG mobile number.",
    });

    // Too short
    expect(await sendOtp("+651234567")).toEqual({
      success: false,
      error: "Please enter a valid SG mobile number.",
    });

    // Too long
    expect(await sendOtp("+65123456789")).toEqual({
      success: false,
      error: "Please enter a valid SG mobile number.",
    });

    // No country code
    expect(await sendOtp("91234567")).toEqual({
      success: false,
      error: "Please enter a valid SG mobile number.",
    });

    // OTP should never be called for invalid numbers
    expect(mockSignInWithOtp).not.toHaveBeenCalled();
  });

  it("accepts valid SG phone numbers (with optional spaces)", async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null });

    const { sendOtp } = await import("../actions");
    const result = await sendOtp("+65 9123 4567");

    expect(result).toEqual({ success: true });
    expect(mockSignInWithOtp).toHaveBeenCalledWith({ phone: "+6591234567" });
  });

  it("returns Supabase auth errors", async () => {
    mockSignInWithOtp.mockResolvedValue({
      error: { message: "Phone provider disabled" },
    });

    const { sendOtp } = await import("../actions");
    const result = await sendOtp("+6591234567");

    expect(result).toEqual({ success: false, error: "Phone provider disabled" });
  });

  it("rate-limits after 5 rapid calls from the same IP", async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null });

    // Each iteration gets a fresh module with a fresh rate-limit store,
    // so we need to import once and call 6 times within the same module scope.
    const { sendOtp } = await import("../actions");

    const results = [];
    for (let i = 0; i < 6; i++) {
      results.push(await sendOtp("+6591234567"));
    }

    // First 5 should succeed
    for (let i = 0; i < 5; i++) {
      expect(results[i]).toEqual({ success: true });
    }

    // 6th should be rate-limited
    expect(results[5]).toEqual({
      success: false,
      error: "Too many attempts. Please wait a minute.",
    });

    // OTP should only have been called 5 times (not on the 6th)
    expect(mockSignInWithOtp).toHaveBeenCalledTimes(5);
  });
});
