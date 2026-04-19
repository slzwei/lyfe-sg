"use client";

import { broadcastProgress } from "@/lib/supabase/progress-broadcast";
import { useTransition } from "react";

export default function SignOutButton({
  userId,
  signOutAction,
}: {
  userId: string;
  signOutAction: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    broadcastProgress(userId, "signed-out");
    setTimeout(() => {
      startTransition(() => {
        signOutAction();
      });
    }, 200);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="rounded-xl border border-stone-200 bg-white px-6 py-2.5 text-sm font-medium text-stone-600 shadow-sm transition-colors hover:bg-stone-50 disabled:opacity-50"
    >
      {pending ? "Signing out..." : "Sign Out"}
    </button>
  );
}
