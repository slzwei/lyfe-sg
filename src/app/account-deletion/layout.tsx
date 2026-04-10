import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Account Deletion | Lyfe",
  description: "Request deletion of your Lyfe account and associated data.",
};

export default function AccountDeletionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/60 to-white">
      {/* Header */}
      <header className="flex items-center justify-center px-4 py-6">
        <Image
          src="/lyfe-logo.png"
          alt="Lyfe"
          width={120}
          height={82}
          priority
        />
      </header>

      {/* Content */}
      <main className="mx-auto max-w-xl px-4 pb-12">
        {children}
      </main>
    </div>
  );
}
