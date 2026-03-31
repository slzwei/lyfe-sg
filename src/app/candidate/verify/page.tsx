import { redirect } from "next/navigation";

// OTP verification is no longer needed — candidates authenticate via invitation link.
// This redirect prevents broken bookmarks.
export default function VerifyPage() {
  redirect("/candidate/login");
}
