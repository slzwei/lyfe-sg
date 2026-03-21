import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./components/LogoutButton";

export const metadata: Metadata = {
  title: "Staff Portal — Lyfe",
  description: "Manage candidates and job postings.",
};

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const name = (user?.user_metadata?.full_name as string) || user?.email;
  const role = user?.app_metadata?.role as string | undefined;
  const isAuthenticated = !!user && !!role;
  const isAdmin = role === "admin";

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 md:max-w-4xl">
          <Link href="/staff/dashboard" className="font-display text-2xl text-orange-500">
            Lyfe
          </Link>
          {isAuthenticated && (
            <div className="flex items-center gap-3">
              <Link href="/staff/dashboard" className="rounded-lg px-3 py-1.5 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700">
                Dashboard
              </Link>
              <Link href="/staff/candidates" className="rounded-lg px-3 py-1.5 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700">
                Candidates
              </Link>
              <Link href="/staff/jobs" className="rounded-lg px-3 py-1.5 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700">
                Job Postings
              </Link>
              {isAdmin && (
                <Link href="/staff/team" className="rounded-lg px-3 py-1.5 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700">
                  Team
                </Link>
              )}
              <div className="text-right">
                <div className="text-sm font-medium text-stone-700">{name}</div>
                <div className="text-xs capitalize text-stone-400">{role}</div>
              </div>
              <LogoutButton />
            </div>
          )}
          {!isAuthenticated && (
            <span className="text-sm text-stone-500">Staff Portal</span>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 md:max-w-4xl">{children}</main>
    </div>
  );
}
