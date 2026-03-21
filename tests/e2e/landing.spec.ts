import { test, expect } from "@playwright/test";
import { LandingPage } from "./pages/LandingPage";

test.describe("Landing Page", () => {
  test("displays logo, tagline, and email form", async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.expectLoaded();
    await expect(landing.emailInput).toBeVisible();
    await expect(landing.notifyButton).toBeVisible();
    await expect(landing.footer).toBeVisible();
  });

  test("submitting email shows confirmation message", async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();

    await landing.submitEmail("test@example.com");

    await expect(landing.confirmation).toBeVisible();
    // Email form should be replaced by confirmation
    await expect(landing.notifyButton).not.toBeVisible();
  });

  test("email field requires valid email format", async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();

    // The HTML5 required + type=email validation prevents submission of empty/invalid
    await expect(landing.emailInput).toHaveAttribute("required", "");
    await expect(landing.emailInput).toHaveAttribute("type", "email");
  });

  test("page has animated background elements", async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();

    // Gradient orbs should be present (they have radial-gradient styles)
    const orbs = page.locator(".rounded-full.opacity-20, .rounded-full.opacity-15, .rounded-full.opacity-5");
    const orbCount = await orbs.count();
    expect(orbCount).toBeGreaterThanOrEqual(2);
  });

  test("copyright shows current year", async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();

    const year = new Date().getFullYear().toString();
    await expect(page.locator(`text=${year}`)).toBeVisible();
  });
});
