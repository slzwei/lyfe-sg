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

const mockGetSignedPdfUrl = vi.fn();
const mockGetSignedResumeUrl = vi.fn();
const mockGetSignedDocUrl = vi.fn();
vi.mock("@/lib/supabase/storage", () => ({
  getSignedPdfUrl: (...args: unknown[]) => mockGetSignedPdfUrl(...args),
  getSignedResumeUrl: (...args: unknown[]) => mockGetSignedResumeUrl(...args),
  getSignedDocUrl: (...args: unknown[]) => mockGetSignedDocUrl(...args),
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
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "users") return buildChain({ id: `user-${role}`, full_name: `${role} User`, email: `${role}@test.com`, role });
    return buildChain();
  });
}

function mockNoAuth() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
  mockCookieGet.mockReturnValue(undefined);
}

// ─── Imports ────────────────────────────────────────────────────────────────

import { getPdfUrl, getInviteFileUrl, getCandidateDocUrl } from "../storage-urls";

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPdfUrl", () => {
  it("requires authentication", async () => {
    mockNoAuth();
    const result = await getPdfUrl("user/app.pdf");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Not authenticated");
  });

  it("returns signed URL on success", async () => {
    mockAuthUser("manager");
    mockGetSignedPdfUrl.mockResolvedValue("https://storage.example.com/signed-pdf");
    const result = await getPdfUrl("user-1/application.pdf");
    expect(result.success).toBe(true);
    expect(result.url).toBe("https://storage.example.com/signed-pdf");
  });

  it("returns error when signed URL generation fails", async () => {
    mockAuthUser("pa");
    mockGetSignedPdfUrl.mockResolvedValue(null);
    const result = await getPdfUrl("user-1/application.pdf");
    expect(result.success).toBe(false);
    expect(result.error).toContain("download URL");
  });
});

describe("getInviteFileUrl", () => {
  it("requires authentication", async () => {
    mockNoAuth();
    const result = await getInviteFileUrl("invitations/inv-1/docs/file.pdf");
    expect(result.success).toBe(false);
  });

  it("rejects invalid path prefix", async () => {
    mockAuthUser("manager");
    const result = await getInviteFileUrl("candidates/bad-path/file.pdf");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid file path");
  });

  it("returns signed URL for valid invite path", async () => {
    mockAuthUser("pa");
    mockGetSignedResumeUrl.mockResolvedValue("https://storage.example.com/signed-resume");
    const result = await getInviteFileUrl("invitations/inv-1/docs/file.pdf");
    expect(result.success).toBe(true);
    expect(result.url).toBe("https://storage.example.com/signed-resume");
  });

  it("returns error when signed URL generation fails", async () => {
    mockAuthUser("manager");
    mockGetSignedResumeUrl.mockResolvedValue(null);
    const result = await getInviteFileUrl("invitations/inv-1/docs/file.pdf");
    expect(result.success).toBe(false);
    expect(result.error).toContain("download URL");
  });
});

describe("getCandidateDocUrl", () => {
  it("requires authentication", async () => {
    mockNoAuth();
    const result = await getCandidateDocUrl("candidates/c-1/file.pdf");
    expect(result.success).toBe(false);
  });

  it("rejects invalid path prefix", async () => {
    mockAuthUser("manager");
    const result = await getCandidateDocUrl("invitations/bad-path/file.pdf");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid file path");
  });

  it("returns signed URL for valid candidate path", async () => {
    mockAuthUser("pa");
    mockGetSignedDocUrl.mockResolvedValue("https://storage.example.com/signed-doc");
    const result = await getCandidateDocUrl("candidates/c-1/file.pdf");
    expect(result.success).toBe(true);
    expect(result.url).toBe("https://storage.example.com/signed-doc");
  });

  it("returns error when signed URL generation fails", async () => {
    mockAuthUser("manager");
    mockGetSignedDocUrl.mockResolvedValue(null);
    const result = await getCandidateDocUrl("candidates/c-1/file.pdf");
    expect(result.success).toBe(false);
    expect(result.error).toContain("download URL");
  });
});
