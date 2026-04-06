import { type NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import crypto from "crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendInteractiveButtons, sendTextMessage } from "@/lib/whatsapp";

// ─── GET: Meta verification handshake ────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) {
    return new Response("Forbidden", { status: 403 });
  }

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// ─── POST: Inbound messages from Meta ────────────────────────────────────────

function verifySignature(rawBody: string, signature: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return false;
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  const received = signature.replace("sha256=", "");
  if (expected.length !== received.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(received, "hex"),
  );
}

interface WhatsAppMessage {
  from: string;
  type: string;
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
  };
  button?: {
    payload: string;
    text: string;
  };
}

interface WhatsAppEntry {
  changes: Array<{
    value: {
      messages?: WhatsAppMessage[];
    };
  }>;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  // Return 200 immediately; process asynchronously
  after(async () => {
    try {
      const body = JSON.parse(rawBody);
      const entries: WhatsAppEntry[] = body.entry ?? [];

      for (const entry of entries) {
        for (const change of entry.changes) {
          const messages = change.value.messages;
          if (!messages) continue;

          for (const msg of messages) {
            const fromPhone = msg.from.replace(/\D/g, "");

            // Interactive button reply (from our sendInteractiveButtons messages)
            if (msg.type === "interactive" && msg.interactive?.button_reply) {
              const buttonId = msg.interactive.button_reply.id;
              console.log(`[whatsapp-webhook] Interactive button: ${buttonId} from ${fromPhone}`);

              if (buttonId === "CONFIRM_INTERVIEW") {
                await handleConfirm(fromPhone);
              } else if (buttonId === "RESCHEDULE_INTERVIEW" || buttonId === "CANCEL_INTERVIEW") {
                await sendTextMessage(
                  fromPhone,
                  "Please contact your PA or recruiter to reschedule or cancel your interview.",
                );
              }
              continue;
            }

            // Template Quick Reply button (from interview_scheduled_1 etc.)
            if (msg.type === "button" && msg.button) {
              const payload = msg.button.payload;
              console.log(`[whatsapp-webhook] Template button: "${payload}" from ${fromPhone}`);

              if (payload === "CONFIRM_INTERVIEW" || payload.toLowerCase().includes("confirm")) {
                await handleConfirm(fromPhone);
              }
              continue;
            }

            console.log(`[whatsapp-webhook] Unhandled message type: ${msg.type} from ${fromPhone}`);
          }
        }
      }
    } catch (err) {
      console.error("[whatsapp-webhook] Error processing message:", err);
    }
  });

  return NextResponse.json({ status: "ok" });
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleConfirm(phone: string) {
  const admin = getAdminClient();

  // Find candidate by phone — candidates.phone stores the number
  const { data: candidate } = await admin
    .from("candidates")
    .select("id, phone")
    .not("phone", "is", null)
    .limit(100);

  // Normalize and match phone digits
  const match = candidate?.find((c) => {
    const candidateDigits = (c.phone ?? "").replace(/\D/g, "");
    return candidateDigits === phone || candidateDigits === phone.replace(/^65/, "");
  });

  if (!match) {
    console.log(`[whatsapp-webhook] No candidate found for phone ${phone}`);
    return;
  }

  // Find the next unconfirmed scheduled interview
  const { data: interview } = await admin
    .from("interviews")
    .select("id")
    .eq("candidate_id", match.id)
    .eq("status", "scheduled")
    .is("confirmed_at", null)
    .gt("datetime", new Date().toISOString())
    .order("datetime", { ascending: true })
    .limit(1)
    .single();

  if (!interview) {
    console.log(`[whatsapp-webhook] No upcoming unconfirmed interview for candidate ${match.id}`);
    return;
  }

  // Mark confirmed
  const { error } = await admin
    .from("interviews")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("id", interview.id);

  if (error) {
    console.error(`[whatsapp-webhook] Failed to confirm interview ${interview.id}:`, error);
    return;
  }

  console.log(`[whatsapp-webhook] Interview ${interview.id} confirmed by ${phone}`);

  // Broadcast to staff UI so the Confirmed badge appears live
  const channel = admin.channel("interview-updates");
  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({
          type: "broadcast",
          event: "interview-confirmed",
          payload: { candidateId: match.id, interviewId: interview.id },
        }).then(() => {
          admin.removeChannel(channel);
          resolve();
        });
      }
    });
  });

  // Reply with follow-up options
  await sendInteractiveButtons(
    phone,
    "Your interview has been confirmed! If you need to make changes, please select an option below.",
    [
      { id: "RESCHEDULE_INTERVIEW", title: "Reschedule" },
      { id: "CANCEL_INTERVIEW", title: "Cancel Interview" },
    ],
  );
}
