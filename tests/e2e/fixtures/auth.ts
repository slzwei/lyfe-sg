import { test as base, type Page } from "@playwright/test";
import { STAFF_PASSWORD, TEST_OTP } from "./test-data";

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
 * Authenticate as a candidate by going through the invite → OTP UI flow.
 * Fast — uses test phone numbers that auto-verify (no real SMS).
 *
 * @param page - Playwright page
 * @param inviteToken - Valid invitation token (create via supabase-admin.createInvitation)
 * @param phone - 8-digit SG number (e.g. "80000001")
 * @returns The URL the page landed on after auth
 */
export async function loginAsCandidate(
  page: Page,
  inviteToken: string,
  phone: string,
  otp: string = TEST_OTP
): Promise<string> {
  await page.goto(`/candidate/login?token=${inviteToken}`);

  // Wait for token validation
  await page.waitForSelector("#phone", { timeout: 10_000 });

  // Enter phone and submit
  await page.locator("#phone").fill(phone);
  await page.getByRole("button", { name: "Send OTP" }).click();
  await page.waitForURL("/candidate/verify", { timeout: 10_000 });

  // Enter OTP digits
  const otpInputs = page.locator('input[inputmode="numeric"][maxlength="1"]');
  for (let i = 0; i < 6; i++) {
    await otpInputs.nth(i).fill(otp[i]);
  }

  // Wait for auth redirect (onboarding, disc-quiz, or disc-results)
  await page.waitForURL(/\/candidate\/(onboarding|disc-quiz|disc-results)/, {
    timeout: 15_000,
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
