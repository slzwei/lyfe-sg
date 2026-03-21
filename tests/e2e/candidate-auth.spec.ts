import { test, expect } from "@playwright/test";
import { CandidateLoginPage } from "./pages/CandidateLoginPage";
import { OTPVerifyPage } from "./pages/OTPVerifyPage";
import { createInvitation, deleteInvitation } from "./fixtures/supabase-admin";
import { TEST_PHONES, TEST_OTP, testEmail } from "./fixtures/test-data";

test.describe("Candidate Login", () => {
  test("shows invite-only gate when no token provided", async ({ page }) => {
    const login = new CandidateLoginPage(page);
    await login.goto();
    await login.expectInviteOnly();
    // Phone input should not be visible
    await expect(login.phoneInput).not.toBeVisible();
  });

  test("shows error for invalid token", async ({ page }) => {
    const login = new CandidateLoginPage(page);
    await login.goto("invalid-token-abc123");

    // Wait for token validation
    await page.waitForTimeout(2000);
    await login.expectInviteOnly();
    await expect(login.errorMessage).toBeVisible();
  });

  test("shows unauthorized_role error from query param", async ({ page }) => {
    await page.goto("/candidate/login?error=unauthorized_role");
    const login = new CandidateLoginPage(page);
    await expect(login.errorMessage).toBeVisible();
    await expect(login.errorMessage).toContainText("candidates only");
  });

  test("Send OTP button is disabled until 8 digits entered", async ({ page }) => {
    // Create a real invitation to show the phone form
    const inv = await createInvitation({ email: testEmail("auth-disabled-btn") });

    const login = new CandidateLoginPage(page);
    await login.goto(inv.token);
    await login.expectWelcomeGeneric();

    // Button should be disabled with empty phone
    await login.expectSendOtpDisabled();

    // Enter only 4 digits — still disabled
    await login.enterPhone("8000");
    await login.expectSendOtpDisabled();

    // Enter full 8 digits — should be enabled
    await login.enterPhone("80000001");
    await login.expectSendOtpEnabled();

    await deleteInvitation(inv.id);
  });

  test("phone input only accepts digits", async ({ page }) => {
    const inv = await createInvitation({ email: testEmail("auth-digits") });

    const login = new CandidateLoginPage(page);
    await login.goto(inv.token);

    // Try typing letters — should be stripped
    await login.phoneInput.fill("abc12345");
    await expect(login.phoneInput).toHaveValue("12345");

    await deleteInvitation(inv.id);
  });

  test("shows personalized welcome when invitation has name", async ({ page }) => {
    const inv = await createInvitation({
      email: testEmail("auth-name"),
      name: "Alice",
      position: "Designer",
    });

    const login = new CandidateLoginPage(page);
    await login.goto(inv.token);

    await login.expectWelcomeWithName("Alice");
    await login.expectPositionText("Designer");

    await deleteInvitation(inv.id);
  });

  test("shows generic welcome when invitation has no name", async ({ page }) => {
    const inv = await createInvitation({ email: testEmail("auth-no-name") });

    const login = new CandidateLoginPage(page);
    await login.goto(inv.token);
    await login.expectWelcomeGeneric();

    await deleteInvitation(inv.id);
  });
});

test.describe("OTP Verification", () => {
  test("redirects to login when no phone in sessionStorage", async ({ page }) => {
    await page.goto("/candidate/verify");
    // Should redirect back to login
    await expect(page).toHaveURL(/\/candidate\/login/);
  });

  test("shows 6 OTP input boxes", async ({ page }) => {
    // Set sessionStorage before navigating
    await page.goto("/candidate/login");
    await page.evaluate(() => {
      sessionStorage.setItem("otp_phone", "+6580000001");
    });
    await page.goto("/candidate/verify");

    const verify = new OTPVerifyPage(page);
    await verify.expectLoaded();
    await expect(verify.otpInputs).toHaveCount(6);
  });

  test("displays masked phone number", async ({ page }) => {
    await page.goto("/candidate/login");
    await page.evaluate(() => {
      sessionStorage.setItem("otp_phone", "+6580000001");
    });
    await page.goto("/candidate/verify");

    const verify = new OTPVerifyPage(page);
    await verify.expectMaskedPhone("01");
  });

  test("OTP inputs auto-advance on digit entry", async ({ page }) => {
    await page.goto("/candidate/login");
    await page.evaluate(() => {
      sessionStorage.setItem("otp_phone", "+6580000001");
    });
    await page.goto("/candidate/verify");

    const verify = new OTPVerifyPage(page);
    await verify.expectLoaded();

    // Type first digit — focus should move to second input
    await verify.otpInputs.nth(0).press("5");
    await expect(verify.otpInputs.nth(1)).toBeFocused();

    await verify.otpInputs.nth(1).press("5");
    await expect(verify.otpInputs.nth(2)).toBeFocused();
  });

  test("backspace moves focus to previous input", async ({ page }) => {
    await page.goto("/candidate/login");
    await page.evaluate(() => {
      sessionStorage.setItem("otp_phone", "+6580000001");
    });
    await page.goto("/candidate/verify");

    const verify = new OTPVerifyPage(page);
    await verify.expectLoaded();

    // Fill first two, then backspace on empty third
    await verify.otpInputs.nth(0).press("5");
    await verify.otpInputs.nth(1).press("5");
    // Now on 3rd input, press backspace (empty) — should go back to 2nd
    await verify.otpInputs.nth(2).press("Backspace");
    await expect(verify.otpInputs.nth(1)).toBeFocused();
  });

  test("Use a different number link goes back to login", async ({ page }) => {
    await page.goto("/candidate/login");
    await page.evaluate(() => {
      sessionStorage.setItem("otp_phone", "+6580000001");
    });
    await page.goto("/candidate/verify");

    const verify = new OTPVerifyPage(page);
    await verify.changeNumberLink.click();
    await expect(page).toHaveURL(/\/candidate\/login/);
  });

  test("resend button has 60-second cooldown after click", async ({ page }) => {
    await page.goto("/candidate/login");
    await page.evaluate(() => {
      sessionStorage.setItem("otp_phone", "+6580000001");
    });
    await page.goto("/candidate/verify");

    const verify = new OTPVerifyPage(page);
    await verify.expectLoaded();

    // Initially should be available
    await verify.expectResendAvailable();

    // Click resend
    await verify.resendButton.click();

    // Should now show cooldown
    await verify.expectResendCooldown();
  });
});
