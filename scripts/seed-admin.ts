/**
 * One-time script to create the first admin account.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts <email> <password> <full_name>
 *
 * Example:
 *   npx tsx scripts/seed-admin.ts shawn@lyfe.sg MySecurePass123 "Shawn Lee"
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local manually (no dotenv dependency)
const envPath = resolve(process.cwd(), ".env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch {
  // .env.local not found — rely on existing env
}

const [email, password, fullName] = process.argv.slice(2);

if (!email || !password || !fullName) {
  console.error("Usage: npx tsx scripts/seed-admin.ts <email> <password> <full_name>");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // 1. Create auth user
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: fullName },
  });

  if (error) {
    console.error("Failed to create auth user:", error.message);
    process.exit(1);
  }

  console.log("Auth user created:", data.user.id);

  // 2. Create public.users entry (NO trigger — explicit insert per FMEA FM-1)
  const { error: profileError } = await admin.from("users").insert({
    id: data.user.id,
    email,
    full_name: fullName,
    role: "admin",
    is_active: true,
  });

  if (profileError) {
    console.error("Failed to create users profile:", profileError.message);
    console.error("Auth user was created — you may need to manually insert the users row.");
    process.exit(1);
  }

  console.log("Admin account ready:", email);
}

main();
