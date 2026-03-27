// ─── Barrel re-exports ──────────────────────────────────────────────────────
// All exports preserved for backward compatibility.
// Consumers can gradually migrate to direct imports from actions/*.
// Note: "use server" is on each source file — not needed here.

export {
  staffLogin,
  staffSendOtp,
  staffVerifyOtp,
  staffLogout,
  requireStaff,
  getStaffUser,
  type StaffUser,
} from "./actions/auth";

export {
  sendInvite,
  listInvitations,
  getProgressForUser,
  revokeInvitation,
  resetApplication,
  resetQuiz,
  deleteCandidate,
  archiveInvitation,
  removeInviteFile,
  type Invitation,
  type InvitationProgress,
  type AttachedFile,
} from "./actions/invitations";

export {
  getPdfUrl,
  getInviteFileUrl,
  getCandidateDocUrl,
} from "./actions/storage-urls";

export { backfillPdfs } from "./actions/pdf-backfill";
