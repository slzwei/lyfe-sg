import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: "Candidate Portal — Lyfe",
  description: "Apply and complete your onboarding with Lyfe.",
};

export default async function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const phone = user?.phone;
  const formatted = phone
    ? `+${phone.slice(0, 2)} ${phone.slice(2, 6)} ${phone.slice(6)}`
    : null;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-display text-2xl text-orange-500">
            Lyfe
          </Link>
          {formatted && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-stone-500">
                Logged in as{" "}
                <span className="font-medium text-stone-700">{formatted}</span>
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-lg px-2.5 py-1 text-xs font-medium text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
