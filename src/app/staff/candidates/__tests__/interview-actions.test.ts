import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────────────

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
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

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

/** Build a chainable Supabase query mock */
function buildChain(finalData: unknown = null, finalError: unknown = null) {
  const self: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ["select", "eq", "in", "is", "not", "or", "gt", "order", "limit", "range"];
  for (const m of methods) {
    self[m] = vi.fn(() => self);
  }
  self.single = vi.fn(() => Promise.resolve({ data: finalData, error: finalError }));
  // insert/update/delete resolve directly
  self.insert = vi.fn(() => Promise.resolve({ data: finalData, error: finalError }));
  self.update = vi.fn(() => Object.assign(Promise.resolve({ data: finalData, error: finalError }), self));
  self.delete = vi.fn(() => Object.assign(Promise.resolve({ data: finalData, error: finalError }), self));
  return self;
}

// ─── Imports ────────────────────────────────────────────────────────────────

import {
  getCandidate,
  addActivity,
  addDocument,
  updateCandidate,
  deleteDocument,
  searchCandidates,
  getInterviews,
  updateInterviewFeedback,
} from "../actions";

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getInterviews", () => {
  it("returns empty array when no interviews exist", async () => {
    mockAuthUser("pa");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-pa", full_name: "PA", email: "pa@test.com", role: "pa" });
      if (table === "interviews") {
        const c = buildChain();
        (c.order as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
        return c;
      }
      return buildChain();
    });

    const result = await getInterviews("cand-1");
    expect(result.success).toBe(true);
    expect(result.interviews).toEqual([]);
  });

  it("returns interviews enriched with user names", async () => {
    mockAuthUser("manager");
    const mockInterviews = [
      {
        id: "int-1",
        candidate_id: "cand-1",
        manager_id: "mgr-1",
        scheduled_by_id: "pa-1",
        round_number: 1,
        type: "zoom",
        datetime: "2026-03-20T10:00:00Z",
        location: null,
        zoom_link: "https://zoom.us/j/123",
        status: "completed",
        notes: "Good candidate",
        recommendation: "second_interview",
        created_at: "2026-03-19T10:00:00Z",
        updated_at: "2026-03-20T11:00:00Z",
      },
    ];
    const mockUsers = [
      { id: "mgr-1", full_name: "Manager One" },
      { id: "pa-1", full_name: "PA One" },
    ];

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        const c = buildChain();
        // For getStaffUser single call
        c.single = vi.fn(() => Promise.resolve({
          data: { id: "user-manager", full_name: "Manager", email: "mgr@test.com", role: "manager" },
          error: null,
        }));
        // For batch user lookup (in clause)
        (c.in as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockUsers, error: null });
        return c;
      }
      if (table === "interviews") {
        const c = buildChain();
        (c.order as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockInterviews, error: null });
        return c;
      }
      return buildChain();
    });

    const result = await getInterviews("cand-1");
    expect(result.success).toBe(true);
    expect(result.interviews).toHaveLength(1);
    expect(result.interviews![0].manager_name).toBe("Manager One");
    expect(result.interviews![0].scheduled_by_name).toBe("PA One");
    expect(result.interviews![0].recommendation).toBe("second_interview");
  });

  it("requires authentication", async () => {
    mockNoAuth();
    const result = await getInterviews("cand-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Not authenticated");
  });

  it("returns error when DB query fails", async () => {
    mockAuthUser("manager");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-manager", full_name: "Manager", email: "m@t.com", role: "manager" });
      if (table === "interviews") {
        const c = buildChain();
        (c.order as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: { message: "DB error" } });
        return c;
      }
      return buildChain();
    });
    const result = await getInterviews("cand-1");
    expect(result.success).toBe(false);
    expect(result.error).toBe("DB error");
  });
});

describe("updateInterviewFeedback", () => {
  it("requires manager role — blocks PA", async () => {
    mockAuthUser("pa");
    const result = await updateInterviewFeedback("int-1", { notes: "test" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Manager");
  });

  it("allows manager to update feedback", async () => {
    mockAuthUser("manager");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-manager", full_name: "Manager", email: "m@t.com", role: "manager" });
      if (table === "interviews") return buildChain(null, null);
      return buildChain();
    });

    const result = await updateInterviewFeedback("int-1", {
      notes: "Great interview",
      recommendation: "second_interview",
    });
    expect(result.success).toBe(true);
  });

  it("allows clearing recommendation with null", async () => {
    mockAuthUser("director");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-director", full_name: "Director", email: "d@t.com", role: "director" });
      if (table === "interviews") return buildChain(null, null);
      return buildChain();
    });

    const result = await updateInterviewFeedback("int-1", {
      notes: "Reconsidering",
      recommendation: null,
    });
    expect(result.success).toBe(true);
  });

  it("returns error when DB update fails", async () => {
    mockAuthUser("admin");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-admin", full_name: "Admin", email: "a@t.com", role: "admin" });
      if (table === "interviews") {
        const c = buildChain();
        c.update = vi.fn(() => Object.assign(
          Promise.resolve({ data: null, error: { message: "Update failed" } }),
          { eq: vi.fn(() => Promise.resolve({ data: null, error: { message: "Update failed" } })) }
        ));
        return c;
      }
      return buildChain();
    });

    const result = await updateInterviewFeedback("int-1", { notes: "test" });
    expect(result.success).toBe(false);
  });
});

describe("deleteDocument", () => {
  it("requires manager role — blocks PA", async () => {
    mockAuthUser("pa");
    const result = await deleteDocument("doc-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Manager");
  });

  it("succeeds for manager", async () => {
    mockAuthUser("manager");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-manager", full_name: "Manager", email: "m@t.com", role: "manager" });
      if (table === "candidate_documents") return buildChain(null, null);
      return buildChain();
    });
    const result = await deleteDocument("doc-1");
    expect(result.success).toBe(true);
  });
});

describe("getCandidate", () => {
  it("requires authentication", async () => {
    mockNoAuth();
    const result = await getCandidate("cand-1");
    expect(result.success).toBe(false);
  });

  it("returns staffRole in response", async () => {
    mockAuthUser("pa");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-pa", full_name: "PA", email: "pa@t.com", role: "pa" });
      if (table === "candidates") return buildChain({ id: "cand-1", name: "John", email: "j@t.com", phone: "+6591234567", status: "applied", notes: null, job_id: null, current_stage_id: null, stage_entered_at: null, resume_url: null, created_at: "2026-01-01", updated_at: "2026-01-01" });
      if (table === "candidate_activities") {
        const c = buildChain();
        (c.limit as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
        return c;
      }
      if (table === "candidate_documents") {
        const c = buildChain();
        (c.order as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
        return c;
      }
      if (table === "candidate_profiles") return buildChain(null);
      return buildChain();
    });

    const result = await getCandidate("cand-1");
    expect(result.success).toBe(true);
    expect(result.staffRole).toBe("pa");
  });

  it("returns not found for missing candidate", async () => {
    mockAuthUser("manager");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-manager", full_name: "Manager", email: "m@t.com", role: "manager" });
      if (table === "candidates") return buildChain(null, { message: "not found" });
      return buildChain();
    });

    const result = await getCandidate("nonexistent");
    expect(result.success).toBe(false);
  });
});

describe("getCandidate (enrichment branches)", () => {
  it("enriches with DISC type when profile has user_id", async () => {
    mockAuthUser("manager");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        const c = buildChain();
        c.single = vi.fn(() => Promise.resolve({ data: { id: "user-manager", full_name: "Manager", email: "m@t.com", role: "manager" }, error: null }));
        (c.in as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [{ id: "user-manager", full_name: "Manager" }], error: null });
        return c;
      }
      if (table === "candidates") return buildChain({
        id: "c-1", name: "Alice", email: "a@t.com", phone: "+6511111111", status: "applied",
        notes: null, job_id: null, current_stage_id: null, stage_entered_at: null,
        resume_url: null, created_at: "2026-01-01", updated_at: "2026-01-01",
      });
      if (table === "candidate_activities") {
        const c = buildChain();
        (c.limit as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [{ id: "act-1", candidate_id: "c-1", user_id: "user-manager", type: "note", note: "test", outcome: null, created_at: "2026-01-01" }], error: null });
        return c;
      }
      if (table === "candidate_documents") {
        const c = buildChain();
        (c.order as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
        return c;
      }
      if (table === "candidate_profiles") return buildChain({ user_id: "u-a", completed: true, candidate_id: "c-1" });
      if (table === "disc_results") return buildChain({ disc_type: "Di" });
      return buildChain();
    });

    const result = await getCandidate("c-1");
    expect(result.success).toBe(true);
    expect(result.candidate!.disc_type).toBe("Di");
    expect(result.candidate!.disc_completed).toBe(true);
    expect(result.candidate!.profile_completed).toBe(true);
  });

  it("handles candidate with no job or stage", async () => {
    mockAuthUser("pa");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-pa", full_name: "PA", email: "pa@t.com", role: "pa" });
      if (table === "candidates") return buildChain({
        id: "c-2", name: "Bob", email: null, phone: "+6522222222", status: "applied",
        notes: "some notes", job_id: null, current_stage_id: null, stage_entered_at: null,
        resume_url: null, created_at: "2026-01-01", updated_at: "2026-01-01",
      });
      if (table === "candidate_activities") {
        const c = buildChain();
        (c.limit as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
        return c;
      }
      if (table === "candidate_documents") {
        const c = buildChain();
        (c.order as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
        return c;
      }
      if (table === "candidate_profiles") return buildChain(null);
      return buildChain();
    });

    const result = await getCandidate("c-2");
    expect(result.success).toBe(true);
    expect(result.candidate!.disc_type).toBeNull();
    expect(result.candidate!.disc_completed).toBe(false);
  });
});

describe("addActivity", () => {
  it("requires authentication", async () => {
    mockNoAuth();
    const result = await addActivity("cand-1", { type: "note", note: "test" });
    expect(result.success).toBe(false);
  });

  it("allows PA to add activities", async () => {
    mockAuthUser("pa");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-pa", full_name: "PA", email: "pa@t.com", role: "pa" });
      if (table === "candidate_activities") return buildChain(null, null);
      return buildChain();
    });
    const result = await addActivity("cand-1", { type: "note", note: "PA note" });
    expect(result.success).toBe(true);
  });
});

describe("updateCandidate", () => {
  it("requires authentication", async () => {
    mockNoAuth();
    const result = await updateCandidate("cand-1", { name: "New Name" });
    expect(result.success).toBe(false);
  });

  it("allows PA to update candidate", async () => {
    mockAuthUser("pa");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-pa", full_name: "PA", email: "pa@t.com", role: "pa" });
      if (table === "candidates") return buildChain(null, null);
      return buildChain();
    });
    const result = await updateCandidate("cand-1", { name: "Updated", notes: "new notes" });
    expect(result.success).toBe(true);
  });
});

describe("searchCandidates", () => {
  it("requires authentication", async () => {
    mockNoAuth();
    const result = await searchCandidates({});
    expect(result.success).toBe(false);
  });

  it("returns empty result set", async () => {
    mockAuthUser("pa");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-pa", full_name: "PA", email: "pa@t.com", role: "pa" });
      if (table === "candidates") {
        const c = buildChain();
        (c.range as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], count: 0, error: null });
        return c;
      }
      return buildChain();
    });
    const result = await searchCandidates({ query: "nobody" });
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });
});

describe("addDocument", () => {
  it("requires authentication", async () => {
    mockNoAuth();
    const result = await addDocument("cand-1", { label: "Resume", fileName: "res.pdf", fileUrl: "https://example.com/res.pdf" });
    expect(result.success).toBe(false);
  });

  it("allows PA to add documents", async () => {
    mockAuthUser("pa");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-pa", full_name: "PA", email: "pa@t.com", role: "pa" });
      if (table === "candidate_documents") return buildChain(null, null);
      return buildChain();
    });
    const result = await addDocument("cand-1", { label: "Resume", fileName: "res.pdf", fileUrl: "https://example.com/res.pdf" });
    expect(result.success).toBe(true);
  });

  it("returns error on insert failure", async () => {
    mockAuthUser("manager");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-manager", full_name: "Mgr", email: "m@t.com", role: "manager" });
      if (table === "candidate_documents") return buildChain(null, { message: "Insert failed" });
      return buildChain();
    });
    const result = await addDocument("cand-1", { label: "Resume", fileName: "res.pdf", fileUrl: "https://example.com/res.pdf" });
    expect(result.success).toBe(false);
  });
});

describe("searchCandidates (enrichment)", () => {
  it("enriches results with position_applied and DISC types", async () => {
    mockAuthUser("manager");

    const mockCandidates = [
      { id: "c-1", name: "Alice", email: "a@t.com", phone: "+6511111111", status: "applied", created_at: "2026-01-01" },
      { id: "c-2", name: "Bob", email: "b@t.com", phone: "+6522222222", status: "applied", created_at: "2026-01-02" },
    ];

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-manager", full_name: "Mgr", email: "m@t.com", role: "manager" });
      if (table === "candidates") {
        const c = buildChain();
        (c.range as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockCandidates, count: 2, error: null });
        return c;
      }
      if (table === "candidate_profiles") {
        const c = buildChain();
        (c.in as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [{ candidate_id: "c-1", user_id: "u-a", position_applied: "Financial Advisor" }], error: null });
        return c;
      }
      if (table === "disc_results") {
        const c = buildChain();
        (c.in as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [{ user_id: "u-a", disc_type: "Di" }], error: null });
        return c;
      }
      return buildChain();
    });

    const result = await searchCandidates({});
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data![0].position_applied).toBe("Financial Advisor");
    expect(result.data![0].disc_type).toBe("Di");
    expect(result.data![1].position_applied).toBeNull();
    expect(result.data![1].disc_type).toBeNull();
  });

  it("filters by DISC type", async () => {
    mockAuthUser("manager");

    const mockCandidates = [
      { id: "c-1", name: "Alice", email: "a@t.com", phone: "+6511111111", status: "applied", created_at: "2026-01-01" },
    ];

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-manager", full_name: "Mgr", email: "m@t.com", role: "manager" });
      if (table === "candidates") {
        const c = buildChain();
        (c.range as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockCandidates, count: 1, error: null });
        return c;
      }
      if (table === "candidate_profiles") {
        const c = buildChain();
        (c.in as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [{ candidate_id: "c-1", user_id: "u-a", position_applied: null }], error: null });
        return c;
      }
      if (table === "disc_results") {
        const c = buildChain();
        (c.in as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [{ user_id: "u-a", disc_type: "Di" }], error: null });
        return c;
      }
      return buildChain();
    });

    const result = await searchCandidates({ discType: "Sc" });
    expect(result.success).toBe(true);
    // Alice has Di, not Sc — should be filtered out
    expect(result.data).toHaveLength(0);
  });

  it("handles DB error", async () => {
    mockAuthUser("manager");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-manager", full_name: "Mgr", email: "m@t.com", role: "manager" });
      if (table === "candidates") {
        const c = buildChain();
        (c.range as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, count: 0, error: { message: "DB error" } });
        return c;
      }
      return buildChain();
    });
    const result = await searchCandidates({});
    expect(result.success).toBe(false);
  });
});

describe("updateCandidate (all branches)", () => {
  it("handles all fields together including empty email and notes", async () => {
    mockAuthUser("pa");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-pa", full_name: "PA", email: "pa@t.com", role: "pa" });
      if (table === "candidates") return buildChain(null, null);
      return buildChain();
    });
    // email empty → null, notes empty → null
    const result = await updateCandidate("cand-1", { name: "Alice", email: "", phone: "+6511111111", notes: "" });
    expect(result.success).toBe(true);
  });

  it("handles non-empty email and notes", async () => {
    mockAuthUser("pa");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-pa", full_name: "PA", email: "pa@t.com", role: "pa" });
      if (table === "candidates") return buildChain(null, null);
      return buildChain();
    });
    const result = await updateCandidate("cand-1", { email: "new@test.com", notes: "important note" });
    expect(result.success).toBe(true);
  });
});

describe("updateCandidate (error branch)", () => {
  it("returns error on DB failure", async () => {
    mockAuthUser("manager");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-manager", full_name: "Mgr", email: "m@t.com", role: "manager" });
      if (table === "candidates") {
        const result = { data: null, error: { message: "Update failed" } };
        const self: Record<string, ReturnType<typeof vi.fn>> = {};
        const thenable = { then: (r: (v: unknown) => void) => Promise.resolve(result).then(r) };
        for (const m of ["select","eq","in","is","not","or","gt","order","limit","range","single","insert","update","delete"]) {
          self[m] = vi.fn(() => Object.assign(thenable, self));
        }
        self.single = vi.fn(() => Promise.resolve(result));
        return Object.assign(thenable, self);
      }
      return buildChain();
    });
    const result = await updateCandidate("cand-1", { name: "Bad" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Update failed");
  });

  it("handles partial update (only email)", async () => {
    mockAuthUser("manager");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-manager", full_name: "Mgr", email: "m@t.com", role: "manager" });
      if (table === "candidates") return buildChain(null, null);
      return buildChain();
    });
    const result = await updateCandidate("cand-1", { email: "" }); // empty email → null
    expect(result.success).toBe(true);
  });
});

describe("updateInterviewFeedback (branch coverage)", () => {
  it("updates only recommendation without notes", async () => {
    mockAuthUser("manager");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-manager", full_name: "Mgr", email: "m@t.com", role: "manager" });
      if (table === "interviews") return buildChain(null, null);
      return buildChain();
    });
    const result = await updateInterviewFeedback("int-1", { recommendation: "pass" });
    expect(result.success).toBe(true);
  });

  it("updates only notes without recommendation", async () => {
    mockAuthUser("director");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-director", full_name: "Dir", email: "d@t.com", role: "director" });
      if (table === "interviews") return buildChain(null, null);
      return buildChain();
    });
    const result = await updateInterviewFeedback("int-1", { notes: "feedback only" });
    expect(result.success).toBe(true);
  });

  it("handles empty notes (trim to null)", async () => {
    mockAuthUser("manager");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-manager", full_name: "Mgr", email: "m@t.com", role: "manager" });
      if (table === "interviews") return buildChain(null, null);
      return buildChain();
    });
    const result = await updateInterviewFeedback("int-1", { notes: "   " });
    expect(result.success).toBe(true);
  });
});

describe("addActivity (error branch)", () => {
  it("returns error on insert failure", async () => {
    mockAuthUser("manager");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return buildChain({ id: "user-manager", full_name: "Mgr", email: "m@t.com", role: "manager" });
      if (table === "candidate_activities") return buildChain(null, { message: "Insert failed" });
      return buildChain();
    });
    const result = await addActivity("cand-1", { type: "note", note: "test" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Insert failed");
  });
});

describe("getInterviews (user enrichment edge cases)", () => {
  it("handles null users response gracefully", async () => {
    mockAuthUser("manager");
    const mockInterviews = [{
      id: "int-1", candidate_id: "c-1", manager_id: "mgr-1", scheduled_by_id: "pa-1",
      round_number: 1, type: "in_person", datetime: "2026-03-20T10:00:00Z",
      location: "Office", zoom_link: null, status: "scheduled",
      notes: null, recommendation: null, created_at: "2026-03-19", updated_at: null,
    }];

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        const c = buildChain();
        c.single = vi.fn(() => Promise.resolve({
          data: { id: "user-manager", full_name: "Manager", email: "m@t.com", role: "manager" },
          error: null,
        }));
        // Users batch lookup returns null (simulating error)
        (c.in as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: { message: "err" } });
        return c;
      }
      if (table === "interviews") {
        const c = buildChain();
        (c.order as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockInterviews, error: null });
        return c;
      }
      return buildChain();
    });

    const result = await getInterviews("c-1");
    expect(result.success).toBe(true);
    expect(result.interviews![0].manager_name).toBe("Unknown"); // fallback
  });
});

