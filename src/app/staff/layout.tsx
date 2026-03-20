import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Staff Portal — Lyfe",
  description: "Manage candidate invitations.",
};

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const staffSession = cookieStore.get("staff_session")?.value;
  const isLoginPage =
    typeof children === "object" && children !== null; // always render children; check below

  // Protect all staff routes except /staff/login
  // We use a header trick: layout always renders, but non-login pages check
  // We'll check the path via a different mechanism — just check the cookie
  // If no session, the individual pages will redirect (layout can't know path easily)

  const isAuthenticated = !!staffSession && staffSession.length >= 32;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 md:max-w-4xl">
          <Link href="/staff/invite" className="font-display text-2xl text-orange-500">
            Lyfe
          </Link>
          {isAuthenticated && (
            <span className="text-sm text-stone-500">Staff Portal</span>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 md:max-w-4xl">{children}</main>
    </div>
  );
}
