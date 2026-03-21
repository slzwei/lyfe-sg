import { test, expect } from "@playwright/test";
import { loginAsCandidate } from "./fixtures/auth";
import {
  createInvitation,
  completeProfile,
  completeQuiz,
  deleteTestUser,
  getUserByPhone,
} from "./fixtures/supabase-admin";
import { DiscResultsPage } from "./pages/DiscResultsPage";
import { TEST_PHONES, testEmail } from "./fixtures/test-data";

test.describe("DISC Results Page", () => {
  test("redirects unauthenticated user to login", async ({ page }) => {
    await page.goto("/candidate/disc-results");
    await expect(page).toHaveURL(/\/candidate\/login/);
  });
});

test.describe("DISC Results - Full Display", () => {
  const phone = TEST_PHONES.candidate6.short;
  let inviteToken: string;
  let inviteId: string;

  test.beforeAll(async () => {
    // Clean up any existing user from previous test runs
    const existingUserId = await getUserByPhone(TEST_PHONES.candidate6.full);
    if (existingUserId) await deleteTestUser(existingUserId);

    // Create invitation
    const inv = await createInvitation({
      email: testEmail("disc-results"),
      name: "Results Viewer",
    });
    inviteToken = inv.token;
    inviteId = inv.id;
  });

  test.afterAll(async () => {
    const userId = await getUserByPhone(TEST_PHONES.candidate6.full);
    if (userId) await deleteTestUser(userId);
    else {
      const { deleteInvitation } = await import("./fixtures/supabase-admin");
      await deleteInvitation(inviteId);
    }
  });

  // Log in and set up the full state before tests
  async function setupAndNavigate(page: import("@playwright/test").Page) {
    await loginAsCandidate(page, inviteToken, phone);

    // Set up completed profile + quiz via admin
    const userId = await getUserByPhone(TEST_PHONES.candidate6.full);
    if (userId) {
      await completeProfile(userId, inviteId);
      await completeQuiz(userId);
    }

    await page.goto("/candidate/disc-results");
    // Verify we landed on results page (not redirected)
    await expect(page).toHaveURL(/\/candidate\/disc-results/);
  }

  test("shows Your DISC Profile label", async ({ page }) => {
    await setupAndNavigate(page);
    const results = new DiscResultsPage(page);
    await expect(results.profileLabel).toBeVisible();
  });

  test("shows DISC type name in hero card", async ({ page }) => {
    await setupAndNavigate(page);
    const results = new DiscResultsPage(page);
    await expect(results.typeName).toBeVisible();
    // The type name should be a non-empty heading
    const text = await results.typeName.innerText();
    expect(text.length).toBeGreaterThan(0);
  });

  test("shows motto in italics", async ({ page }) => {
    await setupAndNavigate(page);
    // The motto is an italic paragraph with quotes
    const motto = page.locator("p.italic").first();
    await expect(motto).toBeVisible();
  });

  test("shows descriptor pills", async ({ page }) => {
    await setupAndNavigate(page);
    const results = new DiscResultsPage(page);
    await results.expectDescriptorPills();
  });

  test("Personality Map chart is rendered", async ({ page }) => {
    await setupAndNavigate(page);
    const results = new DiscResultsPage(page);
    await expect(results.personalityMapHeading).toBeVisible();
    // Chart SVG or canvas should be present
    const chart = page.locator("svg, canvas").first();
    await expect(chart).toBeVisible();
  });

  test("Style Tendencies shows 4 score bars (D, I, S, C)", async ({ page }) => {
    await setupAndNavigate(page);
    const results = new DiscResultsPage(page);
    await expect(results.styleTendenciesHeading).toBeVisible();

    // All 4 dimensions should be shown
    for (const label of ["Drive", "Influence", "Support", "Clarity"]) {
      await expect(page.locator(`text=${label}`).first()).toBeVisible();
    }

    // Percentage values should be visible
    await expect(page.locator("text=52%").or(page.locator("text=46%").or(page.locator("text=58%")).or(page.locator("text=50%"))).first()).toBeVisible();
  });

  test("shows 50% midline label", async ({ page }) => {
    await setupAndNavigate(page);
    await expect(page.locator("text=50% midline")).toBeVisible();
  });

  test("Your Priorities section shows at least 3 cards", async ({ page }) => {
    await setupAndNavigate(page);
    const results = new DiscResultsPage(page);
    await expect(results.prioritiesHeading).toBeVisible();

    // Priority cards have a colored top border (h-1 div)
    const priorityCards = page.locator(".rounded-2xl.border.border-stone-100");
    const count = await priorityCards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("Strengths and Blind Spots sections are displayed", async ({ page }) => {
    await setupAndNavigate(page);
    const results = new DiscResultsPage(page);
    await expect(results.strengthsHeading).toBeVisible();
    await expect(results.blindSpotsHeading).toBeVisible();
  });

  test("Strengths has green styling, Blind Spots has amber", async ({ page }) => {
    await setupAndNavigate(page);
    // Green section
    const greenSection = page.locator(".border-emerald-100, .bg-emerald-50\\/50").first();
    await expect(greenSection).toBeVisible();
    // Amber section
    const amberSection = page.locator(".border-amber-100, .bg-amber-50\\/50").first();
    await expect(amberSection).toBeVisible();
  });

  test("Application Complete section is shown", async ({ page }) => {
    await setupAndNavigate(page);
    const results = new DiscResultsPage(page);
    await expect(results.completionHeading).toBeVisible();
    await expect(page.locator("text=Our team will review your profile")).toBeVisible();
  });

  test("Sign out button is present", async ({ page }) => {
    await setupAndNavigate(page);
    const results = new DiscResultsPage(page);
    await expect(results.signOutButton).toBeVisible();
  });

  test("disclaimer about personal reflection is shown", async ({ page }) => {
    await setupAndNavigate(page);
    const results = new DiscResultsPage(page);
    await expect(results.disclaimer).toBeVisible();
  });

  test("sign out redirects to signed-out page", async ({ page }) => {
    await setupAndNavigate(page);
    const results = new DiscResultsPage(page);
    await results.signOut();
    await expect(page).toHaveURL(/\/candidate\/signed-out/, { timeout: 10_000 });
  });
});
