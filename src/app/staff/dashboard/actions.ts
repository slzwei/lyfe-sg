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

  // All data from invitations (the real candidate list)
  const [jobsRes, invitationsRes] = await Promise.all([
    admin.from("jobs").select("id, title, status").is("archived_at", null),
    admin.from("invitations")
      .select("id, candidate_name, email, status, user_id, created_at, archived_at, candidate_record_id")
      .order("created_at", { ascending: false }),
  ]);

  const jobs = jobsRes.data || [];
  const invitations = invitationsRes.data || [];
  const openJobs = jobs.filter((j) => j.status === "open").length;

  const active = invitations.filter((inv) => !inv.archived_at);
  const thisWeek = active.filter((inv) => inv.created_at && inv.created_at >= oneWeekAgo);

  // Get progress for accepted invitations
  const acceptedUserIds = active
    .filter((inv) => inv.status === "accepted" && inv.user_id)
    .map((inv) => inv.user_id!);

  let completedCount = 0;
  let pendingCount = 0;
  const discTypes = new Map<string, number>();

  if (acceptedUserIds.length > 0) {
    const [profilesRes, discRes] = await Promise.all([
      admin.from("candidate_profiles")
        .select("user_id, completed")
        .in("user_id", acceptedUserIds),
      admin.from("disc_results")
        .select("user_id, disc_type")
        .in("user_id", acceptedUserIds),
    ]);

    const profiles = profilesRes.data || [];
    const discResults = discRes.data || [];

    completedCount = discResults.length; // completed = has DISC results
    pendingCount = active.filter((inv) => inv.status === "accepted").length - completedCount;

    for (const r of discResults) {
      discTypes.set(r.disc_type, (discTypes.get(r.disc_type) || 0) + 1);
    }
  }

  // Pending invitations (not yet accepted)
  const pendingInvites = active.filter((inv) => inv.status === "pending").length;
  pendingCount += pendingInvites;

  const discTypeDistribution = [...discTypes.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // Recent candidates (last 10 active) with meaningful progress labels
  const discUserIds = new Set(
    (acceptedUserIds.length > 0
      ? (await admin.from("disc_results").select("user_id").in("user_id", acceptedUserIds)).data || []
      : []
    ).map((r) => r.user_id)
  );

  const recentCandidates = active.slice(0, 10).map((inv) => {
    let progress: string;
    if (inv.status === "pending") {
      progress = "pending";
    } else if (inv.user_id && discUserIds.has(inv.user_id)) {
      progress = "completed";
    } else {
      progress = "in progress";
    }
    return {
      id: inv.candidate_record_id || null,
      name: inv.candidate_name || "—",
      email: inv.email,
      status: progress,
      created_at: inv.created_at || "",
    };
  });

  return {
    success: true,
    stats: {
      openJobs,
      totalCandidates: active.length,
      candidatesThisWeek: thisWeek.length,
      completedCount,
      pendingCount,
      discTypeDistribution,
      recentCandidates,
    },
  };
}
