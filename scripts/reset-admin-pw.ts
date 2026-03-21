import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const envContent = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
const env: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const newPassword = process.argv[2];
if (!newPassword) { console.error("Usage: npx tsx scripts/reset-admin-pw.ts <new_password>"); process.exit(1); }

async function main() {
  const { error } = await admin.auth.admin.updateUserById(
    "bc17d0b0-607f-4ef1-807b-d70a436db255",
    { password: newPassword }
  );
  if (error) { console.error("Failed:", error.message); process.exit(1); }
  console.log("Password updated successfully for shawnleejob@gmail.com");
}

main();
