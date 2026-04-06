import { test, expect } from "@playwright/test";
import { loginAsCandidate } from "./fixtures/auth";
import {
  createInvitation,
  completeProfile,
  deleteTestUser,
  getUserByPhone,
} from "./fixtures/supabase-admin";
import { DiscQuizPage } from "./pages/DiscQuizPage";
import { TEST_PHONES, testEmail } from "./fixtures/test-data";

test.describe("DISC Quiz Page", () => {
  test("redirects unauthenticated user to login", async ({ page }) => {
    await page.goto("/candidate/disc-quiz");
    await expect(page).toHaveURL(/\/candidate\/login/);
  });
});

test.describe("DISC Quiz - Authenticated with completed profile", () => {
  const phone = TEST_PHONES.candidate5.short;
  let inviteToken: string;
  let inviteId: string;

  test.beforeAll(async () => {
    // Clean up any existing user from previous test runs
    const existingUserId = await getUserByPhone(TEST_PHONES.candidate5.full);
    if (existingUserId) await deleteTestUser(existingUserId);

    // Create invitation
    const inv = await createInvitation({
      email: testEmail("disc-quiz"),
      name: "Quiz Tester",
      position: "Engineer",
    });
    inviteToken = inv.token;
    inviteId = inv.id;
  });

  test.afterAll(async () => {
    const userId = await getUserByPhone(TEST_PHONES.candidate5.full);
    if (userId) await deleteTestUser(userId);
    else {
      const { deleteInvitation } = await import("./fixtures/supabase-admin");
      await deleteInvitation(inviteId);
    }
  });

  test("shows intro screen with quiz info", async ({ page }) => {
    // First login to create the user
    await loginAsCandidate(page, inviteToken);

    // Get the user ID and complete their profile via admin
    const userId = await getUserByPhone(TEST_PHONES.candidate5.full);
    if (userId) await completeProfile(userId, inviteId);

    // Navigate to quiz page
    await page.goto("/candidate/disc-quiz");

    const quiz = new DiscQuizPage(page);
    await quiz.expectIntroScreen();
  });

  test("intro shows ~5 minutes and 38 questions", async ({ page }) => {
    await loginAsCandidate(page, inviteToken);
    await page.goto("/candidate/disc-quiz");

    await expect(page.locator("text=38 questions")).toBeVisible();
    await expect(page.locator("text=~5 minutes")).toBeVisible();
  });

  test("Continue to Quiz button starts the quiz", async ({ page }) => {
    await loginAsCandidate(page, inviteToken);
    await page.goto("/candidate/disc-quiz");

    const quiz = new DiscQuizPage(page);
    await quiz.startQuiz();

    // Should show step indicator with "Pairs 1"
    await quiz.expectQuizStep(1);
  });

  test("Step 1 shows word pair questions with 5 circular buttons", async ({ page }) => {
    await loginAsCandidate(page, inviteToken);
    await page.goto("/candidate/disc-quiz");

    const quiz = new DiscQuizPage(page);
    await quiz.startQuiz();

    // Each question should have circular buttons
    const questions = page.locator(".rounded-2xl.border.p-4");
    const count = await questions.count();
    expect(count).toBe(8); // Step 1 has 8 word pair questions

    // Each question should have 5 buttons (desktop layout)
    const firstQ = questions.first();
    const buttons = firstQ.locator('button[aria-label]');
    await expect(buttons).toHaveCount(5);
  });

  test("clicking Next without answering all shows error", async ({ page }) => {
    await loginAsCandidate(page, inviteToken);
    await page.goto("/candidate/disc-quiz");

    const quiz = new DiscQuizPage(page);
    await quiz.startQuiz();

    // Click Next without answering
    await quiz.nextButton.click();

    await quiz.expectErrorMessage("Please answer all questions before continuing.");
  });

  test("answering all questions enables Next", async ({ page }) => {
    await loginAsCandidate(page, inviteToken);
    await page.goto("/candidate/disc-quiz");

    const quiz = new DiscQuizPage(page);
    await quiz.startQuiz();

    // Answer all questions on step 1
    await quiz.answerAllCurrentQuestions();

    // Next should work (no error)
    await quiz.nextButton.click();

    // Should advance to step 2
    await quiz.expectQuizStep(2);
  });

  test("Step 5 shows scenario format with binary choices", async ({ page }) => {
    await loginAsCandidate(page, inviteToken);
    await page.goto("/candidate/disc-quiz");

    const quiz = new DiscQuizPage(page);
    await quiz.startQuiz();

    // Navigate to step 5
    for (let step = 1; step <= 4; step++) {
      await quiz.answerAllCurrentQuestions();
      await quiz.nextButton.click();
      await page.waitForTimeout(300);
    }

    // Step 5 should show scenario questions with option buttons
    await expect(page.locator("text=In a group, I am")).toBeVisible();
    // Each scenario has 2 option buttons
    const scenarioQ = page.locator(".rounded-2xl.border.p-4").first();
    const optionButtons = scenarioQ.locator("button");
    await expect(optionButtons).toHaveCount(2);
  });

  test("Step 5 has email input field", async ({ page }) => {
    await loginAsCandidate(page, inviteToken);
    await page.goto("/candidate/disc-quiz");

    const quiz = new DiscQuizPage(page);
    await quiz.startQuiz();

    // Navigate to step 5
    for (let step = 1; step <= 4; step++) {
      await quiz.answerAllCurrentQuestions();
      await quiz.nextButton.click();
      await page.waitForTimeout(300);
    }

    // Email input should be visible
    await expect(quiz.emailInput).toBeVisible();
    await expect(page.locator("text=Save my results to this email")).toBeVisible();
  });

  test("button shows See Results on step 5", async ({ page }) => {
    await loginAsCandidate(page, inviteToken);
    await page.goto("/candidate/disc-quiz");

    const quiz = new DiscQuizPage(page);
    await quiz.startQuiz();

    // Navigate to step 5
    for (let step = 1; step <= 4; step++) {
      await quiz.answerAllCurrentQuestions();
      await quiz.nextButton.click();
      await page.waitForTimeout(300);
    }

    await expect(quiz.seeResultsButton).toBeVisible();
  });

  test("disclaimer is shown on step 1", async ({ page }) => {
    await loginAsCandidate(page, inviteToken);
    await page.goto("/candidate/disc-quiz");

    const quiz = new DiscQuizPage(page);
    await quiz.startQuiz();

    await expect(page.locator("text=not a psychometric instrument")).toBeVisible();
  });
});
