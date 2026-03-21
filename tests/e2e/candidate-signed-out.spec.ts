import { test, expect } from "@playwright/test";
import { SignedOutPage } from "./pages/SignedOutPage";

test.describe("Signed Out Page", () => {
  test("displays success checkmark and thank-you message", async ({ page }) => {
    // The signed-out page is public (no auth required)
    await page.goto("/candidate/signed-out");

    const signedOut = new SignedOutPage(page);
    await signedOut.expectLoaded();
  });

  test("shows green checkmark icon", async ({ page }) => {
    await page.goto("/candidate/signed-out");

    // Green checkmark SVG
    const checkmark = page.locator("svg.text-green-500");
    await expect(checkmark).toBeVisible();
  });

  test("shows close window message", async ({ page }) => {
    await page.goto("/candidate/signed-out");

    await expect(page.locator("text=You may close this window")).toBeVisible();
  });
});
