import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./components/LogoutButton";
import MobileNav from "./components/MobileNav";

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

  const name = (user?.user_metadata?.full_name as string) || user?.email || user?.phone;
  const role = user?.app_metadata?.role as string | undefined;
  const isAuthenticated = !!user && !!role;
  const isAdmin = role === "admin";

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="relative border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 md:max-w-4xl md:py-4">
          <Link href="/staff/dashboard" className="flex items-center gap-2.5">
            <span className="font-display text-2xl text-orange-500">Lyfe</span>
            <span className="text-2xl font-extralight text-stone-200">|</span>
            <span className="text-[11px] font-semibold uppercase leading-tight tracking-[0.05em] text-stone-500">Applicant<br />Tracking System</span>
          </Link>
          {isAuthenticated && (
            <>
              {/* Desktop nav */}
              <div className="hidden items-center gap-3 md:flex">
                <Link href="/staff/dashboard" className="rounded-lg px-3 py-1.5 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700">
                  Dashboard
                </Link>
                <Link href="/staff/candidates" className="rounded-lg px-3 py-1.5 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700">
                  Candidates
                </Link>
                <Link href="/staff/jobs" className="rounded-lg px-3 py-1.5 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700">
                  Job Postings
                </Link>
                <div className="text-right">
                  <div className="text-sm font-medium text-stone-700">{name}</div>
                  <div className="text-xs capitalize text-stone-400">{role}</div>
                </div>
                <LogoutButton />
              </div>
              {/* Mobile nav */}
              <MobileNav name={name || ""} role={role || ""} />
            </>
          )}
          {!isAuthenticated && (
            <span className="text-sm text-stone-500">Staff Portal</span>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl overflow-x-hidden px-4 py-6 md:max-w-4xl md:py-8">{children}</main>
    </div>
  );
}
