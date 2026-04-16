"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { emockSignOut } from "./actions";

export default function EmockHeader({
  phone,
}: {
  phone: string | null;
}) {
  const router = useRouter();

  async function handleSignOut() {
    await emockSignOut();
    router.push("/emock/login");
  }

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-display text-2xl text-orange-500">
            Lyfe
          </Link>
          <Link
            href="/emock"
            className="text-sm font-medium text-stone-400 hover:text-orange-500 transition-colors"
          >
            eMock
          </Link>
        </div>
        {phone && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-500">{phone}</span>
            <button
              onClick={handleSignOut}
              className="text-sm text-stone-400 hover:text-red-500 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
