import { test, expect } from "@playwright/test";
import { loginAsCandidate } from "./fixtures/auth";
import {
  createInvitation,
  completeProfile,
  completeQuiz,
  deleteTestUser,
  getUserByPhone,
} from "./fixtures/supabase-admin";
import { TEST_PHONES, testEmail } from "./fixtures/test-data";

/**
 * Tests that all protected routes redirect unauthenticated users correctly.
 */
test.describe("Route Guards - Candidate Portal (unauthenticated)", () => {
  test("/candidate/onboarding -> /candidate/login", async ({ page }) => {
    await page.goto("/candidate/onboarding");
    await expect(page).toHaveURL(/\/candidate\/login/);
  });

  test("/candidate/disc-quiz -> /candidate/login", async ({ page }) => {
    await page.goto("/candidate/disc-quiz");
    await expect(page).toHaveURL(/\/candidate\/login/);
  });

  test("/candidate/disc-results -> /candidate/login", async ({ page }) => {
    await page.goto("/candidate/disc-results");
    await expect(page).toHaveURL(/\/candidate\/login/);
  });

  test("/candidate/signed-out is publicly accessible", async ({ page }) => {
    await page.goto("/candidate/signed-out");
    await expect(page).toHaveURL(/\/candidate\/signed-out/);
    await expect(page.getByRole("heading", { name: "You have been signed out" })).toBeVisible();
  });

  test("/candidate/login is publicly accessible", async ({ page }) => {
    await page.goto("/candidate/login");
    await expect(page).toHaveURL(/\/candidate\/login/);
  });
});

test.describe("Route Guards - Staff Portal", () => {
  test("/staff/invite -> /staff/login (unauthenticated)", async ({ page }) => {
    await page.goto("/staff/invite");
    await expect(page).toHaveURL(/\/staff\/login/);
  });

  test("/staff/login is publicly accessible", async ({ page }) => {
    await page.goto("/staff/login");
    await expect(page).toHaveURL(/\/staff\/login/);
    await expect(page.getByRole("heading", { name: "Staff Login" })).toBeVisible();
  });
});

test.describe("Route Guards - Candidate Flow Redirects (authenticated)", () => {
  const phone = TEST_PHONES.candidate1.short;
  let inviteToken: string;
  let inviteId: string;

  test.beforeAll(async () => {
    const existingUserId = await getUserByPhone(TEST_PHONES.candidate1.full);
    if (existingUserId) await deleteTestUser(existingUserId);

    const inv = await createInvitation({
      email: testEmail("route-guards"),
      name: "Route Guard Tester",
    });
    inviteToken = inv.token;
    inviteId = inv.id;
  });

  test.afterAll(async () => {
    const userId = await getUserByPhone(TEST_PHONES.candidate1.full);
    if (userId) await deleteTestUser(userId);
    else {
      const { deleteInvitation } = await import("./fixtures/supabase-admin");
      await deleteInvitation(inviteId);
    }
  });

  test("incomplete profile: /candidate/disc-quiz -> /candidate/onboarding", async ({ page }) => {
    await loginAsCandidate(page, inviteToken, phone);

    // Profile is not completed yet, quiz page should redirect to onboarding
    await page.goto("/candidate/disc-quiz");
    await expect(page).toHaveURL(/\/candidate\/onboarding/);
  });

  test("completed profile, no quiz: /candidate/disc-results -> /candidate/disc-quiz", async ({ page }) => {
    await loginAsCandidate(page, inviteToken, phone);

    // Complete profile via admin
    const userId = await getUserByPhone(TEST_PHONES.candidate1.full);
    if (userId) await completeProfile(userId, inviteId);

    // Results page should redirect to quiz (no results yet)
    await page.goto("/candidate/disc-results");
    await expect(page).toHaveURL(/\/candidate\/disc-quiz/);
  });

  test("completed quiz: /candidate/onboarding -> /candidate/disc-quiz (already done)", async ({ page }) => {
    await loginAsCandidate(page, inviteToken, phone);

    // Complete quiz via admin
    const userId = await getUserByPhone(TEST_PHONES.candidate1.full);
    if (userId) await completeQuiz(userId);

    // Onboarding page should redirect (profile already completed)
    await page.goto("/candidate/onboarding");
    await expect(page).toHaveURL(/\/candidate\/disc-(quiz|results)/);
  });

  test("completed quiz: /candidate/disc-quiz -> /candidate/disc-results", async ({ page }) => {
    await loginAsCandidate(page, inviteToken, phone);

    // Quiz page should redirect to results (already has results)
    await page.goto("/candidate/disc-quiz");
    await expect(page).toHaveURL(/\/candidate\/disc-results/);
  });
});
