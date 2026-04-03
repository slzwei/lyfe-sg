"use server";

import { headers } from "next/headers";
import { sendEmail } from "@/lib/email";
import { checkRateLimitAsync } from "@/lib/rate-limit";

const NOTIFY_TO = process.env.NOTIFY_EMAIL;
const NOTIFY_BCC = process.env.NOTIFY_BCC;

export async function submitContactForm(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const interest = (formData.get("interest") as string)?.trim();
  const message = (formData.get("message") as string)?.trim();

  if (!name || !email || !message) {
    return { success: false, error: "Please fill in all required fields." };
  }

  if (name.length > 255 || email.length > 255 || message.length > 10_000) {
    return { success: false, error: "Input too long." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Invalid email address." };
  }

  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  const { allowed } = await checkRateLimitAsync(`contact-form:${ip}`, 5, 3_600_000);
  if (!allowed) return { success: false, error: "Please wait before submitting again." };

  if (!NOTIFY_TO) {
    console.warn("[contact] NOTIFY_EMAIL env var not set — skipping notification");
    return { success: false, error: "Contact form not configured." };
  }

  const esc = (s: string) => s.replace(/[<>&"']/g, "");

  const result = await sendEmail({
    to: NOTIFY_TO,
    bcc: NOTIFY_BCC || undefined,
    subject: `Lyfe.sg enquiry from ${esc(name)}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:20px;max-width:600px;">
        <h2 style="color:#FF7600;margin-bottom:16px;">New Enquiry from lyfe.sg</h2>
        <table style="border-collapse:collapse;width:100%;">
          <tr><td style="padding:8px 12px;font-weight:600;color:#444;width:100px;">Name</td><td style="padding:8px 12px;">${esc(name)}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#444;">Email</td><td style="padding:8px 12px;">${esc(email)}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#444;">Interest</td><td style="padding:8px 12px;">${esc(interest || "Not specified")}</td></tr>
        </table>
        <div style="margin-top:16px;padding:16px;background:#f5f5f4;border-radius:8px;">
          <p style="margin:0;white-space:pre-wrap;">${esc(message)}</p>
        </div>
        <p style="color:#999;font-size:12px;margin-top:16px;">
          Received at ${new Date().toLocaleString("en-SG", { timeZone: "Asia/Singapore" })}
        </p>
      </div>
    `,
    text: `New enquiry from ${name} (${email})\nInterest: ${interest}\n\n${message}`,
  });

  if (!result.success) {
    console.error("[contact] Failed to send:", result.message);
    return { success: false, error: "Failed to send. Please try again." };
  }

  return { success: true };
}
