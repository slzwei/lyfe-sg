"use server";

import { getAdminClient } from "@/lib/supabase/admin";
import { getStaffUser } from "../actions";

export interface DashboardStats {
  openJobs: number;
  totalCandidates: number;
  candidatesThisWeek: number;
  completedCount: number;
  pendingCount: number;
  enneagramTypeDistribution: { type: string; label: string; count: number }[];
  discTypeDistribution: { type: string; count: number }[];
  recentCandidates: {
    id: string | null;
    name: string;
    email: string;
    status: string;
    enneagram_type?: string;
    disc_type?: string;
    created_at: string;
  }[];
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

  const TYPE_NAMES: Record<number, string> = {
    1: "Reformer", 2: "Helper", 3: "Achiever", 4: "Individualist",
    5: "Investigator", 6: "Loyalist", 7: "Enthusiast", 8: "Challenger", 9: "Peacemaker",
  };

  const [
    jobsCountRes,
    candidatesCountRes,
    candidatesThisWeekRes,
    enneagramRes,
    discRes,
    recentCandidatesRes,
    profilesRes,
  ] = await Promise.all([
    admin.from("jobs").select("id", { count: "exact", head: true })
      .is("archived_at", null).eq("status", "open"),
    admin.from("candidates").select("id", { count: "exact", head: true }),
    admin.from("candidates").select("id", { count: "exact", head: true })
      .gte("created_at", oneWeekAgo),
    admin.from("enneagram_results").select("user_id, primary_type, wing_type"),
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
  const enneagramResults = enneagramRes.data || [];
  const discResults = discRes.data || [];
  const recentCandidates = recentCandidatesRes.data || [];
  const profiles = profilesRes.data || [];

  const profileByCandidateId = new Map(
    profiles.map((p) => [p.candidate_id, p])
  );
  const enneagramByUserId = new Map(
    enneagramResults.map((r) => [
      r.user_id,
      { primary: r.primary_type, wing: r.wing_type, label: `${r.primary_type}${r.wing_type ? `w${r.wing_type}` : ""}` },
    ])
  );
  const discByUserId = new Map(
    discResults.map((r) => [r.user_id, r.disc_type])
  );

  // Completed = profile completed AND a personality quiz (enneagram OR legacy DISC) done
  let completedCount = 0;
  for (const p of profiles) {
    if (p.completed && (enneagramByUserId.has(p.user_id) || discByUserId.has(p.user_id))) completedCount++;
  }

  // Enneagram distribution grouped by primary type
  const enneagramBuckets = new Map<number, number>();
  for (const r of enneagramResults) {
    enneagramBuckets.set(r.primary_type, (enneagramBuckets.get(r.primary_type) || 0) + 1);
  }
  const enneagramTypeDistribution = [...enneagramBuckets.entries()]
    .map(([primary, count]) => ({
      type: String(primary),
      label: `${primary} · ${TYPE_NAMES[primary]}`,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Legacy DISC distribution (kept for reference)
  const discTypes = new Map<string, number>();
  for (const r of discResults) {
    discTypes.set(r.disc_type, (discTypes.get(r.disc_type) || 0) + 1);
  }
  const discTypeDistribution = [...discTypes.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const pendingCount = totalCandidates - completedCount;

  const enrichedRecent = recentCandidates.map((c) => {
    const profile = profileByCandidateId.get(c.id);
    const enneagram = profile ? enneagramByUserId.get(profile.user_id) : undefined;
    const disc = profile ? discByUserId.get(profile.user_id) : undefined;
    const quizDone = !!enneagram || !!disc;
    let progress: string;
    if (profile?.completed && quizDone) progress = "completed";
    else if (profile) progress = "in progress";
    else progress = c.status;
    return {
      id: c.id,
      name: c.name || "—",
      email: c.email || "",
      status: progress,
      enneagram_type: enneagram?.label,
      disc_type: disc,
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
      enneagramTypeDistribution,
      discTypeDistribution,
      recentCandidates: enrichedRecent,
    },
  };
}
