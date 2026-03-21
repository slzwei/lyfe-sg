import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeamClient from "./TeamClient";

export default async function TeamPage() {
  // Admin-only page — verify role server-side
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "admin") {
    redirect("/staff/invite");
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-stone-800">Team Management</h1>
      <TeamClient />
    </div>
  );
}
