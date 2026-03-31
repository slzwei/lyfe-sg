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
    "edfe2761-60db-471d-9f49-32f93f686324",
    { password: newPassword }
  );
  if (error) { console.error("Failed:", error.message); process.exit(1); }
  console.log("Password updated successfully for shawnleeapps@gmail.com");
}

main();
