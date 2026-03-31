import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let _adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function getAdminClient() {
  if (_adminClient) return _adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  _adminClient = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return _adminClient;
}

/**
 * Creates a service-role client that passes the actor's identity via custom
 * headers so the audit trigger can attribute the change to the correct user.
 * Use this for mutations on audited tables (candidates, invitations, etc.).
 */
export function getAdminClientAs(actor: { id: string; role: string }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { "x-actor-id": actor.id, "x-actor-role": actor.role },
    },
  });
}
