import InviteClient from "./InviteClient";

export default function InvitePage() {
  // Auth is enforced by proxy.ts — no manual cookie check needed
  return <InviteClient />;
}
