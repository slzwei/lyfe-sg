import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import EmockHeader from "./EmockHeader";

export const metadata: Metadata = {
  title: "eMock — Lyfe",
  description: "Practice quizzes for insurance exam preparation.",
};

export default async function EmockLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-stone-50">
      <EmockHeader phone={user?.phone ?? null} />
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
