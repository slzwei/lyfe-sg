import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "eMock — Lyfe",
  description: "Practice quizzes for insurance exam preparation.",
};

export default function EmockLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-display text-2xl text-orange-500">
            Lyfe
          </Link>
          <span className="text-sm font-medium text-stone-400">eMock</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
