"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const navLinks = [
  { href: "#about", label: "About" },
  { href: "#services", label: "Services" },
  { href: "#join", label: "Join Us" },
  { href: "#contact", label: "Contact" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="flex h-18 items-center justify-between">
          <Link href="/" className="flex items-center gap-1">
            <span
              className="font-display text-[28px] text-orange-500"
              style={{ letterSpacing: "1px" }}
            >
              Lyfe
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[13px] font-semibold uppercase tracking-wider text-stone-500 hover:text-orange-500 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#contact"
              className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-all hover:shadow-lg hover:shadow-orange-500/25"
            >
              Get in Touch
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-stone-600"
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-stone-100">
          <div className="px-5 py-5 space-y-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-semibold text-stone-600 hover:text-orange-500 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#contact"
              onClick={() => setMobileOpen(false)}
              className="block w-full text-center rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Get in Touch
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
