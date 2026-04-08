import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join Us | Lyfe",
  description: "Apply to join the Lyfe team. Complete your application and personality assessment.",
};

export default function JoinUsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/60 to-white">
      {/* Header */}
      <header className="flex items-center justify-center px-4 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-lg font-bold text-white">
            L
          </div>
          <span className="text-xl font-bold tracking-tight text-stone-800">Lyfe</span>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-xl px-4 pb-12">
        {children}
      </main>
    </div>
  );
}
