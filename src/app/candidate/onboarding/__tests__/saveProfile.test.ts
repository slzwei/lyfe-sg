import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock next/navigation (redirect throws to halt execution)
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

// Mock next/server (after() captures the callback but doesn't run it)
vi.mock("next/server", () => ({
  after: vi.fn(),
}));

// Mock email + pdf + storage (not under test)
vi.mock("@/lib/email", () => ({
  sendProfileSubmissionEmail: vi.fn(),
}));
vi.mock("@/lib/pdf", () => ({
  generateProfilePdf: vi.fn(),
}));
vi.mock("@/lib/supabase/storage", () => ({
  uploadCandidatePdf: vi.fn(),
}));
const mockAdminUpdate = vi.fn(() => ({ eq: () => ({}) }));
const mockAdminSelect = vi.fn(() => ({
  eq: () => ({
    single: () => ({ data: { candidate_id: "cand-1" } }),
    maybeSingle: () => Promise.resolve({ data: { candidate_id: "cand-1" } }),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: vi.fn(() => ({
    from: () => ({
      update: mockAdminUpdate,
      select: mockAdminSelect,
    }),
    auth: {
      admin: {
        updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
      },
    },
  })),
}));

// ── Supabase server client mock ──

const mockGetUser = vi.fn();
const mockUpsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      upsert: mockUpsert,
    }),
  })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Minimal valid form data that passes all 6 Zod step schemas. */
function validFormData(): Record<string, unknown> {
  return {
    // Step 1 — personal
    position_applied: "Financial Advisor",
    expected_salary: "5000",
    date_available: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    full_name: "John Doe",
    date_of_birth: "1990-01-15",
    place_of_birth: "Singapore",
    nationality: "Singaporean",
    race: "Chinese",
    gender: "Male",
    marital_status: "Single",
    address_block: "123",
    address_street: "Orchard Road",
    address_unit: "#05-01",
    address_postal: "238888",
    contact_number: "+6591234567",
    email: "john@example.com",
    // Step 2 — NS + emergency (SG male path)
    ns_service_status: "NSman",
    ns_status: "Operationally Ready",
    ns_enlistment_date: "2008-01",
    ns_ord_date: "2010-01",
    ns_exemption_reason: "",
    emergency_name: "Jane Doe",
    emergency_relationship: "Spouse",
    emergency_contact: "+6598765432",
    // Step 3 — education (object, not array)
    education: {
      currently_studying: false,
      highest_qualification: "Bachelor's Degree",
      highest_institution: "NUS",
      highest_year_completed: "2013",
    },
    // Step 4 — skills
    software_competencies: "MS Office",
    languages: [{ language: "English", spoken: "Fluent", written: "Fluent" }],
    // Step 5 — employment
    employment_history: [
      {
        company: "Acme Corp",
        position: "Financial Advisor",
        from: "2013-06",
        to: "2020-12",
        reason_leaving: "Career change",
      },
    ],
    // Step 6 — declaration
    additional_health: false,
    additional_dismissed: false,
    additional_convicted: false,
    additional_bankrupt: false,
    additional_relatives: false,
    additional_prev_applied: false,
    declaration_agreed: true,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("saveProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated calls", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { saveProfile } = await import("../actions");
    const result = await saveProfile(validFormData());

    expect(result).toEqual({ error: "Not authenticated." });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("rejects when step 1 required fields are missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    const { saveProfile } = await import("../actions");
    // Empty form data — fails step1Schema
    const result = await saveProfile({});

    expect(result).toEqual({
      error: "Validation failed: personal details are incomplete or invalid.",
    });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("rejects when declaration step is incomplete", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    const data = validFormData();
    // Break step 6: declaration_agreed must be true
    delete data.declaration_agreed;

    const { saveProfile } = await import("../actions");
    const result = await saveProfile(data);

    expect(result).toEqual({
      error: "Validation failed: declaration is incomplete.",
    });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("calls upsert and redirects on valid submission", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockUpsert.mockResolvedValue({ error: null });

    const { saveProfile } = await import("../actions");
    const { redirect } = await import("next/navigation");

    // redirect throws NEXT_REDIRECT — that is the success path
    await expect(saveProfile(validFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(mockUpsert).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/candidate/disc-quiz");
  });

  it("returns DB error without redirecting when upsert fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockUpsert.mockResolvedValue({
      error: { message: "duplicate key value" },
    });

    const { saveProfile } = await import("../actions");
    const result = await saveProfile(validFormData());

    expect(result).toEqual({ error: "duplicate key value" });
  });
});
