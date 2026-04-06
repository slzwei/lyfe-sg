/**
 * Supabase admin client for E2E test setup/teardown.
 *
 * Uses the service role key to bypass RLS and directly manipulate data.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load env vars from .env.local (Playwright doesn't auto-load them)
function loadEnvFile() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local may not exist in CI
  }
}

loadEnvFile();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SERVICE_ROLE_KEY for E2E tests");
}

/** Admin client — bypasses RLS. */
export const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Anon client — for OTP auth flow (no session persistence). */
export const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Invitation helpers ─────────────────────────────────────────────────────

/** Create an invitation directly in the database (no email sent). */
export async function createInvitation(opts: {
  email: string;
  name?: string;
  position?: string;
}): Promise<{ id: string; token: string }> {
  // Generate a token like the app does
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = Buffer.from(bytes).toString("base64url");

  // Look up an admin user to serve as invited_by_user_id (required for candidate record creation)
  const { data: adminUser } = await adminClient
    .from("users")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .single();

  const { data, error } = await adminClient
    .from("invitations")
    .insert({
      token,
      email: opts.email,
      candidate_name: opts.name || null,
      position_applied: opts.position || null,
      invited_by: "e2e-test",
      invited_by_user_id: adminUser?.id || null,
      status: "pending",
    })
    .select("id, token")
    .single();

  if (error) throw new Error(`Failed to create invitation: ${error.message}`);
  return data;
}

// ─── Profile helpers ────────────────────────────────────────────────────────

/** Mark a candidate's profile as completed with minimal valid data. */
export async function completeProfile(userId: string, invitationId?: string) {
  const { error } = await adminClient
    .from("candidate_profiles")
    .upsert(
      {
        user_id: userId,
        completed: true,
        onboarding_step: 6,
        full_name: "E2E Test User",
        email: "e2e-test@example.com",
        contact_number: "+6580000001",
        position_applied: "Test Position",
        expected_salary: "5000",
        salary_period: "month",
        date_available: "2026-04-01",
        date_of_birth: "1995-06-15",
        place_of_birth: "Singapore",
        nationality: "Singaporean",
        race: "Chinese",
        gender: "Male",
        marital_status: "Single",
        address_block: "187",
        address_street: "TOA PAYOH CENTRAL",
        address_postal: "570187",
        address_unit: "#10-123",
        emergency_name: "Test Emergency",
        emergency_relationship: "Parent",
        emergency_contact: "+6591234567",
        ns_service_status: "NSman",
        ns_status: "Completed",
        ns_enlistment_date: "2014-01-01",
        ns_ord_date: "2016-01-01",
        education: {
          currently_studying: false,
          highest_qualification: "Diploma",
          highest_institution: "Test Polytechnic",
          highest_year_completed: "2018",
        },
        languages: [
          { language: "English", spoken: "Fluent", written: "Fluent" },
        ],
        employment_history: [],
        additional_health: false,
        additional_dismissed: false,
        additional_convicted: false,
        additional_bankrupt: false,
        additional_relatives: false,
        additional_prev_applied: false,
        declaration_agreed: true,
        declaration_date: new Date().toISOString(),
        ...(invitationId ? { invitation_id: invitationId } : {}),
      },
      { onConflict: "user_id" }
    );

  if (error) throw new Error(`Failed to complete profile: ${error.message}`);
}

/** Create DISC quiz responses and results for a user. */
export async function completeQuiz(userId: string) {
  // Insert dummy responses (all center/neutral answers)
  const responses: Record<string, number> = {};
  for (let i = 1; i <= 39; i++) {
    responses[String(i)] = i <= 32 ? 3 : 1; // 3 for word pairs/ratings, 1 for scenarios
  }

  await adminClient.from("disc_responses").upsert(
    { user_id: userId, responses },
    { onConflict: "user_id" }
  );

  // Insert results
  const { error } = await adminClient.from("disc_results").upsert(
    {
      user_id: userId,
      d_raw: 25,
      i_raw: 22,
      s_raw: 28,
      c_raw: 24,
      d_pct: 52,
      i_pct: 46,
      s_pct: 58,
      c_pct: 50,
      disc_type: "SI",
      angle: 210,
    },
    { onConflict: "user_id" }
  );

  if (error) throw new Error(`Failed to complete quiz: ${error.message}`);
}

// ─── Cleanup helpers ────────────────────────────────────────────────────────

/** Delete a test user and all associated data. */
export async function deleteTestUser(userId: string) {
  // Look up candidate_id before deleting profiles
  const { data: profile } = await adminClient
    .from("candidate_profiles")
    .select("candidate_id")
    .eq("user_id", userId)
    .maybeSingle();

  // Delete in order: disc data → profiles → candidates → invitations → auth user
  await adminClient.from("disc_results").delete().eq("user_id", userId);
  await adminClient.from("disc_responses").delete().eq("user_id", userId);
  await adminClient.from("candidate_profiles").delete().eq("user_id", userId);

  if (profile?.candidate_id) {
    // Unlink invitations before deleting candidate
    await adminClient.from("invitations").update({ candidate_record_id: null }).eq("candidate_record_id", profile.candidate_id);
    await adminClient.from("candidate_activities").delete().eq("candidate_id", profile.candidate_id);
    await adminClient.from("candidate_documents").delete().eq("candidate_id", profile.candidate_id);
    await adminClient.from("interviews").delete().eq("candidate_id", profile.candidate_id);
    await adminClient.from("candidates").delete().eq("id", profile.candidate_id);
  }

  await adminClient.from("invitations").delete().eq("user_id", userId);
  await adminClient.from("notifications").delete().eq("user_id", userId);
  await adminClient.auth.admin.deleteUser(userId);
}

/** Delete an invitation by ID. */
export async function deleteInvitation(invitationId: string) {
  await adminClient.from("candidate_profiles").delete().eq("invitation_id", invitationId);
  await adminClient.from("invitations").delete().eq("id", invitationId);
}

/** Get user ID by phone number. */
export async function getUserByPhone(phone: string): Promise<string | null> {
  const { data } = await adminClient.auth.admin.listUsers();
  const user = data?.users?.find((u) => u.phone === phone.replace("+", ""));
  return user?.id || null;
}
