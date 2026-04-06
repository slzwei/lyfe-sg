import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/whatsapp", () => ({
  sendInterviewScheduled: vi.fn(() => Promise.resolve(true)),
  sendInterviewUpdated: vi.fn(() => Promise.resolve(true)),
  sendInterviewCancelled: vi.fn(() => Promise.resolve(true)),
}));

const mockCookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({
    get: mockCookieGet,
    delete: vi.fn(),
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: mockGetUser,
      signOut: vi.fn(),
    },
  })),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
  getAdminClientAs: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}));

vi.mock("@/lib/email", () => ({
  sendCandidateAssignedEmail: vi.fn(() => Promise.resolve()),
  sendCandidateReassignedEmail: vi.fn(() => Promise.resolve()),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildChain(finalData: unknown = null, finalError: unknown = null) {
  const self: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ["select", "eq", "in", "is", "not", "or", "gt", "order", "limit", "range"];
  for (const m of methods) {
    self[m] = vi.fn(() => self);
  }
  self.single = vi.fn(() => Promise.resolve({ data: finalData, error: finalError }));
  self.insert = vi.fn(() => Promise.resolve({ data: finalData, error: finalError }));
  self.update = vi.fn(() => Object.assign(Promise.resolve({ data: finalData, error: finalError }), self));
  self.delete = vi.fn(() => Object.assign(Promise.resolve({ data: finalData, error: finalError }), self));
  return self;
}

function mockAuthUser(role: string) {
  mockGetUser.mockResolvedValue({
    data: {
      user: {
        id: `user-${role}`,
        app_metadata: { role },
        user_metadata: { full_name: `${role} User` },
        email: `${role}@test.com`,
      },
    },
  });
}

function mockNoAuth() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
  mockCookieGet.mockReturnValue(undefined);
}

// ─── Imports ────────────────────────────────────────────────────────────────

import {
  scheduleInterview,
  listAssignableManagers,
  reassignCandidate,
} from "../actions";

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── scheduleInterview ───────────────────────────────────────────────────────

describe("scheduleInterview", () => {
  it("requires authentication", async () => {
    mockNoAuth();
    const result = await scheduleInterview("cand-1", {
      managerId: "mgr-1",
      datetime: "2026-04-01T10:00:00Z",
      type: "zoom",
    });
    expect(result.success).toBe(false);
  });

  it("blocks agent role (not a staff role in lyfe-sg)", async () => {
    mockAuthUser("agent");
    const result = await scheduleInterview("cand-1", {
      managerId: "mgr-1",
      datetime: "2026-04-01T10:00:00Z",
      type: "zoom",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Not authenticated");
  });

  it("validates required fields", async () => {
    mockAuthUser("pa");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-pa", full_name: "PA User", email: "pa@test.com", role: "pa" });
      return buildChain();
    });
    const result = await scheduleInterview("cand-1", {
      managerId: "",
      datetime: "",
      type: "zoom",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("required");
  });

  it("successfully schedules an interview for PA", async () => {
    mockAuthUser("pa");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        const c = buildChain();
        c.single = vi.fn(() => Promise.resolve({
          data: { id: "user-pa", full_name: "PA User", email: "pa@test.com", role: "pa" },
          error: null,
        }));
        return c;
      }
      if (table === "interviews") {
        const c = buildChain();
        // Existing interviews query (for round number)
        (c.limit as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
        c.insert = vi.fn(() => Promise.resolve({ data: null, error: null }));
        return c;
      }
      if (table === "candidate_activities") return buildChain(null, null);
      return buildChain();
    });

    const result = await scheduleInterview("cand-1", {
      managerId: "mgr-1",
      datetime: "2026-04-01T10:00:00Z",
      type: "zoom",
      zoomLink: "https://zoom.us/j/123",
    });
    expect(result.success).toBe(true);
  });

  it("auto-increments round number", async () => {
    mockAuthUser("manager");
    let insertedRound: number | undefined;
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        const c = buildChain();
        c.single = vi.fn(() => Promise.resolve({
          data: { id: "user-manager", full_name: "Manager", email: "m@test.com", role: "manager" },
          error: null,
        }));
        return c;
      }
      if (table === "interviews") {
        const c = buildChain();
        (c.limit as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: [{ round_number: 2 }],
          error: null,
        });
        c.insert = vi.fn((data: Record<string, unknown>) => {
          insertedRound = data.round_number as number;
          return Promise.resolve({ data: null, error: null });
        });
        return c;
      }
      if (table === "candidate_activities") return buildChain(null, null);
      return buildChain();
    });

    const result = await scheduleInterview("cand-1", {
      managerId: "mgr-1",
      datetime: "2026-04-01T10:00:00Z",
      type: "in_person",
      location: "Office",
    });
    expect(result.success).toBe(true);
    expect(insertedRound).toBe(3);
  });

  it("returns error on DB failure", async () => {
    mockAuthUser("manager");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        const c = buildChain();
        c.single = vi.fn(() => Promise.resolve({
          data: { id: "user-manager", full_name: "Manager", email: "m@test.com", role: "manager" },
          error: null,
        }));
        return c;
      }
      if (table === "interviews") {
        const c = buildChain();
        (c.limit as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
        c.insert = vi.fn(() => Promise.resolve({ data: null, error: { message: "Insert failed" } }));
        return c;
      }
      return buildChain();
    });

    const result = await scheduleInterview("cand-1", {
      managerId: "mgr-1",
      datetime: "2026-04-01T10:00:00Z",
      type: "zoom",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Insert failed");
  });
});

// ── listAssignableManagers ──────────────────────────────────────────────────

describe("listAssignableManagers", () => {
  it("requires authentication", async () => {
    mockNoAuth();
    const result = await listAssignableManagers();
    expect(result.success).toBe(false);
  });

  it("returns PA's assigned managers only", async () => {
    mockAuthUser("pa");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        const c = buildChain();
        c.single = vi.fn(() => Promise.resolve({
          data: { id: "user-pa", full_name: "PA", email: "pa@test.com", role: "pa" },
          error: null,
        }));
        // For the managers lookup after getting assignments
        (c.order as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: [{ id: "mgr-1", full_name: "Manager One", role: "manager" }],
          error: null,
        });
        return c;
      }
      if (table === "pa_manager_assignments") {
        const c = buildChain();
        (c.eq as ReturnType<typeof vi.fn>).mockReturnValue(
          Promise.resolve({ data: [{ manager_id: "mgr-1" }], error: null })
        );
        return c;
      }
      return buildChain();
    });

    const result = await listAssignableManagers();
    expect(result.success).toBe(true);
    expect(result.managers).toHaveLength(1);
    expect(result.managers![0].full_name).toBe("Manager One");
  });

  it("returns empty list when PA has no assignments", async () => {
    mockAuthUser("pa");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-pa", full_name: "PA", email: "pa@test.com", role: "pa" });
      if (table === "pa_manager_assignments") {
        const c = buildChain();
        (c.eq as ReturnType<typeof vi.fn>).mockReturnValue(
          Promise.resolve({ data: [], error: null })
        );
        return c;
      }
      return buildChain();
    });

    const result = await listAssignableManagers();
    expect(result.success).toBe(true);
    expect(result.managers).toEqual([]);
  });

  it("returns all active managers for manager role", async () => {
    mockAuthUser("manager");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        const c = buildChain();
        c.single = vi.fn(() => Promise.resolve({
          data: { id: "user-manager", full_name: "Manager", email: "m@test.com", role: "manager" },
          error: null,
        }));
        (c.order as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: [
            { id: "mgr-1", full_name: "Manager One", role: "manager" },
            { id: "dir-1", full_name: "Director One", role: "director" },
          ],
          error: null,
        });
        return c;
      }
      return buildChain();
    });

    const result = await listAssignableManagers();
    expect(result.success).toBe(true);
    expect(result.managers).toHaveLength(2);
  });
});

// ── reassignCandidate ───────────────────────────────────────────────────────

describe("reassignCandidate", () => {
  it("requires manager role — blocks PA", async () => {
    mockAuthUser("pa");
    const result = await reassignCandidate("cand-1", "mgr-2");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Manager");
  });

  it("requires authentication", async () => {
    mockNoAuth();
    const result = await reassignCandidate("cand-1", "mgr-2");
    expect(result.success).toBe(false);
  });

  it("rejects inactive target manager", async () => {
    mockAuthUser("manager");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        const c = buildChain();
        c.single = vi.fn()
          // First call: getStaffUser
          .mockResolvedValueOnce({ data: { id: "user-manager", full_name: "Manager", email: "m@test.com", role: "manager" }, error: null })
          // Second call: target manager lookup
          .mockResolvedValueOnce({ data: { id: "mgr-2", full_name: "Mgr2", email: "m2@t.com", role: "manager", is_active: false }, error: null });
        return c;
      }
      return buildChain();
    });

    const result = await reassignCandidate("cand-1", "mgr-2");
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found or inactive");
  });

  it("rejects non-manager target user", async () => {
    mockAuthUser("admin");
    let userCallCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        userCallCount++;
        if (userCallCount === 1) return buildChain({ id: "user-admin", full_name: "Admin", email: "a@t.com", role: "admin" });
        return buildChain({ id: "agent-1", full_name: "Agent", email: "ag@t.com", role: "agent", is_active: true });
      }
      return buildChain();
    });

    const result = await reassignCandidate("cand-1", "agent-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("not a manager");
  });

  it("rejects reassignment to same manager", async () => {
    mockAuthUser("manager");
    let userCallCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        userCallCount++;
        if (userCallCount === 1) return buildChain({ id: "user-manager", full_name: "Manager", email: "m@t.com", role: "manager" });
        return buildChain({ id: "mgr-1", full_name: "Mgr1", email: "m1@t.com", role: "manager", is_active: true });
      }
      if (table === "candidates") return buildChain({ name: "Alice", assigned_manager_id: "mgr-1" });
      return buildChain();
    });

    const result = await reassignCandidate("cand-1", "mgr-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("already assigned");
  });

  it("successfully reassigns candidate", async () => {
    mockAuthUser("admin");
    let userCallCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        userCallCount++;
        if (userCallCount === 1) return buildChain({ id: "user-admin", full_name: "Admin", email: "a@t.com", role: "admin" });
        if (userCallCount === 2) return buildChain({ id: "mgr-2", full_name: "Manager Two", email: "m2@t.com", role: "manager", is_active: true });
        return buildChain({ full_name: "Manager One", email: "m1@t.com" });
      }
      if (table === "candidates") {
        const c = buildChain();
        c.single = vi.fn(() => Promise.resolve({
          data: { name: "Alice", assigned_manager_id: "mgr-1" },
          error: null,
        }));
        c.update = vi.fn(() => Object.assign(
          Promise.resolve({ data: null, error: null }),
          { eq: vi.fn(() => Promise.resolve({ data: null, error: null })) }
        ));
        return c;
      }
      if (table === "candidate_activities") return buildChain(null, null);
      if (table === "notifications") return buildChain(null, null);
      return buildChain();
    });

    const result = await reassignCandidate("cand-1", "mgr-2");
    expect(result.success).toBe(true);
  });

  it("returns error when candidate not found", async () => {
    mockAuthUser("manager");
    let userCallCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        userCallCount++;
        if (userCallCount === 1) return buildChain({ id: "user-manager", full_name: "Manager", email: "m@t.com", role: "manager" });
        return buildChain({ id: "mgr-2", full_name: "Mgr2", email: "m2@t.com", role: "manager", is_active: true });
      }
      if (table === "candidates") return buildChain(null, { message: "not found" });
      return buildChain();
    });

    const result = await reassignCandidate("cand-1", "mgr-2");
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });
});
