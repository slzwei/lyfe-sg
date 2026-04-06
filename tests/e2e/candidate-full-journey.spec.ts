import { test, expect } from "@playwright/test";
import { loginAsCandidate } from "./fixtures/auth";
import { OnboardingPage } from "./pages/OnboardingPage";
import { DiscQuizPage } from "./pages/DiscQuizPage";
import { DiscResultsPage } from "./pages/DiscResultsPage";
import { SignedOutPage } from "./pages/SignedOutPage";
import { createInvitation, deleteTestUser, adminClient } from "./fixtures/supabase-admin";
import { step1Data, step2Data, testEmail } from "./fixtures/test-data";

/**
 * Full end-to-end candidate journey (token-based auth):
 *   Invitation created → Candidate visits link → Auto-auth →
 *   Completes 6-step form → Takes DISC quiz → Views results → Signs out
 *
 * Serial — each test depends on the previous state.
 */
test.describe("Full Candidate Journey", () => {
  test.describe.configure({ mode: "serial", timeout: 180_000 });

  let inviteToken: string;
  let invitationId: string;
  let userId: string | null = null;
  const email = testEmail(`journey-${Date.now()}`);

  test.beforeAll(async () => {
    const inv = await createInvitation({ email, name: "Journey Test", position: "Full Stack Developer" });
    inviteToken = inv.token;
    invitationId = inv.id;
  });

  test.afterAll(async () => {
    if (userId) {
      await deleteTestUser(userId).catch((e) => console.error("cleanup failed:", e));
    }
  });

  test("1. Candidate opens invite link and auto-authenticates", async ({ page }) => {
    const landedUrl = await loginAsCandidate(page, inviteToken);
    expect(landedUrl).toContain("/candidate/onboarding");

    const onboarding = new OnboardingPage(page);
    await onboarding.expectLoaded();

    // Capture user_id for cleanup
    const { data: inv } = await adminClient
      .from("invitations")
      .select("user_id")
      .eq("id", invitationId)
      .single();
    userId = inv?.user_id ?? null;
  });

  test("2. Candidate completes 6-step onboarding form", async ({ page }) => {
    test.skip(!inviteToken, "No invitation from setup");

    await loginAsCandidate(page, inviteToken);
    if (page.url().includes("disc-quiz") || page.url().includes("disc-results")) return;

    const onboarding = new OnboardingPage(page);

    // Step 1: Personal Details
    await onboarding.fillStep1(step1Data());
    await onboarding.clickNext();
    await page.waitForTimeout(1500);

    // Step 2: NS & Emergency — check we're on step 2 by looking for section heading
    await expect(page.getByRole("heading", { name: "National Service" })).toBeVisible({ timeout: 5000 });
    await onboarding.fillStep2(step2Data());
    await onboarding.clickNext();
    await page.waitForTimeout(1000);

    // Steps 3-5: Click Next (minimal required fields)
    for (let step = 3; step <= 5; step++) {
      try {
        await onboarding.clickNext();
        await page.waitForTimeout(1000);
      } catch {
        break;
      }
    }

    // Step 6: Declaration
    await onboarding.fillStep6();
    await onboarding.clickNext();

    // Should redirect to disc-quiz
    await expect(page).toHaveURL(/\/candidate\/disc-quiz/, { timeout: 15_000 });
  });

  test("3. Candidate completes DISC quiz", async ({ page }) => {
    test.skip(!inviteToken, "No invitation from setup");

    await loginAsCandidate(page, inviteToken);

    if (page.url().includes("disc-results")) return;
    if (page.url().includes("onboarding")) {
      test.skip(true, "Form not yet completed");
      return;
    }

    const quiz = new DiscQuizPage(page);
    await quiz.completeEntireQuiz(email);

    await expect(page).toHaveURL(/\/candidate\/disc-results/, { timeout: 30_000 });
  });

  test("4. Candidate views DISC results and signs out", async ({ page }) => {
    test.skip(!inviteToken, "No invitation from setup");

    await loginAsCandidate(page, inviteToken);

    if (!page.url().includes("disc-results")) {
      test.skip(true, "Quiz not yet completed");
      return;
    }

    const results = new DiscResultsPage(page);
    await results.expectFullResultsDisplayed();
    await results.signOut();

    await expect(page).toHaveURL(/\/candidate\/signed-out/, { timeout: 10_000 });
    const signedOut = new SignedOutPage(page);
    await signedOut.expectLoaded();
  });
});
