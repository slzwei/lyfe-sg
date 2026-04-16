import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

// ─── Import ─────────────────────────────────────────────────────────────────

import { updateSession } from "../proxy";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(path: string, cookies: Record<string, string> = {}) {
  const url = `http://localhost:3000${path}`;
  const req = new NextRequest(url);
  for (const [k, v] of Object.entries(cookies)) {
    req.cookies.set(k, v);
  }
  return req;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
});

describe("Staff route protection", () => {
  it("allows PA role to access /staff/dashboard", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { app_metadata: { role: "pa" } } },
    });
    const response = await updateSession(makeRequest("/staff/dashboard"));
    // Should NOT redirect (200 passthrough)
    expect(response.status).not.toBe(307);
  });

  it("allows manager role to access /staff/candidates", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { app_metadata: { role: "manager" } } },
    });
    const response = await updateSession(makeRequest("/staff/candidates"));
    expect(response.status).not.toBe(307);
  });

  it("allows director role to access staff routes", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { app_metadata: { role: "director" } } },
    });
    const response = await updateSession(makeRequest("/staff/jobs"));
    expect(response.status).not.toBe(307);
  });

  it("allows admin role to access staff routes", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { app_metadata: { role: "admin" } } },
    });
    const response = await updateSession(makeRequest("/staff/dashboard"));
    expect(response.status).not.toBe(307);
  });

  it("blocks candidate role from staff routes", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { app_metadata: { role: "candidate" } } },
    });
    const response = await updateSession(makeRequest("/staff/dashboard"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/staff/login");
  });

  it("redirects unauthenticated users to login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(makeRequest("/staff/dashboard"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/staff/login");
  });

  it("allows access to /staff/login without auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(makeRequest("/staff/login"));
    // Login page should NOT redirect to login
    expect(response.status).not.toBe(307);
  });

  it("ignores staff_session cookie and redirects unauthenticated users", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(
      makeRequest("/staff/dashboard", { staff_session: "a".repeat(32) })
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/staff/login");
  });
});

describe("Candidate route protection", () => {
  it("redirects unauthenticated users from protected candidate routes", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(makeRequest("/candidate/onboarding"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/candidate/login");
  });

  it("allows authenticated candidates to access candidate routes", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { app_metadata: { role: "candidate" } } },
    });
    const response = await updateSession(makeRequest("/candidate/onboarding"));
    expect(response.status).not.toBe(307);
  });

  it("blocks staff role from candidate routes", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { app_metadata: { role: "manager" } } },
    });
    const response = await updateSession(makeRequest("/candidate/onboarding"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("unauthorized_role");
  });

  it("redirects authenticated candidates away from login page", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { app_metadata: { role: "candidate" } } },
    });
    const response = await updateSession(makeRequest("/candidate/login"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/candidate/onboarding");
  });
});

describe("eMock route protection", () => {
  it("redirects unauthenticated users from /emock to login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(makeRequest("/emock"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/emock/login");
  });

  it("redirects unauthenticated users from /emock/m9 to login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(makeRequest("/emock/m9"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/emock/login");
  });

  it("allows unauthenticated access to /emock/login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(makeRequest("/emock/login"));
    expect(response.status).not.toBe(307);
  });

  it("allows unauthenticated access to /emock/verify", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(makeRequest("/emock/verify"));
    expect(response.status).not.toBe(307);
  });

  it("allows any authenticated user to access /emock", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { app_metadata: { role: "candidate" } } },
    });
    const response = await updateSession(makeRequest("/emock"));
    expect(response.status).not.toBe(307);
  });

  it("allows staff to access /emock", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { app_metadata: { role: "manager" } } },
    });
    const response = await updateSession(makeRequest("/emock/m9/set-a/take"));
    expect(response.status).not.toBe(307);
  });

  it("redirects authenticated users away from /emock/login", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { app_metadata: { role: "candidate" } } },
    });
    const response = await updateSession(makeRequest("/emock/login"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/emock");
  });

  it("redirects authenticated users away from /emock/verify", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { app_metadata: { role: "agent" } } },
    });
    const response = await updateSession(makeRequest("/emock/verify"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/emock");
  });
});

describe("Public routes", () => {
  it("allows access to non-protected routes without auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(makeRequest("/"));
    expect(response.status).not.toBe(307);
  });
});
