import { type Page, type Locator, expect } from "@playwright/test";

export class SignedOutPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly thankYouMessage: Locator;
  readonly checkmarkIcon: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "You have been signed out" });
    this.thankYouMessage = page.locator("text=Thank you for using the Lyfe Candidate Portal");
    this.checkmarkIcon = page.locator("svg.text-green-500");
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
    await expect(this.thankYouMessage).toBeVisible();
  }
}
