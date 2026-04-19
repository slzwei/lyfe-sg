import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/shared-types/database.types";

type AdminClient = SupabaseClient<Database>;

export type ResolvedManager =
  | { ok: true; managerId: string }
  | { ok: false; error: string };

/**
 * Resolve a valid `candidates.assigned_manager_id` for an invitation flow.
 *
 * The DB trigger `trg_validate_candidate_manager_role` rejects any candidate
 * whose assigned_manager_id points to a user that isn't a manager or director.
 * This helper enforces the same rule at the app boundary, with a fallback chain:
 *
 *   1. If `preferredManagerId` is provided, validate its role and return.
 *   2. If `inviterUserId` is a manager/director, return it.
 *   3. If `inviterUserId` is a PA, look up `pa_manager_assignments` — the
 *      candidate is routed to the PA's assigned manager/director.
 *   4. Otherwise fall back to the first active director.
 *
 * Returns `{ ok: false }` with a user-facing error when none resolve.
 */
export async function resolveAssignedManagerId(
  admin: AdminClient,
  inviterUserId: string | null,
  preferredManagerId?: string | null
): Promise<ResolvedManager> {
  if (preferredManagerId) {
    const { data: target } = await admin
      .from("users")
      .select("id, role, is_active")
      .eq("id", preferredManagerId)
      .maybeSingle();
    if (!target?.is_active) {
      return { ok: false, error: "Selected manager is not active." };
    }
    if (!["manager", "director"].includes(target.role)) {
      return { ok: false, error: "Selected user is not a manager or director." };
    }
    return { ok: true, managerId: target.id };
  }

  if (inviterUserId) {
    const { data: inviter } = await admin
      .from("users")
      .select("id, role, is_active")
      .eq("id", inviterUserId)
      .maybeSingle();

    if (inviter?.is_active) {
      if (["manager", "director"].includes(inviter.role)) {
        return { ok: true, managerId: inviter.id };
      }
      if (inviter.role === "pa") {
        const { data: assignment } = await admin
          .from("pa_manager_assignments")
          .select("manager_id")
          .eq("pa_id", inviter.id)
          .limit(1)
          .maybeSingle();
        if (assignment?.manager_id) {
          return { ok: true, managerId: assignment.manager_id };
        }
        return {
          ok: false,
          error:
            "You're not assigned to a manager yet. Please contact an admin to set up your reporting line before sending invitations.",
        };
      }
    }
  }

  const { data: fallback } = await admin
    .from("users")
    .select("id")
    .eq("role", "director")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fallback?.id) {
    return { ok: true, managerId: fallback.id };
  }

  return {
    ok: false,
    error: "No manager or director available to assign. Please contact an admin.",
  };
}
