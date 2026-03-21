import { type Page, type Locator, expect } from "@playwright/test";

export class CandidateLoginPage {
  readonly page: Page;
  readonly phoneInput: Locator;
  readonly sendOtpButton: Locator;
  readonly errorMessage: Locator;
  readonly inviteOnlyHeading: Locator;
  readonly verifyingText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.phoneInput = page.locator("#phone");
    this.sendOtpButton = page.getByRole("button", { name: /Send OTP/ });
    this.errorMessage = page.locator(".bg-red-50");
    this.inviteOnlyHeading = page.getByRole("heading", { name: "Invite Only" });
    this.verifyingText = page.locator("text=Verifying invitation");
  }

  async goto(token?: string) {
    const url = token ? `/candidate/login?token=${token}` : "/candidate/login";
    await this.page.goto(url);
  }

  async enterPhone(shortNumber: string) {
    await this.phoneInput.fill(shortNumber);
  }

  async submitPhone(shortNumber: string) {
    await this.enterPhone(shortNumber);
    await this.sendOtpButton.click();
  }

  async expectWelcomeWithName(name: string) {
    await expect(this.page.getByRole("heading", { name: `Hi ${name}` })).toBeVisible();
  }

  async expectWelcomeGeneric() {
    await expect(this.page.getByRole("heading", { name: "Welcome" })).toBeVisible();
  }

  async expectInviteOnly() {
    await expect(this.inviteOnlyHeading).toBeVisible();
  }

  async expectPositionText(position: string) {
    await expect(this.page.locator("text=" + position)).toBeVisible();
  }

  async expectSendOtpDisabled() {
    await expect(this.sendOtpButton).toBeDisabled();
  }

  async expectSendOtpEnabled() {
    await expect(this.sendOtpButton).toBeEnabled();
  }
}
