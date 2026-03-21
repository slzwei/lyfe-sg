import { type Page, type Locator, expect } from "@playwright/test";

export class DiscResultsPage {
  readonly page: Page;
  readonly profileLabel: Locator;
  readonly typeName: Locator;
  readonly motto: Locator;
  readonly personalityMapHeading: Locator;
  readonly styleTendenciesHeading: Locator;
  readonly prioritiesHeading: Locator;
  readonly strengthsHeading: Locator;
  readonly blindSpotsHeading: Locator;
  readonly completionHeading: Locator;
  readonly signOutButton: Locator;
  readonly disclaimer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.profileLabel = page.locator("text=Your DISC Profile");
    this.typeName = page.locator("h1").first();
    this.motto = page.locator("p.italic, p:has-text('\"')").first();
    this.personalityMapHeading = page.locator("text=Personality Map");
    this.styleTendenciesHeading = page.locator("text=Style Tendencies");
    this.prioritiesHeading = page.locator("text=Your Priorities");
    this.strengthsHeading = page.getByRole("heading", { name: "Strengths" });
    this.blindSpotsHeading = page.getByRole("heading", { name: "Blind Spots" });
    this.completionHeading = page.getByRole("heading", { name: "Application Complete" });
    this.signOutButton = page.getByRole("button", { name: /Sign out|Sign Out/ });
    this.disclaimer = page.locator("text=personal reflection only");
  }

  async expectFullResultsDisplayed() {
    await expect(this.profileLabel).toBeVisible();
    await expect(this.typeName).toBeVisible();
    await expect(this.personalityMapHeading).toBeVisible();
    await expect(this.styleTendenciesHeading).toBeVisible();
    await expect(this.prioritiesHeading).toBeVisible();
    await expect(this.completionHeading).toBeVisible();
  }

  async expectScoresBarsVisible() {
    // Should have 4 score bars (D, I, S, C)
    const labels = ["Drive", "Influence", "Support", "Clarity"];
    for (const label of labels) {
      await expect(this.page.locator(`text=${label}`).first()).toBeVisible();
    }
    // Percentage values should be visible
    const percentages = this.page.locator("text=/%$/");
    await expect(percentages.first()).toBeVisible();
  }

  async expectPrioritiesVisible() {
    await expect(this.prioritiesHeading).toBeVisible();
    // Should show at least 3 priority cards
    const priorityCards = this.page.locator(".rounded-2xl.border.border-stone-100");
    const count = await priorityCards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  }

  async expectStrengthsAndBlindSpots() {
    await expect(this.strengthsHeading).toBeVisible();
    await expect(this.blindSpotsHeading).toBeVisible();
    // Both should have list items
    const strengthItems = this.page.locator(".bg-emerald-50\\/50 li, .border-emerald-100 li");
    const blindSpotItems = this.page.locator(".bg-amber-50\\/50 li, .border-amber-100 li");
    await expect(strengthItems.first()).toBeVisible();
    await expect(blindSpotItems.first()).toBeVisible();
  }

  async expectDescriptorPills() {
    // Descriptor tags are rendered as spans with rounded-full
    const pills = this.page.locator(".rounded-full.border.bg-white\\/70");
    const count = await pills.count();
    expect(count).toBeGreaterThan(0);
  }

  async signOut() {
    await this.signOutButton.click();
  }
}
