"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { staffLogout } from "../actions";

const NAV_ITEMS = [
  { href: "/staff/dashboard", label: "Dashboard" },
  { href: "/staff/candidates", label: "Candidates" },
  { href: "/staff/jobs", label: "Job Postings" },
];

export default function MobileNav({ name, role, isAdmin }: { name: string; role: string; isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100"
        aria-label="Toggle menu"
      >
        {open ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 border-b border-stone-200 bg-white shadow-lg">
          <div className="mx-auto max-w-3xl px-4 py-3">
            <div className="mb-3 flex items-center gap-2 border-b border-stone-100 pb-3">
              <div>
                <div className="text-sm font-medium text-stone-700">{name}</div>
                <div className="text-xs capitalize text-stone-400">{role}</div>
              </div>
            </div>
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    pathname?.startsWith(item.href)
                      ? "bg-orange-50 text-orange-600"
                      : "text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/staff/audit"
                  onClick={() => setOpen(false)}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    pathname?.startsWith("/staff/audit")
                      ? "bg-orange-50 text-orange-600"
                      : "text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  Audit Log
                </Link>
              )}
            </nav>
            <div className="mt-3 border-t border-stone-100 pt-3">
              <button
                onClick={() => staffLogout()}
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-stone-500 transition-colors hover:bg-stone-50"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
