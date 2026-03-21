import { type Page, type Locator, expect } from "@playwright/test";

export class OTPVerifyPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly otpInputs: Locator;
  readonly resendButton: Locator;
  readonly changeNumberLink: Locator;
  readonly errorMessage: Locator;
  readonly verifyingText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Enter verification code" });
    this.otpInputs = page.locator('input[inputmode="numeric"][maxlength="1"]');
    this.resendButton = page.getByRole("button", { name: /Resend code/ });
    this.changeNumberLink = page.getByRole("button", { name: "Use a different number" });
    this.errorMessage = page.locator(".bg-red-50");
    this.verifyingText = page.locator("text=Verifying");
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
    await expect(this.otpInputs).toHaveCount(6);
  }

  /** Enter OTP digits one by one. Auto-submits on 6th digit. */
  async enterOTP(code: string) {
    for (let i = 0; i < code.length; i++) {
      await this.otpInputs.nth(i).fill(code[i]);
    }
  }

  /** Paste a full OTP code into the first input. */
  async pasteOTP(code: string) {
    await this.otpInputs.first().focus();
    await this.page.evaluate((text) => {
      const dt = new DataTransfer();
      dt.setData("text/plain", text);
      const event = new ClipboardEvent("paste", { clipboardData: dt, bubbles: true });
      document.activeElement?.dispatchEvent(event);
    }, code);
  }

  async expectMaskedPhone(lastTwoDigits: string) {
    await expect(this.page.locator(`text=•••• ${lastTwoDigits}`)).toBeVisible();
  }

  async expectResendCooldown() {
    await expect(this.resendButton).toContainText(/Resend code in \d+s/);
  }

  async expectResendAvailable() {
    await expect(this.resendButton).toContainText("Resend code");
    await expect(this.resendButton).not.toContainText(/\d+s/);
  }

  async expectErrorVisible() {
    await expect(this.errorMessage).toBeVisible();
  }

  async expectInputsDisabled() {
    for (let i = 0; i < 6; i++) {
      await expect(this.otpInputs.nth(i)).toBeDisabled();
    }
  }
}
