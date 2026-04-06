// ─── WhatsApp Cloud API utility ─────────────────────────────────────────────
// Pattern mirrors email.ts — cached config, graceful no-op when env vars missing.

const WA_API_VERSION = "v21.0";

function getConfig(): { token: string; phoneId: string } | null {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return null;
  return { token, phoneId };
}

/**
 * Strip `+`, remove non-digits, ensure `65` country code prefix.
 * WhatsApp API expects digits only with country code (e.g. `6591234567`).
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Already has SG country code
  if (digits.startsWith("65") && digits.length === 10) return digits;
  // 8-digit local number
  if (digits.length === 8) return `65${digits}`;
  return digits;
}

// ─── Internal API caller ────────────────────────────────────────────────────

async function callWhatsAppAPI(body: Record<string, unknown>, label: string): Promise<boolean> {
  const config = getConfig();
  if (!config) {
    console.log(`[whatsapp] Skipped (env vars not set): ${label}`);
    return false;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${WA_API_VERSION}/${config.phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`[whatsapp] ${label} failed (${res.status}): ${err}`);
      return false;
    }

    console.log(`[whatsapp] ${label} sent`);
    return true;
  } catch (err) {
    console.error(`[whatsapp] ${label} error:`, err);
    return false;
  }
}

// ─── Message senders ────────────────────────────────────────────────────────

/**
 * Send a WhatsApp template message. Returns false on failure (never throws).
 */
export async function sendTemplate(
  to: string,
  templateName: string,
  parameters: string[],
): Promise<boolean> {
  const phone = formatPhone(to);
  return callWhatsAppAPI({
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: parameters.map((text) => ({ type: "text", text })),
        },
      ],
    },
  }, `template:${templateName} to ${phone}`);
}

/**
 * Send an interactive button message. Max 3 buttons, title max 20 chars each.
 */
export async function sendInteractiveButtons(
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>,
): Promise<boolean> {
  const phone = formatPhone(to);
  return callWhatsAppAPI({
    messaging_product: "whatsapp",
    to: phone,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  }, `interactive to ${phone}`);
}

/**
 * Send a plain text message.
 */
export async function sendTextMessage(
  to: string,
  text: string,
): Promise<boolean> {
  const phone = formatPhone(to);
  return callWhatsAppAPI({
    messaging_product: "whatsapp",
    to: phone,
    type: "text",
    text: { body: text },
  }, `text to ${phone}`);
}

// ─── High-level senders ─────────────────────────────────────────────────────

/** Template: interview_scheduled_1 — {{1}}=name, {{2}}=date, {{3}}=time, {{4}}=location */
export async function sendInterviewScheduled(
  to: string | null,
  name: string,
  date: string,
  time: string,
  location: string,
): Promise<boolean> {
  if (!to) return false;
  return sendTemplate(to, "interview_scheduled_1", [name, date, time, location]);
}

/** Template: interview_updated — {{1}}=name, {{2}}=date, {{3}}=time, {{4}}=location */
export async function sendInterviewUpdated(
  to: string | null,
  name: string,
  date: string,
  time: string,
  location: string,
): Promise<boolean> {
  if (!to) return false;
  return sendTemplate(to, "interview_updated", [name, date, time, location]);
}

/** Template: interview_cancelled — {{1}}=name, {{2}}=date, {{3}}=time */
export async function sendInterviewCancelled(
  to: string | null,
  name: string,
  date: string,
  time: string,
): Promise<boolean> {
  if (!to) return false;
  return sendTemplate(to, "interview_cancelled", [name, date, time]);
}
