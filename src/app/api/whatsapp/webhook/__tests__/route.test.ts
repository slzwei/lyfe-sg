import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Track the after() promise so tests can await it
let afterDone: Promise<unknown> | undefined;

vi.mock("next/server", async () => {
  const actual = await vi.importActual("next/server");
  return {
    ...actual,
    after: vi.fn((fn: () => unknown) => {
      afterDone = Promise.resolve().then(fn);
    }),
  };
});

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

const mockSendInteractiveButtons = vi.fn().mockResolvedValue(true);
const mockSendTextMessage = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/whatsapp", () => ({
  sendInteractiveButtons: (...args: unknown[]) => mockSendInteractiveButtons(...args),
  sendTextMessage: (...args: unknown[]) => mockSendTextMessage(...args),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

const APP_SECRET = "test-app-secret";

function sign(body: string): string {
  return "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(body).digest("hex");
}

function makeWebhookPayload(buttonId: string, from = "6591234567") {
  return {
    entry: [{
      changes: [{
        value: {
          messages: [{
            from,
            type: "interactive",
            interactive: {
              type: "button",
              button_reply: { id: buttonId, title: "Confirm" },
            },
          }],
        },
      }],
    }],
  };
}

function postRequest(body: string, signature?: string | null): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (signature != null) headers["x-hub-signature-256"] = signature;
  return new Request("http://localhost:3000/api/whatsapp/webhook", {
    method: "POST",
    headers,
    body,
  });
}

function getRequest(params: Record<string, string>): Request {
  const url = new URL("http://localhost:3000/api/whatsapp/webhook");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString(), { method: "GET" });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("WhatsApp webhook", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockSendInteractiveButtons.mockResolvedValue(true);
    mockSendTextMessage.mockResolvedValue(true);
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "my-verify-token");
    vi.stubEnv("WHATSAPP_APP_SECRET", APP_SECRET);
  });

  describe("GET (verification)", () => {
    it("returns challenge when token matches", async () => {
      const { GET } = await import("../route");
      const res = await GET(getRequest({
        "hub.mode": "subscribe",
        "hub.verify_token": "my-verify-token",
        "hub.challenge": "challenge123",
      }) as import("next/server").NextRequest);

      expect(res.status).toBe(200);
      expect(await res.text()).toBe("challenge123");
    });

    it("returns 403 when token is wrong", async () => {
      const { GET } = await import("../route");
      const res = await GET(getRequest({
        "hub.mode": "subscribe",
        "hub.verify_token": "wrong-token",
        "hub.challenge": "challenge123",
      }) as import("next/server").NextRequest);

      expect(res.status).toBe(403);
    });

    it("returns 403 when WHATSAPP_VERIFY_TOKEN is not set", async () => {
      vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "");
      const { GET } = await import("../route");
      const res = await GET(getRequest({
        "hub.mode": "subscribe",
        "hub.verify_token": "",
        "hub.challenge": "challenge123",
      }) as import("next/server").NextRequest);

      expect(res.status).toBe(403);
    });
  });

  describe("POST (messages)", () => {
    it("returns 403 with invalid signature", async () => {
      const { POST } = await import("../route");
      const body = JSON.stringify(makeWebhookPayload("CONFIRM_INTERVIEW"));
      const res = await POST(postRequest(body, "sha256=invalidsig") as import("next/server").NextRequest);
      expect(res.status).toBe(403);
    });

    it("returns 403 when WHATSAPP_APP_SECRET is missing", async () => {
      vi.stubEnv("WHATSAPP_APP_SECRET", "");
      const { POST } = await import("../route");
      const body = JSON.stringify(makeWebhookPayload("CONFIRM_INTERVIEW"));
      const res = await POST(postRequest(body, sign(body)) as import("next/server").NextRequest);
      expect(res.status).toBe(403);
    });

    it("returns 200 for status updates (no messages)", async () => {
      const { POST } = await import("../route");
      const payload = { entry: [{ changes: [{ value: { statuses: [{}] } }] }] };
      const body = JSON.stringify(payload);
      const res = await POST(postRequest(body, sign(body)) as import("next/server").NextRequest);
      expect(res.status).toBe(200);
      expect(mockAdminFrom).not.toHaveBeenCalled();
    });

    it("handles CONFIRM_INTERVIEW: sets confirmed_at and sends reply", async () => {
      // Chain: from("candidates").select().not().limit() → { data, error }
      const candidateData = [{ id: "cand-1", phone: "+65 9123 4567" }];
      const candidateLimit = vi.fn().mockResolvedValue({ data: candidateData, error: null });
      const candidateNot = vi.fn().mockReturnValue({ limit: candidateLimit });
      const candidateSelect = vi.fn().mockReturnValue({ not: candidateNot });

      // Chain: from("interviews").select().eq().eq().is().gt().order().limit().single()
      const interviewSingle = vi.fn().mockResolvedValue({ data: { id: "int-1" }, error: null });
      const interviewLimit = vi.fn().mockReturnValue({ single: interviewSingle });
      const interviewOrder = vi.fn().mockReturnValue({ limit: interviewLimit });
      const interviewGt = vi.fn().mockReturnValue({ order: interviewOrder });
      const interviewIs = vi.fn().mockReturnValue({ gt: interviewGt });
      // eq is called twice: .eq("candidate_id", ...).eq("status", ...)
      const interviewEq = vi.fn()
        .mockReturnValueOnce({ eq: vi.fn().mockReturnValue({ is: interviewIs }) });
      const interviewSelect = vi.fn().mockReturnValue({ eq: interviewEq });

      // Chain: from("interviews").update().eq()
      const updateEq = vi.fn().mockResolvedValue({ error: null });
      const interviewUpdate = vi.fn().mockReturnValue({ eq: updateEq });

      let interviewCallCount = 0;
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === "candidates") return { select: candidateSelect };
        if (table === "interviews") {
          interviewCallCount++;
          if (interviewCallCount === 1) return { select: interviewSelect };
          return { update: interviewUpdate };
        }
        return {};
      });

      const { POST } = await import("../route");
      const body = JSON.stringify(makeWebhookPayload("CONFIRM_INTERVIEW"));
      const res = await POST(postRequest(body, sign(body)) as import("next/server").NextRequest);
      await afterDone;

      expect(res.status).toBe(200);
      expect(updateEq).toHaveBeenCalled();
      expect(mockSendInteractiveButtons).toHaveBeenCalledWith(
        "6591234567",
        expect.stringContaining("confirmed"),
        expect.arrayContaining([
          expect.objectContaining({ id: "RESCHEDULE_INTERVIEW" }),
          expect.objectContaining({ id: "CANCEL_INTERVIEW" }),
        ]),
      );
    });

    it("handles RESCHEDULE_INTERVIEW: sends contact PA message", async () => {
      const { POST } = await import("../route");
      const body = JSON.stringify(makeWebhookPayload("RESCHEDULE_INTERVIEW"));
      const res = await POST(postRequest(body, sign(body)) as import("next/server").NextRequest);
      await afterDone;

      expect(res.status).toBe(200);
      expect(mockSendTextMessage).toHaveBeenCalledWith(
        "6591234567",
        expect.stringContaining("contact"),
      );
    });

    it("handles CANCEL_INTERVIEW: sends contact PA message", async () => {
      const { POST } = await import("../route");
      const body = JSON.stringify(makeWebhookPayload("CANCEL_INTERVIEW"));
      const res = await POST(postRequest(body, sign(body)) as import("next/server").NextRequest);
      await afterDone;

      expect(res.status).toBe(200);
      expect(mockSendTextMessage).toHaveBeenCalledWith(
        "6591234567",
        expect.stringContaining("contact"),
      );
    });

    it("returns 200 with no crash when phone not found", async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === "candidates") {
          const limit = vi.fn().mockResolvedValue({
            data: [{ id: "cand-1", phone: "+65 8888 0000" }],
            error: null,
          });
          return { select: vi.fn().mockReturnValue({ not: vi.fn().mockReturnValue({ limit }) }) };
        }
        return {};
      });

      const { POST } = await import("../route");
      const body = JSON.stringify(makeWebhookPayload("CONFIRM_INTERVIEW", "6599999999"));
      const res = await POST(postRequest(body, sign(body)) as import("next/server").NextRequest);
      await afterDone;

      expect(res.status).toBe(200);
      expect(mockSendInteractiveButtons).not.toHaveBeenCalled();
    });
  });
});
