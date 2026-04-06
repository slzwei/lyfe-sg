import { test as base, type Page } from "@playwright/test";
import { STAFF_PASSWORD } from "./test-data";

/**
 * Authenticate the staff portal by logging in via UI.
 */
export async function loginAsStaff(page: Page) {
  await page.goto("/staff/login");
  await page.locator("#secret").fill(STAFF_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("/staff/invite");
}

/**
 * Authenticate as a candidate by visiting the invite link.
 * Token-based auth — no phone/OTP step. The page auto-authenticates
 * and redirects to onboarding (or disc-quiz/disc-results if returning).
 */
export async function loginAsCandidate(
  page: Page,
  inviteToken: string,
): Promise<string> {
  // Capture console errors for debugging
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log(`[BROWSER] ${msg.text()}`);
  });
  page.on("pageerror", (err) => console.log(`[PAGE ERROR] ${err.message}`));

  await page.goto(`/candidate/login?token=${inviteToken}`);

  // Wait for auto-auth redirect OR error state
  await page.waitForURL(/\/candidate\/(onboarding|disc-quiz|disc-results)/, {
    timeout: 30_000,
  }).catch(async () => {
    // If redirect didn't happen, capture what we see
    const errorText = await page.locator(".bg-red-50").textContent().catch(() => null);
    const bodyText = await page.locator("body").innerText().catch(() => "");
    throw new Error(`Auth redirect failed. Error: ${errorText || "none"}. Page text: ${bodyText.slice(0, 300)}`);
  });

  return page.url();
}

/**
 * Extended test fixtures with pre-authenticated staff page.
 */
export const staffTest = base.extend<{ staffPage: Page }>({
  staffPage: async ({ page }, use) => {
    await loginAsStaff(page);
    await use(page);
  },
});
