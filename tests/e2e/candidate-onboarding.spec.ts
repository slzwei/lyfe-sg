import { test, expect } from "@playwright/test";
import { loginAsCandidate } from "./fixtures/auth";
import { createInvitation, deleteTestUser, getUserByPhone } from "./fixtures/supabase-admin";
import { OnboardingPage } from "./pages/OnboardingPage";
import { TEST_PHONES, TEST_OTP, testEmail, step1Data } from "./fixtures/test-data";

test.describe("Candidate Onboarding Form", () => {
  test("redirects unauthenticated user to login", async ({ page }) => {
    await page.goto("/candidate/onboarding");
    await expect(page).toHaveURL(/\/candidate\/login/);
  });
});

test.describe("Onboarding Form - Authenticated", () => {
  const phone = TEST_PHONES.candidate4.short;
  let inviteToken: string;
  let inviteId: string;

  test.beforeAll(async () => {
    // Clean up any existing user from previous test runs
    const existingUserId = await getUserByPhone(TEST_PHONES.candidate4.full);
    if (existingUserId) await deleteTestUser(existingUserId);

    const inv = await createInvitation({
      email: testEmail("onboarding"),
      name: "Onboarding Tester",
      position: "QA Analyst",
    });
    inviteToken = inv.token;
    inviteId = inv.id;
  });

  test.afterAll(async () => {
    const userId = await getUserByPhone(TEST_PHONES.candidate4.full);
    if (userId) await deleteTestUser(userId);
    else {
      // If user was never created, just delete the invitation
      const { deleteInvitation } = await import("./fixtures/supabase-admin");
      await deleteInvitation(inviteId);
    }
  });

  test("shows Application Form heading after login", async ({ page }) => {
    await loginAsCandidate(page, inviteToken);
    const onboarding = new OnboardingPage(page);
    await onboarding.expectLoaded();
  });

  test("starts on Step 1 - Personal Particulars", async ({ page }) => {
    await loginAsCandidate(page, inviteToken);
    await expect(page.getByText("Personal Particulars")).toBeVisible();
  });

  test("pre-fills contact number from phone login", async ({ page }) => {
    await loginAsCandidate(page, inviteToken);
    // Contact number field should have the login phone number
    const contactField = page.locator('input[type="tel"]').first();
    await expect(contactField).toHaveValue(/80000004/);
  });

  test("pre-fills name and position from invitation", async ({ page }) => {
    await loginAsCandidate(page, inviteToken);
    // Should have "Onboarding Tester" pre-filled in full_name
    const nameInput = page.locator('label:has-text("Full Name") + input, label:has-text("Full Name") ~ input').first();
    // The full_name field should be pre-filled
    await expect(page.locator('input').filter({ hasText: /Onboarding Tester/ }).or(page.locator('input[value="Onboarding Tester"]'))).toHaveCount(1);
  });

  test("shows validation errors when clicking Next on empty step 1", async ({ page }) => {
    await loginAsCandidate(page, inviteToken);
    const onboarding = new OnboardingPage(page);

    // Clear required fields that might be pre-filled
    const positionInput = page.locator('label:has-text("Position Applied") ~ input, label:has-text("Position Applied") + input').first();
    await positionInput.clear().catch(() => {});

    await onboarding.clickNext();

    // Should show validation errors
    await onboarding.expectValidationErrors();
  });

  test("Back button is invisible on step 1", async ({ page }) => {
    await loginAsCandidate(page, inviteToken);
    const onboarding = new OnboardingPage(page);

    // Back button should not be visible (disabled:invisible class)
    await expect(onboarding.backButton).not.toBeVisible();
  });

  test("step indicator shows 6 steps", async ({ page }) => {
    await loginAsCandidate(page, inviteToken);
    // The StepIndicator should show labels for all 6 steps
    const labels = ["Personal", "NS & Emergency", "Education", "Skills", "Employment", "Declaration"];
    for (const label of labels) {
      await expect(page.locator(`text=${label}`).first()).toBeVisible();
    }
  });

  test("postal code auto-fills address from OneMap API", async ({ page }) => {
    await loginAsCandidate(page, inviteToken);

    // Enter a known postal code
    const postalInput = page.locator('input[placeholder="e.g. 570187"]');
    await postalInput.fill("570187");

    // Wait for auto-lookup
    await page.waitForTimeout(2000);

    // Block and street should be auto-filled (read-only fields)
    const blockInput = page.locator('label:has-text("Block") ~ input, label:has-text("Block") + input').first();
    await expect(blockInput).not.toHaveValue("");
  });

  test("can navigate to step 2 with valid step 1 data", async ({ page }) => {
    await loginAsCandidate(page, inviteToken);
    const onboarding = new OnboardingPage(page);

    await onboarding.fillStep1(step1Data());
    await onboarding.clickNext();

    // Should advance to step 2
    await page.waitForTimeout(500);
    await expect(page.getByText("Emergency Contact")).toBeVisible();
  });

  test("can navigate back from step 2 to step 1", async ({ page }) => {
    await loginAsCandidate(page, inviteToken);
    const onboarding = new OnboardingPage(page);

    await onboarding.fillStep1(step1Data());
    await onboarding.clickNext();
    await page.waitForTimeout(500);

    // Click back
    await onboarding.clickBack();
    await page.waitForTimeout(500);

    // Should be back on step 1
    await expect(page.getByText("Personal Particulars")).toBeVisible();
  });

  test("step 6 shows declaration checkbox and Yes/No questions", async ({ page }) => {
    // This requires navigating through all steps, which is complex.
    // We test the declaration UI directly by verifying the component structure.
    test.skip(); // Full flow tested in candidate-full-journey
  });

  test("button shows Submit & Continue on step 6", async ({ page }) => {
    test.skip(); // Full flow tested in candidate-full-journey
  });
});
