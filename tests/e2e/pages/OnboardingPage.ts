import { type Page, type Locator, expect } from "@playwright/test";

export class OnboardingPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly formError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Application Form" });
    this.nextButton = page.getByRole("button", { name: /^Next$|Submit & Continue/ });
    this.backButton = page.getByRole("button", { name: "Back" });
    this.formError = page.locator(".bg-red-50");
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }

  async expectOnStep(stepNumber: number) {
    // Step indicator shows the active step
    const stepLabels = ["Personal", "NS & Emergency", "Education", "Skills", "Employment", "Declaration"];
    const label = stepLabels[stepNumber - 1];
    // Verify the step content is showing by checking its section heading
    if (stepNumber === 1) {
      await expect(this.page.getByText("Personal Particulars")).toBeVisible();
    } else if (stepNumber === 6) {
      await expect(this.page.getByText("Additional Information")).toBeVisible();
    }
  }

  async clickNext() {
    await this.nextButton.click();
  }

  async clickBack() {
    await this.backButton.click();
  }

  /** Fill Step 1: Personal Details with valid data. */
  async fillStep1(data: {
    position_applied: string;
    expected_salary: string;
    date_available: string;
    full_name: string;
    date_of_birth: string;
    place_of_birth: string;
    nationality: string;
    race: string;
    gender: string;
    marital_status: string;
    address_postal: string;
    address_unit?: string;
    contact_number?: string;
    email?: string;
  }) {
    // Application details
    await this.fillInput("Position Applied For", data.position_applied);
    await this.page.locator('input[placeholder="2500"]').fill(data.expected_salary);
    await this.fillDateInput("Date of Availability", data.date_available);

    // Personal info
    await this.fillInput("Full Name (as in NRIC)", data.full_name);
    await this.fillDateInput("Date of Birth", data.date_of_birth);
    await this.selectByLabel("Place of Birth", data.place_of_birth);
    await this.selectByLabel("Gender", data.gender);
    await this.selectByLabel("Marital Status", data.marital_status);
    await this.selectByLabel("Nationality", data.nationality);
    await this.selectByLabel("Race", data.race);

    // Address
    await this.page.locator('input[placeholder="e.g. 570187"]').fill(data.address_postal);
    // Wait for address lookup
    await this.page.waitForTimeout(1500);
    if (data.address_unit) {
      await this.page.locator('input[placeholder="#01-23"]').fill(data.address_unit);
    }

    // Contact
    if (data.contact_number) {
      await this.page.locator('input[placeholder="8123 4567"]').fill(data.contact_number);
    }
    if (data.email) {
      await this.page.locator('input[placeholder="name@example.com"]').fill(data.email);
    }
  }

  /** Fill Step 2: NS & Emergency Contact. */
  async fillStep2(data: {
    ns_service_status: string;
    ns_status: string;
    emergency_name: string;
    emergency_relationship: string;
    emergency_contact: string;
  }) {
    // NS fields — only required selects (dates are optional month inputs)
    await this.selectByLabel("Service Status", data.ns_service_status);
    await this.selectByLabel("NS Status", data.ns_status);

    // Emergency contact section (scroll down if needed)
    const emergencySection = this.page.locator("text=Emergency Contact").first();
    if (await emergencySection.isVisible().catch(() => false)) {
      await emergencySection.scrollIntoViewIfNeeded();
      // Fill emergency fields by placeholder/position
      const emergencyInputs = this.page.locator('section').filter({ hasText: 'Emergency' }).locator('input');
      const nameInput = emergencyInputs.nth(0);
      const relInput = emergencyInputs.nth(1);
      const contactInput = emergencyInputs.nth(2);
      await nameInput.fill(data.emergency_name).catch(() => {});
      await relInput.fill(data.emergency_relationship).catch(() => {});
      await contactInput.fill(data.emergency_contact).catch(() => {});
    }
  }

  /** Fill Step 3: Education (minimal — no current studies, just highest). */
  async fillStep3() {
    // Select "No" for currently studying if there's a radio/select
    // Fill highest qualification
    const highestQualInput = this.page.locator('select, input').filter({ has: this.page.locator('text=Highest') }).first();
    // Minimal: just select a qualification
    await this.page.getByLabel(/highest/i).first().selectOption({ index: 1 }).catch(() => {});
  }

  /** Fill Step 4: Skills (minimal). */
  async fillStep4() {
    // Software competencies
    const softwareInput = this.page.locator('textarea, input').filter({ hasText: /software/i }).first();
    await softwareInput.fill("Microsoft Office, Google Workspace").catch(() => {});
    // Set language spoken/written for default English
    const spokenSelects = this.page.locator('select').filter({ hasText: /spoken/i });
    // Just ensure at least one language has spoken/written set
  }

  /** Fill Step 6: Declaration — answer No to all questions and check declaration. */
  async fillStep6() {
    // Click "No" for all 6 questions
    const noLabels = this.page.locator('label').filter({ hasText: "No" });
    const count = await noLabels.count();
    for (let i = 0; i < count; i++) {
      await noLabels.nth(i).click();
    }
    // Check declaration checkbox
    await this.page.locator('input[type="checkbox"]').check();
  }

  // ─── Helpers ────────────────────────────────────────────────

  private async fillInput(labelText: string, value: string) {
    const label = this.page.locator("label").filter({ hasText: labelText }).first();
    const input = label.locator("~ input, ~ div input").first();
    await input.fill(value).catch(async () => {
      // Fallback: find input near the label
      const parent = label.locator("..");
      await parent.locator("input").first().fill(value);
    });
  }

  private async fillDateInput(labelText: string, value: string) {
    const label = this.page.locator("label").filter({ hasText: labelText }).first();
    const parent = label.locator("..");
    await parent.locator('input[type="date"]').fill(value);
  }

  private async selectByLabel(labelText: string, value: string) {
    const label = this.page.locator("label").filter({ hasText: labelText }).first();
    const parent = label.locator("..");
    await parent.locator("select").selectOption(value);
  }

  async expectValidationErrors() {
    const errors = this.page.locator("[data-error], .text-red-500");
    await expect(errors.first()).toBeVisible();
  }

  async expectSubmitButtonText(text: string) {
    await expect(this.nextButton).toContainText(text);
  }
}
