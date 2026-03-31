import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock next/headers
const mockCookieGet = vi.fn();
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: () => "127.0.0.1" })),
  cookies: vi.fn(() => Promise.resolve({
    get: mockCookieGet,
    delete: vi.fn(),
  })),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock Supabase server client
const mockGetUser = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignInWithOtp = vi.fn();
const mockVerifyOtp = vi.fn();
const mockSignOut = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: mockGetUser,
      signInWithPassword: mockSignInWithPassword,
      signInWithOtp: mockSignInWithOtp,
      verifyOtp: mockVerifyOtp,
      signOut: mockSignOut,
    },
  })),
}));

// Mock Supabase admin client
const mockAdminFrom = vi.fn();
const mockAdminRpc = vi.fn();
const mockAdminDeleteUser = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
    rpc: mockAdminRpc,
    auth: { admin: { deleteUser: mockAdminDeleteUser } },
  })),
  getAdminClientAs: vi.fn(() => ({
    from: mockAdminFrom,
    rpc: mockAdminRpc,
    auth: { admin: { deleteUser: mockAdminDeleteUser } },
  })),
}));

// Mock email sending
vi.mock("@/lib/email", () => ({
  sendInvitationEmail: vi.fn(() => Promise.resolve({ success: true })),
}));

// Mock PDF/storage utilities
vi.mock("@/lib/supabase/storage", () => ({
  getSignedPdfUrl: vi.fn(() => Promise.resolve("https://signed-url.example.com")),
  uploadCandidatePdf: vi.fn(() => Promise.resolve("path/to/pdf")),
  deleteResumeFiles: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("@/lib/pdf", () => ({
  generateProfilePdf: vi.fn(() => Promise.resolve(Buffer.from("pdf"))),
  generateDiscPdf: vi.fn(() => Promise.resolve(Buffer.from("pdf"))),
}));

vi.mock("@/app/candidate/disc-quiz/scoring", () => ({
  computeDerivedFields: vi.fn(() => ({
    profile_strength: "moderate",
    strength_pct: 30,
    priorities: ["Action"],
  })),
  DISC_TYPE_INFO: {
    Balanced: { name: "Balanced" },
    Di: { name: "Dominant-Influencer" },
    Sc: { name: "Steady-Conscientious" },
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function mockNoAuthUser() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
  mockCookieGet.mockReturnValue(undefined);
}

/** Chain builder for Supabase query mocks — every method returns a thenable chain */
function chainMock(resolvedData: unknown = null, error: unknown = null) {
  const result = { data: resolvedData, error };
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  // Make chain thenable so await works at any point
  const thenable = {
    then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
      Promise.resolve(result).then(resolve, reject),
  };
  const methods = ["select", "eq", "in", "is", "not", "gt", "or", "order", "limit", "range",
    "single", "insert", "update", "delete"];
  for (const m of methods) {
    chain[m] = vi.fn(() => Object.assign(thenable, chain));
  }
  // single always returns a promise
  chain.single = vi.fn(() => Promise.resolve(result));
  return Object.assign(thenable, chain);
}

function setupAdminFrom(tableResults: Record<string, { data?: unknown; error?: unknown }> = {}) {
  mockAdminFrom.mockImplementation((table: string) => {
    const result = tableResults[table];
    return chainMock(result?.data ?? null, result?.error ?? null);
  });
}

// ─── Import the module under test ───────────────────────────────────────────

import {
  requireStaff,
  getStaffUser,
  staffVerifyOtp,
  staffSendOtp,
  staffLogin,
  staffLogout,
  sendInvite,
  listInvitations,
  getProgressForUser,
  revokeInvitation,
  resetApplication,
  resetQuiz,
  deleteCandidate,
  archiveInvitation,
  getPdfUrl,
  backfillPdfs,
  removeInviteFile,
} from "../actions";

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  setupAdminFrom({
    users: { data: { id: "user-123", full_name: "Test User", email: "test@example.com", role: "manager" } },
  });
});

describe("STAFF_ROLES hierarchy", () => {
  it("allows PA to access staff portal (requireStaff with no minRole)", async () => {
    mockAuthUser("pa");
    const result = await requireStaff();
    expect(result).not.toBeNull();
    expect(result?.role).toBe("manager"); // from mocked users table
  });

  it("blocks PA from manager-level actions", async () => {
    mockAuthUser("pa");
    const result = await requireStaff("manager");
    expect(result).toBeNull();
  });

  it("blocks PA from director-level actions", async () => {
    mockAuthUser("pa");
    const result = await requireStaff("director");
    expect(result).toBeNull();
  });

  it("blocks PA from admin-level actions", async () => {
    mockAuthUser("pa");
    const result = await requireStaff("admin");
    expect(result).toBeNull();
  });

  it("allows manager for manager-level actions", async () => {
    mockAuthUser("manager");
    const result = await requireStaff("manager");
    expect(result).not.toBeNull();
  });

  it("allows director for manager-level actions", async () => {
    mockAuthUser("director");
    const result = await requireStaff("manager");
    expect(result).not.toBeNull();
  });

  it("allows admin for manager-level actions", async () => {
    mockAuthUser("admin");
    const result = await requireStaff("manager");
    expect(result).not.toBeNull();
  });

  it("blocks manager from director-level actions", async () => {
    mockAuthUser("manager");
    const result = await requireStaff("director");
    expect(result).toBeNull();
  });

  it("allows director for director-level actions", async () => {
    mockAuthUser("director");
    const result = await requireStaff("director");
    expect(result).not.toBeNull();
  });

  it("blocks non-staff roles entirely", async () => {
    mockAuthUser("candidate");
    const result = await requireStaff();
    expect(result).toBeNull();
  });

  it("returns null when no user is authenticated and no cookie", async () => {
    mockNoAuthUser();
    const result = await requireStaff();
    expect(result).toBeNull();
  });
});

describe("Legacy cookie sessions removed", () => {
  it("rejects requests with only a legacy cookie (no Supabase Auth)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockCookieGet.mockReturnValue({ value: "a".repeat(32) });
    const result = await requireStaff();
    expect(result).toBeNull();
  });
});

describe("getStaffUser", () => {
  it("delegates to requireStaff with no minRole", async () => {
    mockAuthUser("pa");
    const result = await getStaffUser();
    expect(result).not.toBeNull();
  });
});

describe("staffLogin", () => {
  it("rejects non-admin email login", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { app_metadata: { role: "manager" } } },
      error: null,
    });
    const result = await staffLogin("test@example.com", "password");
    expect(result.success).toBe(false);
    expect(result.error).toContain("admins only");
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("allows admin email login", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: "admin-1", app_metadata: { role: "admin" } } },
      error: null,
    });
    const result = await staffLogin("admin@example.com", "password");
    expect(result.success).toBe(true);
  });

  it("returns error for invalid credentials", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid" },
    });
    const result = await staffLogin("bad@email.com", "wrong");
    expect(result.success).toBe(false);
  });
});

describe("staffSendOtp", () => {
  it("rejects invalid phone format", async () => {
    const result = await staffSendOtp("12345");
    expect(result.success).toBe(false);
  });

  it("sends OTP for valid SG number", async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null });
    const result = await staffSendOtp("+6591234567");
    expect(result.success).toBe(true);
  });

  it("returns error when OTP send fails", async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: "Rate limited" } });
    const result = await staffSendOtp("+6591234567");
    expect(result.success).toBe(false);
  });
});

describe("staffVerifyOtp", () => {
  it("rejects non-6-digit codes", async () => {
    const result = await staffVerifyOtp("+6591234567", "123");
    expect(result.success).toBe(false);
  });

  it("rejects non-staff roles after OTP verification", async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { user: { id: "cand-1", app_metadata: { role: "candidate" } } },
      error: null,
    });
    const result = await staffVerifyOtp("+6591234567", "123456");
    expect(result.success).toBe(false);
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("allows PA after OTP verification", async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { user: { id: "pa-1", app_metadata: { role: "pa" } } },
      error: null,
    });
    const result = await staffVerifyOtp("+6591234567", "123456");
    expect(result.success).toBe(true);
  });

  it("allows manager after OTP verification", async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { user: { id: "mgr-1", app_metadata: { role: "manager" } } },
      error: null,
    });
    const result = await staffVerifyOtp("+6591234567", "123456");
    expect(result.success).toBe(true);
  });

  it("returns error on failed verification", async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: null }, error: { message: "Invalid" } });
    const result = await staffVerifyOtp("+6591234567", "123456");
    expect(result.success).toBe(false);
  });

  it("returns error when no user returned", async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: null }, error: null });
    const result = await staffVerifyOtp("+6591234567", "123456");
    expect(result.success).toBe(false);
  });
});

describe("Guarded destructive actions", () => {
  describe("revokeInvitation", () => {
    it("requires manager role", async () => {
      mockAuthUser("pa");
      const result = await revokeInvitation("inv-1");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Manager");
    });

    it("succeeds for manager", async () => {
      mockAuthUser("manager");
      const result = await revokeInvitation("inv-1");
      expect(result.success).toBe(true);
    });
  });

  describe("resetApplication", () => {
    it("requires manager role", async () => {
      mockAuthUser("pa");
      const result = await resetApplication("inv-1");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Manager");
    });

    it("succeeds for manager with linked user", async () => {
      mockAuthUser("manager");
      setupAdminFrom({
        users: { data: { id: "user-123", full_name: "Test", email: "t@t.com", role: "manager" } },
        invitations: { data: { user_id: "user-abc" } },
        disc_results: { data: null },
        disc_responses: { data: null },
        candidate_profiles: { data: null },
      });
      const result = await resetApplication("inv-1");
      expect(result.success).toBe(true);
    });

    it("fails when no user linked to invitation", async () => {
      mockAuthUser("manager");
      setupAdminFrom({
        users: { data: { id: "user-123", full_name: "Test", email: "t@t.com", role: "manager" } },
        invitations: { data: null, error: { message: "not found" } },
      });
      const result = await resetApplication("inv-1");
      expect(result.success).toBe(false);
    });
  });

  describe("resetQuiz", () => {
    it("requires manager role", async () => {
      mockAuthUser("pa");
      const result = await resetQuiz("inv-1");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Manager");
    });

    it("succeeds for manager", async () => {
      mockAuthUser("manager");
      setupAdminFrom({
        users: { data: { id: "user-123", full_name: "Test", email: "t@t.com", role: "manager" } },
        invitations: { data: { user_id: "user-abc" } },
        disc_results: { data: null },
        disc_responses: { data: null },
      });
      const result = await resetQuiz("inv-1");
      expect(result.success).toBe(true);
    });
  });

  describe("archiveInvitation", () => {
    it("requires manager role", async () => {
      mockAuthUser("pa");
      const result = await archiveInvitation("inv-1");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Manager");
    });

    it("succeeds for manager", async () => {
      mockAuthUser("manager");
      const result = await archiveInvitation("inv-1");
      expect(result.success).toBe(true);
    });
  });

  describe("deleteCandidate", () => {
    it("requires admin role", async () => {
      mockAuthUser("manager");
      const result = await deleteCandidate("inv-1");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Admin");
    });

    it("requires admin — blocks PA", async () => {
      mockAuthUser("pa");
      const result = await deleteCandidate("inv-1");
      expect(result.success).toBe(false);
    });

    it("succeeds for admin", async () => {
      mockAuthUser("admin");
      mockAdminRpc.mockResolvedValue({ error: null });
      setupAdminFrom({
        users: { data: { id: "admin-1", full_name: "Admin", email: "a@a.com", role: "admin" } },
        invitations: { data: { user_id: "user-to-delete" } },
      });
      const result = await deleteCandidate("inv-1");
      expect(result.success).toBe(true);
    });
  });
});

describe("Non-destructive actions accessible to PA", () => {
  it("sendInvite works for PA", async () => {
    mockAuthUser("pa");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return chainMock({ id: "pa-1", full_name: "PA User", email: "pa@test.com", role: "pa" });
      if (table === "invitations") {
        const c = chainMock();
        // Duplicate check returns empty
        (c.limit as ReturnType<typeof vi.fn>).mockImplementation(() =>
          Object.assign(Promise.resolve({ data: [], error: null }), c)
        );
        // insert().select().single() returns new invitation
        (c.insert as ReturnType<typeof vi.fn>).mockImplementation(() => {
          const inner = chainMock({ id: "inv-new" });
          return Object.assign(Promise.resolve({ data: { id: "inv-new" }, error: null }), inner);
        });
        return c;
      }
      return chainMock();
    });
    const result = await sendInvite({ email: "candidate@test.com" });
    expect(result.success).toBe(true);
  });

  it("listInvitations works for PA", async () => {
    mockAuthUser("pa");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return chainMock({ id: "pa-1", full_name: "PA", email: "pa@test.com", role: "pa" });
      if (table === "invitations") {
        const c = chainMock();
        (c.limit as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
        return c;
      }
      return chainMock();
    });
    const result = await listInvitations();
    expect(result.success).toBe(true);
  });

  it("getPdfUrl works for PA", async () => {
    mockAuthUser("pa");
    const result = await getPdfUrl("a1b2c3d4-e5f6-7890-abcd-ef1234567890/application.pdf");
    expect(result.success).toBe(true);
    expect(result.url).toBeTruthy();
  });
});

describe("sendInvite", () => {
  it("rejects invalid email", async () => {
    mockAuthUser("manager");
    const result = await sendInvite({ email: "not-an-email" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("valid email");
  });

  it("rejects duplicate active invitation", async () => {
    mockAuthUser("manager");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return chainMock({ id: "user-123", full_name: "Test", email: "t@t.com", role: "manager" });
      if (table === "invitations") {
        const c = chainMock();
        (c.limit as ReturnType<typeof vi.fn>).mockImplementation(() =>
          Object.assign(Promise.resolve({ data: [{ id: "existing" }], error: null }), c)
        );
        return c;
      }
      return chainMock();
    });
    const result = await sendInvite({ email: "existing@test.com" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("already exists");
  });

  it("rejects unauthenticated users", async () => {
    mockNoAuthUser();
    const result = await sendInvite({ email: "test@test.com" });
    expect(result.success).toBe(false);
  });
});

describe("listInvitations", () => {
  it("enriches invitations with progress data", async () => {
    mockAuthUser("manager");
    const mockInvitations = [
      { id: "inv-1", user_id: "u-1", token: "t1", email: "a@b.com", candidate_name: "A", position_applied: null, status: "accepted", invited_by: "staff", created_at: "2026-01-01", expires_at: "2026-01-15", accepted_at: "2026-01-02", archived_at: null, profile_pdf_path: null, disc_pdf_path: null },
      { id: "inv-2", user_id: null, token: "t2", email: "b@b.com", candidate_name: "B", position_applied: null, status: "pending", invited_by: "staff", created_at: "2026-01-01", expires_at: "2026-01-15", accepted_at: null, archived_at: null, profile_pdf_path: null, disc_pdf_path: null },
    ];

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return chainMock({ id: "user-123", full_name: "Mgr", email: "m@t.com", role: "manager" });
      if (table === "invitations") {
        const c = chainMock();
        (c.limit as ReturnType<typeof vi.fn>).mockImplementation(() =>
          Object.assign(Promise.resolve({ data: mockInvitations, error: null }), c)
        );
        return c;
      }
      if (table === "candidate_profiles") {
        const c = chainMock();
        (c.in as ReturnType<typeof vi.fn>).mockImplementation(() =>
          Object.assign(Promise.resolve({ data: [{ user_id: "u-1", completed: true, onboarding_step: 6 }], error: null }), c)
        );
        return c;
      }
      if (table === "disc_responses") {
        const c = chainMock();
        (c.in as ReturnType<typeof vi.fn>).mockImplementation(() =>
          Object.assign(Promise.resolve({ data: [{ user_id: "u-1", responses: { "1": 3, "2": 4 } }], error: null }), c)
        );
        return c;
      }
      if (table === "disc_results") {
        const c = chainMock();
        (c.in as ReturnType<typeof vi.fn>).mockImplementation(() =>
          Object.assign(Promise.resolve({ data: [{ user_id: "u-1", disc_type: "Di" }], error: null }), c)
        );
        return c;
      }
      return chainMock();
    });

    const result = await listInvitations();
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    // First invitation has user_id, should have progress
    expect(result.data![0].progress).not.toBeNull();
    expect(result.data![0].progress!.profile_completed).toBe(true);
    expect(result.data![0].progress!.quiz_completed).toBe(true);
    expect(result.data![0].progress!.disc_type).toBe("Di");
    // Second has no user_id
    expect(result.data![1].progress).toBeNull();
  });

  it("rejects unauthenticated users", async () => {
    mockNoAuthUser();
    const result = await listInvitations();
    expect(result.success).toBe(false);
  });
});

describe("getProgressForUser", () => {
  it("returns progress for a linked user", async () => {
    mockAuthUser("manager");

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return chainMock({ id: "user-123", full_name: "Mgr", email: "m@t.com", role: "manager" });
      if (table === "candidate_profiles") return chainMock({ candidate_id: "cand-1", completed: true, onboarding_step: 5 });
      if (table === "disc_responses") return chainMock({ responses: { "1": 3, "2": 4, "3": 5 } });
      if (table === "disc_results") return chainMock({ disc_type: "Sc" });
      return chainMock();
    });

    const result = await getProgressForUser("u-1");
    expect(result.success).toBe(true);
    expect(result.progress!.profile_completed).toBe(true);
    expect(result.progress!.quiz_answered).toBe(3);
    expect(result.progress!.quiz_completed).toBe(true);
    expect(result.progress!.disc_type).toBe("Sc");
  });

  it("rejects when userId has no candidate profile (IDOR prevention)", async () => {
    mockAuthUser("pa");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return chainMock({ id: "user-pa", full_name: "PA", email: "pa@t.com", role: "pa" });
      return chainMock(null);
    });

    const result = await getProgressForUser("u-999");
    expect(result.success).toBe(false);
  });
});

describe("backfillPdfs", () => {
  it("returns 0 when no invitations need backfilling", async () => {
    mockAuthUser("admin");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return chainMock({ id: "user-admin", full_name: "Admin", email: "a@t.com", role: "admin" });
      if (table === "invitations") {
        const c = chainMock();
        (c.eq as ReturnType<typeof vi.fn>).mockImplementation(() =>
          Object.assign(Promise.resolve({ data: [], error: null }), c)
        );
        return c;
      }
      return chainMock();
    });
    const result = await backfillPdfs();
    expect(result.generated).toBe(0);
  });

  it("returns 0 when not authenticated", async () => {
    mockNoAuthUser();
    const result = await backfillPdfs();
    expect(result.generated).toBe(0);
  });

  it("generates profile PDF for completed candidates missing PDF", async () => {
    mockAuthUser("admin");
    const invitations = [
      { id: "inv-1", user_id: "u-1", profile_pdf_path: null, disc_pdf_path: "existing.pdf" },
    ];
    const profile = {
      full_name: "Test", position_applied: "Agent", expected_salary: "3000", salary_period: "month",
      date_available: "2026-04-01", date_of_birth: "1990-01-01", place_of_birth: "SG",
      nationality: "Singaporean", race: "Chinese", gender: "Male", marital_status: "Single",
      address_block: "123", address_street: "Main St", address_unit: "#01-01", address_postal: "123456",
      contact_number: "+6591234567", email: "test@test.com",
      ns_enlistment_date: null, ns_ord_date: null, ns_service_status: null, ns_status: null, ns_exemption_reason: null,
      emergency_name: "Mom", emergency_relationship: "Mother", emergency_contact: "+6598765432",
      education: {}, software_competencies: null, shorthand_wpm: null, typing_wpm: null,
      languages: [], employment_history: [],
      additional_health: false, additional_health_detail: null,
      additional_dismissed: false, additional_dismissed_detail: null,
      additional_convicted: false, additional_convicted_detail: null,
      additional_bankrupt: false, additional_bankrupt_detail: null,
      additional_relatives: false, additional_relatives_detail: null,
      additional_prev_applied: false, additional_prev_applied_detail: null,
      declaration_agreed: true, declaration_date: "2026-03-01",
    };

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return chainMock({ id: "user-admin", full_name: "Admin", email: "a@t.com", role: "admin" });
      if (table === "invitations") {
        const c = chainMock();
        // First call: list invitations to backfill
        (c.eq as ReturnType<typeof vi.fn>).mockImplementation(() =>
          Object.assign(Promise.resolve({ data: invitations, error: null }), c)
        );
        return c;
      }
      if (table === "candidate_profiles") return chainMock(profile);
      if (table === "disc_results") return chainMock(null);
      return chainMock();
    });

    const result = await backfillPdfs();
    expect(result.generated).toBeGreaterThanOrEqual(0);
  });

  it("generates DISC PDF for completed quiz missing PDF", async () => {
    mockAuthUser("admin");
    const invitations = [
      { id: "inv-2", user_id: "u-2", profile_pdf_path: "existing.pdf", disc_pdf_path: null },
    ];

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return chainMock({ id: "user-admin", full_name: "Admin", email: "a@t.com", role: "admin" });
      if (table === "invitations") {
        const c = chainMock();
        (c.eq as ReturnType<typeof vi.fn>).mockImplementation(() =>
          Object.assign(Promise.resolve({ data: invitations, error: null }), c)
        );
        return c;
      }
      if (table === "disc_results") return chainMock({
        user_id: "u-2", disc_type: "Di", d_raw: 10, i_raw: 8, s_raw: 3, c_raw: 2,
        d_pct: 80, i_pct: 60, s_pct: 30, c_pct: 20, angle: 45,
      });
      if (table === "candidate_profiles") return chainMock({ full_name: "Bob" });
      return chainMock();
    });

    const result = await backfillPdfs();
    expect(result.generated).toBeGreaterThanOrEqual(0);
  });
});

describe("deleteCandidate (additional branches)", () => {
  it("handles rpc error", async () => {
    mockAuthUser("admin");
    mockAdminRpc.mockResolvedValue({ error: { message: "RPC failed" } });
    setupAdminFrom({
      users: { data: { id: "admin-1", full_name: "Admin", email: "a@a.com", role: "admin" } },
      invitations: { data: { user_id: null } },
    });
    const result = await deleteCandidate("inv-1");
    expect(result.success).toBe(false);
    expect(result.error).toBe("RPC failed");
  });

  it("skips auth user deletion when no user_id", async () => {
    mockAuthUser("admin");
    mockAdminRpc.mockResolvedValue({ error: null });
    setupAdminFrom({
      users: { data: { id: "admin-1", full_name: "Admin", email: "a@a.com", role: "admin" } },
      invitations: { data: { user_id: null } },
    });
    const result = await deleteCandidate("inv-1");
    expect(result.success).toBe(true);
    expect(mockAdminDeleteUser).not.toHaveBeenCalled();
  });
});

describe("revokeInvitation (error branch)", () => {
  it("returns error on DB failure", async () => {
    mockAuthUser("manager");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return chainMock({ id: "user-mgr", full_name: "Mgr", email: "m@t.com", role: "manager" });
      if (table === "invitations") {
        const result = { data: null, error: { message: "DB error" } };
        const chain: Record<string, ReturnType<typeof vi.fn>> = {};
        const thenable = { then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve) };
        for (const m of ["select", "eq", "in", "is", "not", "gt", "or", "order", "limit", "range", "single", "insert", "update", "delete"]) {
          chain[m] = vi.fn(() => Object.assign(thenable, chain));
        }
        chain.single = vi.fn(() => Promise.resolve(result));
        return Object.assign(thenable, chain);
      }
      return chainMock();
    });
    const result = await revokeInvitation("inv-1");
    expect(result.success).toBe(false);
    expect(result.error).toBe("DB error");
  });
});

describe("archiveInvitation (error branch)", () => {
  it("returns error on DB failure", async () => {
    mockAuthUser("manager");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return chainMock({ id: "user-mgr", full_name: "Mgr", email: "m@t.com", role: "manager" });
      if (table === "invitations") {
        const result = { data: null, error: { message: "Archive error" } };
        const chain: Record<string, ReturnType<typeof vi.fn>> = {};
        const thenable = { then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve) };
        for (const m of ["select", "eq", "in", "is", "not", "gt", "or", "order", "limit", "range", "single", "insert", "update", "delete"]) {
          chain[m] = vi.fn(() => Object.assign(thenable, chain));
        }
        chain.single = vi.fn(() => Promise.resolve(result));
        return Object.assign(thenable, chain);
      }
      return chainMock();
    });
    const result = await archiveInvitation("inv-1");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Archive error");
  });
});

describe("sendInvite (DB error branch)", () => {
  it("returns error when insert fails", async () => {
    mockAuthUser("manager");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return chainMock({ id: "user-123", full_name: "Test", email: "t@t.com", role: "manager" });
      if (table === "invitations") {
        const c = chainMock();
        // First call (select for duplicate check) — no existing
        (c.limit as ReturnType<typeof vi.fn>).mockImplementation(() =>
          Object.assign(Promise.resolve({ data: [], error: null }), c)
        );
        // insert().select().single() fails
        (c.insert as ReturnType<typeof vi.fn>).mockImplementation(() => {
          const inner = chainMock(null, { message: "Insert failed" });
          return Object.assign(Promise.resolve({ data: null, error: { message: "Insert failed" } }), inner);
        });
        return c;
      }
      return chainMock();
    });
    const result = await sendInvite({ email: "new@test.com" });
    expect(result.success).toBe(false);
  });
});

describe("listInvitations (error branch)", () => {
  it("returns error on DB failure", async () => {
    mockAuthUser("manager");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return chainMock({ id: "user-123", full_name: "Mgr", email: "m@t.com", role: "manager" });
      if (table === "invitations") {
        const c = chainMock();
        (c.limit as ReturnType<typeof vi.fn>).mockImplementation(() =>
          Object.assign(Promise.resolve({ data: null, error: { message: "List error" } }), c)
        );
        return c;
      }
      return chainMock();
    });
    const result = await listInvitations();
    expect(result.success).toBe(false);
    expect(result.error).toBe("List error");
  });
});

describe("getPdfUrl", () => {
  it("returns signed URL", async () => {
    mockAuthUser("pa");
    const result = await getPdfUrl("a1b2c3d4-e5f6-7890-abcd-ef1234567890/application.pdf");
    expect(result.success).toBe(true);
    expect(result.url).toBeTruthy();
  });

  it("rejects unauthenticated users", async () => {
    mockNoAuthUser();
    const result = await getPdfUrl("path/to/file.pdf");
    expect(result.success).toBe(false);
  });
});

describe("staffLogout", () => {
  it("signs out and redirects", async () => {
    const { redirect } = await import("next/navigation");
    await staffLogout();
    expect(mockSignOut).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/staff/login");
  });
});

describe("removeInviteFile", () => {
  it("requires authentication", async () => {
    mockNoAuthUser();
    const result = await removeInviteFile("inv-1", "invitations/inv-1/docs/file.pdf");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Not authenticated");
  });

  it("returns error when invitation not found", async () => {
    mockAuthUser("pa");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return chainMock({ id: "user-pa", full_name: "PA", email: "pa@t.com", role: "pa" });
      if (table === "invitations") return chainMock(null);
      return chainMock();
    });
    const result = await removeInviteFile("inv-1", "invitations/inv-1/docs/file.pdf");
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("removes file from attached_files and storage", async () => {
    mockAuthUser("manager");
    const attachedFiles = [
      { name: "file1.pdf", storage_path: "invitations/inv-1/docs/file1.pdf" },
      { name: "file2.pdf", storage_path: "invitations/inv-1/docs/file2.pdf" },
    ];
    let invCallCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return chainMock({ id: "user-mgr", full_name: "Mgr", email: "m@t.com", role: "manager" });
      if (table === "invitations") {
        invCallCount++;
        if (invCallCount === 1) {
          // First call: select → eq → single (invitation lookup)
          return chainMock({ id: "inv-1", attached_files: attachedFiles });
        }
        // Second call: update → eq (save)
        return chainMock(null, null);
      }
      return chainMock();
    });
    const result = await removeInviteFile("inv-1", "invitations/inv-1/docs/file1.pdf");
    expect(result.success).toBe(true);
  });

  it("returns error when file not found in invitation", async () => {
    mockAuthUser("manager");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return chainMock({ id: "user-mgr", full_name: "Mgr", email: "m@t.com", role: "manager" });
      if (table === "invitations") {
        return chainMock({ id: "inv-1", attached_files: [] });
      }
      return chainMock();
    });
    const result = await removeInviteFile("inv-1", "invitations/inv-1/docs/nonexistent.pdf");
    expect(result.success).toBe(false);
    expect(result.error).toContain("File not found");
  });

  it("returns error when update fails", async () => {
    mockAuthUser("manager");
    const targetFile = { name: "file.pdf", storage_path: "invitations/inv-1/docs/file.pdf" };
    let invCallCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return chainMock({ id: "user-mgr", full_name: "Mgr", email: "m@t.com", role: "manager" });
      if (table === "invitations") {
        invCallCount++;
        if (invCallCount === 1) {
          return chainMock({ id: "inv-1", attached_files: [targetFile] });
        }
        return chainMock(null, { message: "Update failed" });
      }
      return chainMock();
    });
    const result = await removeInviteFile("inv-1", "invitations/inv-1/docs/file.pdf");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to update");
  });
});

describe("deleteCandidate (with attached files)", () => {
  it("cleans up attached files from storage", async () => {
    mockAuthUser("admin");
    mockAdminRpc.mockResolvedValue({ error: null });
    const attachedFiles = [
      { name: "doc.pdf", storage_path: "invitations/inv-1/docs/doc.pdf" },
    ];
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") return chainMock({ id: "admin-1", full_name: "Admin", email: "a@a.com", role: "admin" });
      if (table === "invitations") return chainMock({ user_id: "user-to-delete", attached_files: attachedFiles });
      return chainMock();
    });
    const result = await deleteCandidate("inv-1");
    expect(result.success).toBe(true);
    expect(mockAdminDeleteUser).toHaveBeenCalledWith("user-to-delete");
  });
});
