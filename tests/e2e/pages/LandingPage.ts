import { type Page, type Locator, expect } from "@playwright/test";

export class LandingPage {
  readonly page: Page;
  readonly logo: Locator;
  readonly tagline: Locator;
  readonly emailInput: Locator;
  readonly notifyButton: Locator;
  readonly confirmation: Locator;
  readonly footer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logo = page.locator("h1").filter({ hasText: "Lyfe" });
    this.tagline = page.locator("p").filter({ hasText: "Something great is brewing." });
    this.emailInput = page.locator('input[type="email"]');
    this.notifyButton = page.getByRole("button", { name: "Notify me" });
    this.confirmation = page.locator("text=We'll keep you posted.");
    this.footer = page.locator("text=Singapore");
  }

  async goto() {
    await this.page.goto("/");
  }

  async submitEmail(email: string) {
    await this.emailInput.fill(email);
    await this.notifyButton.click();
  }

  async expectLoaded() {
    await expect(this.logo).toBeVisible();
    await expect(this.tagline).toBeVisible();
  }
}
