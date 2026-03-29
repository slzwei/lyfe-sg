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

  const [jobsRes, candidatesRes, profilesRes, discRes] = await Promise.all([
    admin.from("jobs").select("id, title, status").is("archived_at", null),
    admin.from("candidates")
      .select("id, name, email, phone, status, created_at")
      .order("created_at", { ascending: false }),
    admin.from("candidate_profiles")
      .select("candidate_id, user_id, completed"),
    admin.from("disc_results")
      .select("user_id, disc_type"),
  ]);

  const jobs = jobsRes.data || [];
  const candidates = candidatesRes.data || [];
  const profiles = profilesRes.data || [];
  const discResults = discRes.data || [];
  const openJobs = jobs.filter((j) => j.status === "open").length;

  const thisWeek = candidates.filter((c) => c.created_at && c.created_at >= oneWeekAgo);

  // Build lookup maps: candidate_id → profile, user_id → disc
  const profileByCandidateId = new Map(
    profiles.map((p) => [p.candidate_id, p])
  );
  const discByUserId = new Map(
    discResults.map((r) => [r.user_id, r.disc_type])
  );

  // Completed = profile completed AND DISC quiz done
  let completedCount = 0;
  const discTypes = new Map<string, number>();

  for (const c of candidates) {
    const profile = profileByCandidateId.get(c.id);
    if (!profile) continue;
    const hasDisc = discByUserId.has(profile.user_id);
    if (profile.completed && hasDisc) completedCount++;
  }

  // DISC distribution from all results
  for (const r of discResults) {
    discTypes.set(r.disc_type, (discTypes.get(r.disc_type) || 0) + 1);
  }

  const pendingCount = candidates.length - completedCount;

  const discTypeDistribution = [...discTypes.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // Recent candidates (last 10) with progress labels
  const recentCandidates = candidates.slice(0, 10).map((c) => {
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
      totalCandidates: candidates.length,
      candidatesThisWeek: thisWeek.length,
      completedCount,
      pendingCount,
      discTypeDistribution,
      recentCandidates,
    },
  };
}
