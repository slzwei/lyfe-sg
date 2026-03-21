import { test, expect } from "@playwright/test";
import { staffTest } from "./fixtures/auth";
import { StaffInvitePage } from "./pages/StaffInvitePage";
import { inviteData, STAFF_PASSWORD } from "./fixtures/test-data";

test.describe("Staff Invite Page - Layout", () => {
  staffTest("displays send invitation form and candidate list", async ({ staffPage }) => {
    const invite = new StaffInvitePage(staffPage);
    await invite.expectLoaded();
  });

  staffTest("shows email field as required", async ({ staffPage }) => {
    const invite = new StaffInvitePage(staffPage);
    await expect(invite.emailInput).toHaveAttribute("required", "");
  });

  staffTest("Send Invitation button disabled when email is empty", async ({ staffPage }) => {
    const invite = new StaffInvitePage(staffPage);
    await expect(invite.sendButton).toBeDisabled();
  });

  staffTest("Send Invitation button enables when email is filled", async ({ staffPage }) => {
    const invite = new StaffInvitePage(staffPage);
    await invite.emailInput.fill("test@example.com");
    await expect(invite.sendButton).toBeEnabled();
  });

  staffTest("has refresh button", async ({ staffPage }) => {
    const invite = new StaffInvitePage(staffPage);
    await expect(invite.refreshButton).toBeVisible();
  });

  staffTest("shows connection status indicator", async ({ staffPage }) => {
    const invite = new StaffInvitePage(staffPage);
    // Should show either Live or Offline
    const liveOrOffline = staffPage.locator("text=Live").or(staffPage.locator("text=Offline"));
    await expect(liveOrOffline.first()).toBeVisible();
  });
});

test.describe("Staff Invite Page - Send Invitation", () => {
  staffTest("sends invitation with email only", async ({ staffPage }) => {
    const invite = new StaffInvitePage(staffPage);
    const data = inviteData({ name: undefined, position: undefined });

    await invite.sendInvitation(data.email);
    await invite.expectSuccessMessage(data.email);
  });

  staffTest("sends invitation with all fields", async ({ staffPage }) => {
    const invite = new StaffInvitePage(staffPage);
    const data = inviteData();

    await invite.sendInvitation(data.email, data.name, data.position);
    await invite.expectSuccessMessage(data.email);
  });

  staffTest("clears form after successful invitation", async ({ staffPage }) => {
    const invite = new StaffInvitePage(staffPage);
    const data = inviteData();

    await invite.sendInvitation(data.email, data.name, data.position);
    await invite.expectSuccessMessage(data.email);

    // Form fields should be cleared
    await expect(invite.emailInput).toHaveValue("");
    await expect(invite.nameInput).toHaveValue("");
    await expect(invite.positionInput).toHaveValue("");
  });

  staffTest("new invitation appears in candidate list", async ({ staffPage }) => {
    const invite = new StaffInvitePage(staffPage);
    const data = inviteData();

    await invite.sendInvitation(data.email, data.name, data.position);
    await invite.expectSuccessMessage(data.email);

    // Candidate should appear in the active list
    await invite.expectCandidateVisible(data.email);
  });

  staffTest("shows pending status for new invitation", async ({ staffPage }) => {
    const invite = new StaffInvitePage(staffPage);
    const data = inviteData();

    await invite.sendInvitation(data.email, data.name, data.position);
    await invite.expectSuccessMessage(data.email);

    const progressText = await invite.getCandidateProgress(data.email);
    expect(progressText.toLowerCase()).toContain("pending");
  });

  staffTest("prevents duplicate invitations to same email", async ({ staffPage }) => {
    const invite = new StaffInvitePage(staffPage);
    const data = inviteData();

    // Send first invitation
    await invite.sendInvitation(data.email, data.name, data.position);
    await invite.expectSuccessMessage(data.email);

    // Try to send again
    await invite.sendInvitation(data.email, data.name, data.position);
    await invite.expectErrorMessage();
  });
});

test.describe("Staff Invite Page - Candidate Actions", () => {
  staffTest("can copy invite link for pending candidate", async ({ staffPage }) => {
    const invite = new StaffInvitePage(staffPage);
    const data = inviteData();

    await invite.sendInvitation(data.email, data.name, data.position);
    await invite.expectSuccessMessage(data.email);

    const link = await invite.copyInviteLink(data.email);
    expect(link).toContain("/candidate/login?token=");
  });

  staffTest("can revoke a pending invitation", async ({ staffPage }) => {
    const invite = new StaffInvitePage(staffPage);
    const data = inviteData();

    await invite.sendInvitation(data.email, data.name, data.position);
    await invite.expectSuccessMessage(data.email);

    // Revoke
    invite.acceptNextConfirm();
    await invite.clickCandidateAction(data.email, "Revoke");

    // Wait for list refresh
    await staffPage.waitForTimeout(1500);

    // Status should change to revoked
    const progressText = await invite.getCandidateProgress(data.email);
    expect(progressText.toLowerCase()).toContain("revoked");
  });

  staffTest("cancel revoke dialog keeps invitation active", async ({ staffPage }) => {
    const invite = new StaffInvitePage(staffPage);
    const data = inviteData();

    await invite.sendInvitation(data.email, data.name, data.position);
    await invite.expectSuccessMessage(data.email);

    // Dismiss the confirm dialog
    invite.dismissNextDialog();
    await invite.clickCandidateAction(data.email, "Revoke");

    // Status should still be pending
    const progressText = await invite.getCandidateProgress(data.email);
    expect(progressText.toLowerCase()).toContain("pending");
  });

  staffTest("can archive a revoked invitation", async ({ staffPage }) => {
    const invite = new StaffInvitePage(staffPage);
    const data = inviteData();

    await invite.sendInvitation(data.email, data.name, data.position);
    await invite.expectSuccessMessage(data.email);

    // Revoke first
    invite.acceptNextConfirm();
    await invite.clickCandidateAction(data.email, "Revoke");
    await staffPage.waitForTimeout(1500);

    // Archive
    invite.acceptNextConfirm();
    await invite.clickCandidateAction(data.email, "Archive");
    await staffPage.waitForTimeout(1500);

    // Should no longer be in active list
    await invite.expectCandidateNotVisible(data.email);

    // Should be in Past Candidates
    await invite.expandPastCandidates();
    await invite.expectCandidateVisible(data.email);
  });

  staffTest("can delete a candidate permanently", async ({ staffPage }) => {
    const invite = new StaffInvitePage(staffPage);
    const data = inviteData();

    await invite.sendInvitation(data.email, data.name, data.position);
    await invite.expectSuccessMessage(data.email);

    // Delete
    invite.acceptNextPromptWithDelete();
    await invite.clickCandidateAction(data.email, "Delete");
    await staffPage.waitForTimeout(1500);

    // Should be gone from the list
    await invite.expectCandidateNotVisible(data.email);
  });

  staffTest("delete requires typing 'delete' to confirm", async ({ staffPage }) => {
    const invite = new StaffInvitePage(staffPage);
    const data = inviteData();

    await invite.sendInvitation(data.email, data.name, data.position);
    await invite.expectSuccessMessage(data.email);

    // Dismiss the prompt (or enter wrong text)
    invite.dismissNextDialog();
    await invite.clickCandidateAction(data.email, "Delete");
    await staffPage.waitForTimeout(1000);

    // Should still be visible
    await invite.expectCandidateVisible(data.email);
  });

  staffTest("refresh button reloads candidate list", async ({ staffPage }) => {
    const invite = new StaffInvitePage(staffPage);

    // Click refresh and verify it works without error
    await invite.refresh();
    await expect(invite.candidateListHeading).toBeVisible();
  });
});

test.describe("Staff Invite Page - Past Candidates", () => {
  staffTest("past candidates section is collapsible", async ({ staffPage }) => {
    const invite = new StaffInvitePage(staffPage);

    // Create and archive a candidate to have past candidates
    const data = inviteData();
    await invite.sendInvitation(data.email, data.name, data.position);
    await invite.expectSuccessMessage(data.email);

    // Revoke and archive
    invite.acceptNextConfirm();
    await invite.clickCandidateAction(data.email, "Revoke");
    await staffPage.waitForTimeout(1500);
    invite.acceptNextConfirm();
    await invite.clickCandidateAction(data.email, "Archive");
    await staffPage.waitForTimeout(1500);

    // Past candidates button should exist
    await expect(invite.pastCandidatesButton).toBeVisible();

    // Click to expand
    await invite.expandPastCandidates();
    await invite.expectCandidateVisible(data.email);
  });
});
