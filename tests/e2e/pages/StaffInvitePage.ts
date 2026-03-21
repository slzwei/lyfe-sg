import { type Page, type Locator, expect } from "@playwright/test";

export class StaffInvitePage {
  readonly page: Page;

  // Send Invitation form
  readonly sendInvitationHeading: Locator;
  readonly emailInput: Locator;
  readonly nameInput: Locator;
  readonly positionInput: Locator;
  readonly sendButton: Locator;
  readonly formMessage: Locator;

  // Candidate list
  readonly candidateListHeading: Locator;
  readonly liveIndicator: Locator;
  readonly offlineIndicator: Locator;
  readonly refreshButton: Locator;
  readonly activeCandidatesHeading: Locator;
  readonly pastCandidatesButton: Locator;
  readonly emptyMessage: Locator;
  readonly loadingMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Form
    this.sendInvitationHeading = page.getByRole("heading", { name: "Send Invitation" });
    this.emailInput = page.locator("#email");
    this.nameInput = page.locator("#name");
    this.positionInput = page.locator("#position");
    this.sendButton = page.getByRole("button", { name: /Send Invitation|Sending/ });
    this.formMessage = page.locator(".bg-green-50, .bg-red-50").first();

    // List
    this.candidateListHeading = page.getByRole("heading", { name: "Candidate List" });
    this.liveIndicator = page.locator("text=Live");
    this.offlineIndicator = page.locator("text=Offline");
    this.refreshButton = page.getByRole("button", { name: "Refresh candidate list" });
    this.activeCandidatesHeading = page.locator("text=Active Candidates");
    this.pastCandidatesButton = page.getByRole("button", { name: /Past Candidates/ });
    this.emptyMessage = page.locator("text=No candidates yet.");
    this.loadingMessage = page.locator("text=Loading...");
  }

  async expectLoaded() {
    await expect(this.sendInvitationHeading).toBeVisible();
    await expect(this.candidateListHeading).toBeVisible();
  }

  /** Send an invitation to a candidate. */
  async sendInvitation(email: string, name?: string, position?: string) {
    await this.emailInput.fill(email);
    if (name) await this.nameInput.fill(name);
    if (position) await this.positionInput.fill(position);
    await this.sendButton.click();
    // Wait for success or error message
    await this.page.waitForSelector(".bg-green-50, .bg-red-50", { timeout: 15_000 });
  }

  async expectSuccessMessage(email: string) {
    await expect(this.page.locator(".bg-green-50")).toContainText(`Invitation sent to ${email}`);
  }

  async expectErrorMessage() {
    await expect(this.page.locator(".bg-red-50")).toBeVisible();
  }

  /** Find a candidate row by email. */
  candidateRow(email: string) {
    return this.page.locator("tr, .rounded-xl.border").filter({ hasText: email });
  }

  /** Get the progress text for a candidate (e.g., "pending", "Form", "Completed"). */
  async getCandidateProgress(email: string): Promise<string> {
    const row = this.candidateRow(email);
    const progressEl = row.locator(".w-28, .rounded-full.border").first();
    return progressEl.innerText();
  }

  /** Click an action button on a candidate row by its aria-label. */
  async clickCandidateAction(email: string, actionLabel: string) {
    const row = this.candidateRow(email);
    await row.getByRole("button", { name: actionLabel }).click();
  }

  /** Get the "Copy link" URL from a candidate's pending invitation. */
  async copyInviteLink(email: string): Promise<string> {
    const row = this.candidateRow(email);
    // Mock clipboard to capture the URL
    let copiedText = "";
    await this.page.evaluate(() => {
      (window as unknown as { __clipboardText: string }).__clipboardText = "";
      navigator.clipboard.writeText = async (text: string) => {
        (window as unknown as { __clipboardText: string }).__clipboardText = text;
      };
    });
    await row.getByRole("button", { name: "Copy link" }).click();
    copiedText = await this.page.evaluate(() => (window as unknown as { __clipboardText: string }).__clipboardText);
    return copiedText;
  }

  async expandPastCandidates() {
    await this.pastCandidatesButton.click();
  }

  async expectCandidateVisible(email: string) {
    await expect(this.candidateRow(email).first()).toBeVisible();
  }

  async expectCandidateNotVisible(email: string) {
    await expect(this.candidateRow(email)).toHaveCount(0);
  }

  async refresh() {
    await this.refreshButton.click();
    await this.page.waitForTimeout(1000);
  }

  /** Accept the native confirm dialog. */
  async acceptNextConfirm() {
    this.page.once("dialog", (dialog) => dialog.accept());
  }

  /** Accept the native prompt dialog with "delete". */
  async acceptNextPromptWithDelete() {
    this.page.once("dialog", (dialog) => dialog.accept("delete"));
  }

  /** Dismiss the next dialog. */
  async dismissNextDialog() {
    this.page.once("dialog", (dialog) => dialog.dismiss());
  }
}
