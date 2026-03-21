import { test, expect } from "@playwright/test";
import { staffTest } from "./fixtures/auth";
import { StaffInvitePage } from "./pages/StaffInvitePage";
import { CandidateLoginPage } from "./pages/CandidateLoginPage";
import { OTPVerifyPage } from "./pages/OTPVerifyPage";
import { inviteData, TEST_PHONES, TEST_OTP } from "./fixtures/test-data";

test.describe("Invitation Lifecycle", () => {
  staffTest("full lifecycle: create -> candidate opens link -> candidate sees welcome", async ({ staffPage, browser }) => {
    const invite = new StaffInvitePage(staffPage);
    const data = inviteData({ name: "Alice Tan", position: "Designer" });

    // 1. Staff sends invitation
    await invite.sendInvitation(data.email, data.name, data.position);
    await invite.expectSuccessMessage(data.email);

    // 2. Copy the invite link
    const link = await invite.copyInviteLink(data.email);
    expect(link).toContain("/candidate/login?token=");

    // 3. Open the link in a new browser context (separate session)
    const candidateContext = await browser.newContext();
    const candidatePage = await candidateContext.newPage();
    await candidatePage.goto(link);

    // 4. Candidate should see personalized welcome
    const login = new CandidateLoginPage(candidatePage);
    await login.expectWelcomeWithName("Alice Tan");
    await login.expectPositionText("Designer");

    await candidateContext.close();
  });

  staffTest("revoked invitation shows error to candidate", async ({ staffPage, browser }) => {
    const invite = new StaffInvitePage(staffPage);
    const data = inviteData({ name: "Bob Lee" });

    // 1. Send invitation
    await invite.sendInvitation(data.email, data.name);
    await invite.expectSuccessMessage(data.email);
    const link = await invite.copyInviteLink(data.email);

    // 2. Revoke it
    invite.acceptNextConfirm();
    await invite.clickCandidateAction(data.email, "Revoke");
    await staffPage.waitForTimeout(1500);

    // 3. Candidate opens the revoked link
    const candidateContext = await browser.newContext();
    const candidatePage = await candidateContext.newPage();
    await candidatePage.goto(link);

    const login = new CandidateLoginPage(candidatePage);
    // Should show invite-only gate with error
    await login.expectInviteOnly();
    await expect(login.errorMessage).toBeVisible();

    await candidateContext.close();
  });

  staffTest("candidate login flow: invite -> phone OTP -> verify", async ({ staffPage, browser }) => {
    const invite = new StaffInvitePage(staffPage);
    const data = inviteData({ name: "Charlie", position: "Engineer" });

    // 1. Send invitation
    await invite.sendInvitation(data.email, data.name, data.position);
    await invite.expectSuccessMessage(data.email);
    const link = await invite.copyInviteLink(data.email);

    // 2. Open link as candidate
    const candidateContext = await browser.newContext();
    const candidatePage = await candidateContext.newPage();
    await candidatePage.goto(link);

    const login = new CandidateLoginPage(candidatePage);
    await login.expectWelcomeWithName("Charlie");

    // 3. Enter test phone number
    await login.submitPhone(TEST_PHONES.candidate1.short);

    // 4. Should navigate to verify page
    await expect(candidatePage).toHaveURL(/\/candidate\/verify/);

    const verify = new OTPVerifyPage(candidatePage);
    await verify.expectLoaded();

    // 5. Enter test OTP
    await verify.enterOTP(TEST_OTP);

    // 6. Should be redirected to onboarding after successful verification
    await expect(candidatePage).toHaveURL(/\/candidate\/onboarding/, { timeout: 15_000 });

    await candidateContext.close();
  });

  staffTest("staff sees progress update after candidate logs in", async ({ staffPage, browser }) => {
    const invite = new StaffInvitePage(staffPage);
    const data = inviteData({ name: "Diana" });

    // Send invitation
    await invite.sendInvitation(data.email, data.name);
    await invite.expectSuccessMessage(data.email);
    const link = await invite.copyInviteLink(data.email);

    // Verify pending status
    const initialProgress = await invite.getCandidateProgress(data.email);
    expect(initialProgress.toLowerCase()).toContain("pending");

    // Candidate logs in
    const candidateContext = await browser.newContext();
    const candidatePage = await candidateContext.newPage();
    await candidatePage.goto(link);

    const login = new CandidateLoginPage(candidatePage);
    await login.submitPhone(TEST_PHONES.candidate2.short);
    await expect(candidatePage).toHaveURL(/\/candidate\/verify/);

    const verify = new OTPVerifyPage(candidatePage);
    await verify.enterOTP(TEST_OTP);
    await expect(candidatePage).toHaveURL(/\/candidate\/onboarding/, { timeout: 15_000 });

    // Wait for staff portal to pick up the change (via broadcast or poll)
    await staffPage.waitForTimeout(3000);
    await invite.refresh();

    // Progress should now show form step, not pending
    const updatedProgress = await invite.getCandidateProgress(data.email);
    expect(updatedProgress.toLowerCase()).not.toContain("pending");

    await candidateContext.close();
  });
});
