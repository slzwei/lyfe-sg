"use server";

import { getAdminClient } from "@/lib/supabase/admin";
import { getStaffUser } from "../actions";

export interface DashboardStats {
  openJobs: number;
  totalCandidates: number;
  candidatesThisWeek: number;
  completedCount: number;
  pendingCount: number;
  discTypeDistribution: { type: string; count: number }[];
  recentCandidates: { id: string | null; name: string; email: string; status: string; disc_type?: string; created_at: string }[];
}

export async function getDashboardStats(): Promise<{
  success: boolean;
  stats?: DashboardStats;
  error?: string;
}> {
  const staff = await getStaffUser();
  if (!staff) return { success: false, error: "Not authenticated." };

  const admin = getAdminClient();
  const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  // Use COUNT queries instead of fetching all rows
  const [
    jobsCountRes,
    candidatesCountRes,
    candidatesThisWeekRes,
    discRes,
    recentCandidatesRes,
    profilesRes,
  ] = await Promise.all([
    admin.from("jobs").select("id", { count: "exact", head: true })
      .is("archived_at", null).eq("status", "open"),
    admin.from("candidates").select("id", { count: "exact", head: true }),
    admin.from("candidates").select("id", { count: "exact", head: true })
      .gte("created_at", oneWeekAgo),
    admin.from("disc_results").select("user_id, disc_type"),
    admin.from("candidates")
      .select("id, name, email, phone, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    admin.from("candidate_profiles")
      .select("candidate_id, user_id, completed"),
  ]);

  const openJobs = jobsCountRes.count ?? 0;
  const totalCandidates = candidatesCountRes.count ?? 0;
  const candidatesThisWeek = candidatesThisWeekRes.count ?? 0;
  const discResults = discRes.data || [];
  const recentCandidates = recentCandidatesRes.data || [];
  const profiles = profilesRes.data || [];

  // Build lookup maps
  const profileByCandidateId = new Map(
    profiles.map((p) => [p.candidate_id, p])
  );
  const discByUserId = new Map(
    discResults.map((r) => [r.user_id, r.disc_type])
  );

  // Completed = profile completed AND DISC quiz done
  let completedCount = 0;
  for (const p of profiles) {
    if (p.completed && discByUserId.has(p.user_id)) completedCount++;
  }

  // DISC distribution
  const discTypes = new Map<string, number>();
  for (const r of discResults) {
    discTypes.set(r.disc_type, (discTypes.get(r.disc_type) || 0) + 1);
  }

  const pendingCount = totalCandidates - completedCount;

  const discTypeDistribution = [...discTypes.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // Enrich recent candidates with progress
  const enrichedRecent = recentCandidates.map((c) => {
    const profile = profileByCandidateId.get(c.id);
    const hasDisc = profile ? discByUserId.has(profile.user_id) : false;
    let progress: string;
    if (profile?.completed && hasDisc) {
      progress = "completed";
    } else if (profile) {
      progress = "in progress";
    } else {
      progress = c.status;
    }
    const discType = profile ? discByUserId.get(profile.user_id) : undefined;
    return {
      id: c.id,
      name: c.name || "—",
      email: c.email || "",
      status: progress,
      disc_type: discType,
      created_at: c.created_at || "",
    };
  });

  return {
    success: true,
    stats: {
      openJobs,
      totalCandidates,
      candidatesThisWeek,
      completedCount,
      pendingCount,
      discTypeDistribution,
      recentCandidates: enrichedRecent,
    },
  };
}
