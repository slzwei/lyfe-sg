import { type Page, type Locator, expect } from "@playwright/test";

export class DiscQuizPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly introTitle: Locator;
  readonly continueToQuizButton: Locator;
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly seeResultsButton: Locator;
  readonly errorMessage: Locator;
  readonly emailInput: Locator;
  readonly calculatingOverlay: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "DISC Personality Quiz" });
    this.introTitle = page.getByRole("heading", { name: "Almost There!" });
    this.continueToQuizButton = page.getByRole("button", { name: /Continue to Quiz/ });
    this.nextButton = page.getByRole("button", { name: "Next" });
    this.backButton = page.getByRole("button", { name: "Back" });
    this.seeResultsButton = page.getByRole("button", { name: "See Results" });
    this.errorMessage = page.locator(".bg-red-50");
    this.emailInput = page.locator('input[type="email"]');
    this.calculatingOverlay = page.locator(".fixed.inset-0");
  }

  async expectIntroScreen() {
    await expect(this.introTitle).toBeVisible();
    await expect(this.page.locator("text=38 questions")).toBeVisible();
    await expect(this.page.locator("text=~5 minutes")).toBeVisible();
  }

  async startQuiz() {
    await this.continueToQuizButton.click();
  }

  async expectQuizStep(stepNumber: number) {
    const labels = ["Pairs 1", "Pairs 2", "Pairs 3", "Ratings", "Scenarios"];
    // The step indicator should show the current step
    await expect(this.page.locator("text=" + labels[stepNumber - 1])).toBeVisible();
  }

  /**
   * Answer all questions on the current step by clicking the center option
   * (value 3 for Format A/B, option A for Format C).
   */
  async answerAllCurrentQuestions() {
    // Get the current step by checking which format is shown
    const scenarioButtons = this.page.locator("button").filter({ hasText: /Likely to|Getting things|Making the call|Motivating|Work I can|Evaluate/ });
    const isScenarioStep = await scenarioButtons.count() > 0;

    if (isScenarioStep) {
      // Format C: click the first option for each scenario
      const questions = this.page.locator(".rounded-2xl.border.p-4");
      const count = await questions.count();
      for (let i = 0; i < count; i++) {
        const q = questions.nth(i);
        // Click the first option button in each question
        await q.locator("button").first().click();
      }
    } else {
      // Format A or B: click the middle (3rd) circular button for each question
      const questions = this.page.locator(".rounded-2xl.border.p-4");
      const count = await questions.count();
      for (let i = 0; i < count; i++) {
        const q = questions.nth(i);
        const buttons = q.locator('button[aria-label]');
        const buttonCount = await buttons.count();

        if (buttonCount === 5) {
          // Format A (word pair) or Format B (single word): click middle button (index 2)
          await buttons.nth(2).click();
        } else if (buttonCount > 0) {
          await buttons.first().click();
        }
      }
    }
  }

  /**
   * Complete all 5 steps of the quiz, answering every question.
   * Starts from the intro screen.
   */
  async completeEntireQuiz(email?: string) {
    // Check if we're on intro screen
    const introVisible = await this.introTitle.isVisible().catch(() => false);
    if (introVisible) {
      await this.startQuiz();
    }

    // Steps 1-4: answer and click Next
    for (let step = 1; step <= 4; step++) {
      await this.answerAllCurrentQuestions();
      await this.nextButton.click();
      await this.page.waitForTimeout(300);
    }

    // Step 5: answer scenarios
    await this.answerAllCurrentQuestions();

    // Optionally enter email
    if (email) {
      await this.emailInput.fill(email);
    }

    // Submit
    await this.seeResultsButton.click();
  }

  async expectCalculatingOverlay() {
    await expect(this.calculatingOverlay).toBeVisible();
  }

  async expectErrorMessage(text?: string) {
    await expect(this.errorMessage).toBeVisible();
    if (text) {
      await expect(this.errorMessage).toContainText(text);
    }
  }
}
