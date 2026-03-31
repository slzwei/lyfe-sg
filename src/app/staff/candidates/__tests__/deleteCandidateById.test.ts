import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: () => "127.0.0.1" })),
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: vi.fn(),
  })),
}));

// ── Supabase client mocks ──

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

const mockAdminDelete = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
const mockAdminUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
const mockAdminSelect = vi.fn();

function makeChain(data: unknown = null, error: unknown = null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data, error }),
        single: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error }),
    }),
  };
}

const candidateProfilesChain = makeChain({ user_id: "user-abc" });
const discResultsChain = makeChain();
const discResponsesChain = makeChain();
const invitationsChain = makeChain();
const candidatesChain = makeChain();

vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      const map: Record<string, unknown> = {
        users: makeChain({
          id: "user-123",
          full_name: "Admin User",
          email: "admin@test.com",
          role: "admin",
          is_active: true,
        }),
        candidate_profiles: candidateProfilesChain,
        disc_results: discResultsChain,
        disc_responses: discResponsesChain,
        invitations: invitationsChain,
        candidates: candidatesChain,
      };
      return map[table] || makeChain();
    }),
  })),
  getAdminClientAs: vi.fn(() => ({
    from: vi.fn((table: string) => {
      const map: Record<string, unknown> = {
        candidate_profiles: candidateProfilesChain,
        disc_results: discResultsChain,
        disc_responses: discResponsesChain,
        invitations: invitationsChain,
        candidates: candidatesChain,
      };
      return map[table] || makeChain();
    }),
  })),
}));

// Mock email (not under test)
vi.mock("@/lib/email", () => ({
  sendCandidateAssignedEmail: vi.fn(),
  sendCandidateReassignedEmail: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Simulate an authenticated user with a specific role in app_metadata. */
function mockAuthUser(role: string) {
  mockGetUser.mockResolvedValue({
    data: {
      user: {
        id: "user-123",
        app_metadata: { role },
        user_metadata: { full_name: "Test User" },
        email: "test@example.com",
      },
    },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("deleteCandidateById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires admin role — rejects unauthenticated users", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { deleteCandidateById } = await import("../actions");
    const result = await deleteCandidateById("cand-1");

    expect(result).toEqual({
      success: false,
      error: "Not authorized. Admin role required.",
    });
  });

  it("rejects pa role (below admin)", async () => {
    mockAuthUser("pa");

    const { deleteCandidateById } = await import("../actions");
    const result = await deleteCandidateById("cand-1");

    expect(result).toEqual({
      success: false,
      error: "Not authorized. Admin role required.",
    });
  });

  it("rejects manager role (below admin)", async () => {
    mockAuthUser("manager");

    const { deleteCandidateById } = await import("../actions");
    const result = await deleteCandidateById("cand-1");

    expect(result).toEqual({
      success: false,
      error: "Not authorized. Admin role required.",
    });
  });

  it("rejects director role (below admin)", async () => {
    mockAuthUser("director");

    const { deleteCandidateById } = await import("../actions");
    const result = await deleteCandidateById("cand-1");

    expect(result).toEqual({
      success: false,
      error: "Not authorized. Admin role required.",
    });
  });

  it("allows admin role to proceed", async () => {
    mockAuthUser("admin");

    const { deleteCandidateById } = await import("../actions");
    const result = await deleteCandidateById("cand-1");

    // Admin should be allowed — the mock chain resolves without error
    expect(result).toEqual({ success: true });
  });

  it("rejects candidate role (not staff at all)", async () => {
    mockAuthUser("candidate");

    const { deleteCandidateById } = await import("../actions");
    const result = await deleteCandidateById("cand-1");

    expect(result).toEqual({
      success: false,
      error: "Not authorized. Admin role required.",
    });
  });
});
