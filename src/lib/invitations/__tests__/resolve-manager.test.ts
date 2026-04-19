import { describe, it, expect, vi } from "vitest";
import { resolveAssignedManagerId } from "../resolve-manager";

/**
 * Builds a mock admin client that returns different data per table, per
 * sequenced call. Each table key maps to a queue of `{ data, error }` results
 * consumed in order. Unmatched tables return `{ data: null, error: null }`.
 */
function mockAdmin(tables: Record<string, Array<{ data: unknown; error?: unknown }>>) {
  const queues: Record<string, Array<{ data: unknown; error?: unknown }>> = {};
  for (const [k, v] of Object.entries(tables)) queues[k] = [...v];

  function chain(table: string) {
    const result = queues[table]?.shift() ?? { data: null, error: null };
    const thenable = {
      then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
    };
    const methods: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const m of ["select", "eq", "order", "limit", "maybeSingle", "single"]) {
      methods[m] = vi.fn(() => Object.assign(thenable, methods));
    }
    methods.maybeSingle = vi.fn(() => Promise.resolve(result));
    methods.single = vi.fn(() => Promise.resolve(result));
    return Object.assign(thenable, methods);
  }

  return {
    from: vi.fn((table: string) => chain(table)),
  } as never; // cast — the helper only uses .from(...).select(...).eq(...).maybeSingle() etc.
}

describe("resolveAssignedManagerId", () => {
  it("accepts a valid preferred manager", async () => {
    const admin = mockAdmin({
      users: [{ data: { id: "mgr-1", role: "manager", is_active: true } }],
    });
    const result = await resolveAssignedManagerId(admin, "inviter-1", "mgr-1");
    expect(result).toEqual({ ok: true, managerId: "mgr-1" });
  });

  it("accepts a valid preferred director", async () => {
    const admin = mockAdmin({
      users: [{ data: { id: "dir-1", role: "director", is_active: true } }],
    });
    const result = await resolveAssignedManagerId(admin, "inviter-1", "dir-1");
    expect(result).toEqual({ ok: true, managerId: "dir-1" });
  });

  it("rejects a preferred manager that is inactive", async () => {
    const admin = mockAdmin({
      users: [{ data: { id: "mgr-1", role: "manager", is_active: false } }],
    });
    const result = await resolveAssignedManagerId(admin, "inviter-1", "mgr-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("not active");
  });

  it("rejects a preferred user that isn't manager/director (e.g. PA)", async () => {
    const admin = mockAdmin({
      users: [{ data: { id: "pa-1", role: "pa", is_active: true } }],
    });
    const result = await resolveAssignedManagerId(admin, "inviter-1", "pa-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("not a manager or director");
  });

  it("returns the inviter when they are a manager", async () => {
    const admin = mockAdmin({
      users: [{ data: { id: "mgr-1", role: "manager", is_active: true } }],
    });
    const result = await resolveAssignedManagerId(admin, "mgr-1", null);
    expect(result).toEqual({ ok: true, managerId: "mgr-1" });
  });

  it("returns the inviter when they are a director", async () => {
    const admin = mockAdmin({
      users: [{ data: { id: "dir-1", role: "director", is_active: true } }],
    });
    const result = await resolveAssignedManagerId(admin, "dir-1", null);
    expect(result).toEqual({ ok: true, managerId: "dir-1" });
  });

  it("routes a PA inviter to their assigned manager", async () => {
    const admin = mockAdmin({
      users: [{ data: { id: "pa-1", role: "pa", is_active: true } }],
      pa_manager_assignments: [{ data: { manager_id: "mgr-assigned" } }],
    });
    const result = await resolveAssignedManagerId(admin, "pa-1", null);
    expect(result).toEqual({ ok: true, managerId: "mgr-assigned" });
  });

  it("rejects a PA inviter with no manager assignment", async () => {
    const admin = mockAdmin({
      users: [{ data: { id: "pa-1", role: "pa", is_active: true } }],
      pa_manager_assignments: [{ data: null }],
    });
    const result = await resolveAssignedManagerId(admin, "pa-1", null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("not assigned to a manager");
      expect(result.error).toContain("contact an admin");
    }
  });

  it("falls back to the first active director when inviter is admin", async () => {
    const admin = mockAdmin({
      users: [
        // First lookup: inviter resolves to admin (not manager/director, not PA)
        { data: { id: "admin-1", role: "admin", is_active: true } },
        // Second lookup: director fallback
        { data: { id: "dir-fallback" } },
      ],
    });
    const result = await resolveAssignedManagerId(admin, "admin-1", null);
    expect(result).toEqual({ ok: true, managerId: "dir-fallback" });
  });

  it("returns error when no inviter and no director fallback exists", async () => {
    const admin = mockAdmin({
      users: [{ data: null }],
    });
    const result = await resolveAssignedManagerId(admin, null, null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("No manager or director available");
  });
});
