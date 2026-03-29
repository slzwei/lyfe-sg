"use server";

import { getAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "../actions";

export interface AuditEntry {
  id: number;
  table_name: string;
  operation: string;
  actor_id: string | null;
  actor_role: string | null;
  actor_name: string | null;
  source: string;
  summary: string;
  tx_id: number;
  created_at: string;
}

export interface AuditFilters {
  tableName?: string;
  operation?: string;
  dateFrom?: string;
  dateTo?: string;
}

const TABLE_LABELS: Record<string, string> = {
  candidates: "Candidates",
  invitations: "Invitations",
  candidate_profiles: "Candidate Profiles",
  disc_results: "DISC Results",
  disc_responses: "DISC Responses",
  leads: "Leads",
  lead_activities: "Lead Activities",
  event_attendees: "Event Attendees",
  pa_manager_assignments: "PA Assignments",
};

function buildSummary(
  operation: string,
  tableName: string,
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null,
): string {
  const label = TABLE_LABELS[tableName] || tableName;
  const getName = (d: Record<string, unknown> | null) =>
    (d?.name || d?.full_name || d?.candidate_name || d?.email || d?.id || "") as string;

  if (operation === "INSERT") {
    const name = getName(newData);
    return name ? `Created ${label}: ${name}` : `Created ${label}`;
  }
  if (operation === "DELETE") {
    const name = getName(oldData);
    return name ? `Deleted ${label}: ${name}` : `Deleted ${label}`;
  }
  // UPDATE: list changed fields
  if (oldData && newData) {
    const changed = Object.keys(newData).filter(
      (k) => JSON.stringify(oldData[k]) !== JSON.stringify(newData[k])
    );
    const name = getName(newData);
    const fields = changed.slice(0, 3).join(", ");
    const suffix = changed.length > 3 ? ` +${changed.length - 3} more` : "";
    return name
      ? `Updated ${label}: ${name} (${fields}${suffix})`
      : `Updated ${label} (${fields}${suffix})`;
  }
  return `${operation} on ${label}`;
}

export async function getAuditEntries(filters?: AuditFilters): Promise<{
  success: boolean;
  data?: AuditEntry[];
  error?: string;
}> {
  const staff = await requireStaff("admin");
  if (!staff) return { success: false, error: "Admin access required." };

  const admin = getAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (admin.from as any)("audit_log")
    .select("id, table_name, operation, actor_id, actor_role, source, old_data, new_data, tx_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters?.tableName) q = q.eq("table_name", filters.tableName);
  if (filters?.operation) q = q.eq("operation", filters.operation);
  if (filters?.dateFrom) q = q.gte("created_at", filters.dateFrom);
  if (filters?.dateTo) q = q.lte("created_at", filters.dateTo + "T23:59:59Z");

  const { data: rows, error } = await q;
  if (error) return { success: false, error: error.message };
  if (!rows || rows.length === 0) return { success: true, data: [] };

  // Resolve actor names
  const actorIds: string[] = Array.from(new Set(
    rows.filter((r: Record<string, unknown>) => r.actor_id).map((r: Record<string, unknown>) => String(r.actor_id))
  ));
  const nameMap = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: users } = await admin.from("users")
      .select("id, full_name")
      .in("id", actorIds);
    if (users) {
      for (const u of users) nameMap.set(u.id, u.full_name);
    }
  }

  const entries: AuditEntry[] = rows.map((r: Record<string, unknown>) => ({
    id: r.id as number,
    table_name: r.table_name as string,
    operation: r.operation as string,
    actor_id: r.actor_id as string | null,
    actor_role: r.actor_role as string | null,
    actor_name: r.actor_id ? (nameMap.get(r.actor_id as string) || null) : null,
    source: r.source as string,
    summary: buildSummary(
      r.operation as string,
      r.table_name as string,
      r.old_data as Record<string, unknown> | null,
      r.new_data as Record<string, unknown> | null,
    ),
    tx_id: r.tx_id as number,
    created_at: r.created_at as string,
  }));

  return { success: true, data: entries };
}
