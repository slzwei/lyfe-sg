import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/whatsapp", () => ({
  sendInterviewScheduled: vi.fn(() => Promise.resolve(true)),
  sendInterviewUpdated: vi.fn(() => Promise.resolve(true)),
  sendInterviewCancelled: vi.fn(() => Promise.resolve(true)),
}));

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
  const result = { data, error };
  const eqTerminal = {
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    select: vi.fn().mockResolvedValue(result),
  };
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        ...eqTerminal,
        head: true,
      }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        ...eqTerminal,
        then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        ...eqTerminal,
        then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
      }),
    }),
  };
}

const candidateProfilesChain = makeChain({ user_id: "user-abc", candidate_id: "cand-1" });
const discResultsChain = makeChain();
const discResponsesChain = makeChain();
const invitationsChain = makeChain();
const candidatesChain = makeChain([{ id: "cand-1" }]);

const mockAdminAuth = {
  admin: { deleteUser: vi.fn().mockResolvedValue({}) },
};

function makeAdminClient(includeUsers = true) {
  return {
    from: vi.fn((table: string) => {
      const map: Record<string, unknown> = {
        ...(includeUsers
          ? {
              users: makeChain({
                id: "user-123",
                full_name: "Admin User",
                email: "admin@test.com",
                role: "admin",
                is_active: true,
              }),
            }
          : {}),
        candidate_profiles: candidateProfilesChain,
        disc_results: discResultsChain,
        disc_responses: discResponsesChain,
        invitations: invitationsChain,
        candidates: candidatesChain,
      };
      return map[table] || makeChain();
    }),
    auth: mockAdminAuth,
    rpc: vi.fn().mockResolvedValue({ error: null }),
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: vi.fn(() => makeAdminClient(true)),
  getAdminClientAs: vi.fn(() => makeAdminClient(false)),
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

  it("rejects unauthenticated users", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { deleteCandidateById } = await import("../actions");
    const result = await deleteCandidateById("cand-1");

    expect(result).toEqual({
      success: false,
      error: "Not authorized.",
    });
  });

  it("allows pa role (minimum required)", async () => {
    mockAuthUser("pa");

    const { deleteCandidateById } = await import("../actions");
    const result = await deleteCandidateById("cand-1");

    expect(result).toEqual({ success: true });
  });

  it("allows manager role", async () => {
    mockAuthUser("manager");

    const { deleteCandidateById } = await import("../actions");
    const result = await deleteCandidateById("cand-1");

    expect(result).toEqual({ success: true });
  });

  it("allows director role", async () => {
    mockAuthUser("director");

    const { deleteCandidateById } = await import("../actions");
    const result = await deleteCandidateById("cand-1");

    expect(result).toEqual({ success: true });
  });

  it("allows admin role", async () => {
    mockAuthUser("admin");

    const { deleteCandidateById } = await import("../actions");
    const result = await deleteCandidateById("cand-1");

    expect(result).toEqual({ success: true });
  });

  it("rejects candidate role (not staff)", async () => {
    mockAuthUser("candidate");

    const { deleteCandidateById } = await import("../actions");
    const result = await deleteCandidateById("cand-1");

    expect(result).toEqual({
      success: false,
      error: "Not authorized.",
    });
  });
});
