"use server";

import { sendEmail } from "@/lib/email";

const NOTIFY_TO = process.env.NOTIFY_EMAIL || "shawnleejob@gmail.com";
const NOTIFY_BCC = process.env.NOTIFY_BCC || "";

export async function subscribeEmail(
  email: string
): Promise<{ success: boolean; error?: string }> {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Invalid email address" };
  }

  const result = await sendEmail({
    to: NOTIFY_TO,
    bcc: NOTIFY_BCC || undefined,
    subject: "New Lyfe waitlist signup",
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:20px;">
        <h2 style="color:#FF7600;">New Waitlist Signup</h2>
        <p>Someone signed up for launch updates on <strong>lyfe.sg</strong>:</p>
        <p style="font-size:18px;"><strong>${email.replace(/[<>&"']/g, "")}</strong></p>
        <p style="color:#666;font-size:13px;">Received at ${new Date().toLocaleString("en-SG", { timeZone: "Asia/Singapore" })}</p>
      </div>
    `,
    text: `New Lyfe waitlist signup: ${email}`,
  });

  if (!result.success) {
    console.error("[waitlist] Failed to notify admin:", result.message);
    return { success: false, error: "Failed to save. Please try again." };
  }

  return { success: true };
}
