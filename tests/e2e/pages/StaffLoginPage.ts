import { type Page, type Locator, expect } from "@playwright/test";

export class StaffLoginPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Staff Login" });
    this.subtitle = page.locator("text=Enter the staff password to continue");
    this.passwordInput = page.locator("#secret");
    this.signInButton = page.getByRole("button", { name: /Sign In/ });
    this.errorMessage = page.locator(".bg-red-50");
  }

  async goto() {
    await this.page.goto("/staff/login");
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
    await expect(this.subtitle).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
  }

  async login(password: string) {
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async expectError() {
    await expect(this.errorMessage).toBeVisible();
  }

  async expectSignInDisabled() {
    await expect(this.signInButton).toBeDisabled();
  }

  async expectSignInEnabled() {
    await expect(this.signInButton).toBeEnabled();
  }
}
