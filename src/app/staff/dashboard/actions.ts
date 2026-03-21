"use server";

import { getAdminClient } from "@/lib/supabase/admin";
import { getStaffUser } from "../actions";

export interface DashboardStats {
  openJobs: number;
  totalCandidates: number;
  candidatesThisWeek: number;
  pipelineBreakdown: { stage: string; count: number }[];
  discTypeDistribution: { type: string; count: number }[];
  recentActivity: { id: string; type: string; note: string | null; candidate_name: string; created_at: string }[];
  funnelByJob: { job_title: string; job_id: string; stages: { name: string; count: number }[] }[];
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

  const [
    jobsRes,
    candidatesRes,
    recentCandidatesRes,
    stagesRes,
    activitiesRes,
  ] = await Promise.all([
    admin.from("jobs").select("id, title, status").is("archived_at", null),
    admin.from("candidates").select("id, name, job_id, current_stage_id, created_at"),
    admin.from("candidates").select("id").gte("created_at", oneWeekAgo),
    admin.from("pipeline_stages").select("id, name, job_id, display_order").order("display_order"),
    admin.from("candidate_activities")
      .select("id, type, note, candidate_id, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const jobs = jobsRes.data || [];
  const candidates = candidatesRes.data || [];
  const stages = stagesRes.data || [];
  const openJobs = jobs.filter((j) => j.status === "open").length;

  // Pipeline breakdown across all jobs
  const stageCountMap = new Map<string, number>();
  const stageNameMap = new Map<string, string>();
  for (const s of stages) {
    stageNameMap.set(s.id, s.name);
    stageCountMap.set(s.name, 0);
  }
  for (const c of candidates) {
    if (c.current_stage_id) {
      const name = stageNameMap.get(c.current_stage_id);
      if (name) stageCountMap.set(name, (stageCountMap.get(name) || 0) + 1);
    }
  }
  const pipelineBreakdown = [...stageCountMap.entries()]
    .map(([stage, count]) => ({ stage, count }))
    .filter((s) => s.count > 0);

  // DISC type distribution (via profiles bridge)
  const candidateIds = candidates.map((c) => c.id);
  const discTypeDistribution: { type: string; count: number }[] = [];

  if (candidateIds.length > 0) {
    const { data: profiles } = await admin.from("candidate_profiles")
      .select("candidate_id, user_id")
      .in("candidate_id", candidateIds);

    if (profiles && profiles.length > 0) {
      const userIds = profiles.map((p) => p.user_id).filter(Boolean);
      if (userIds.length > 0) {
        const { data: results } = await admin.from("disc_results")
          .select("disc_type")
          .in("user_id", userIds);

        if (results) {
          const typeCounts = new Map<string, number>();
          for (const r of results) {
            typeCounts.set(r.disc_type, (typeCounts.get(r.disc_type) || 0) + 1);
          }
          for (const [type, count] of typeCounts) {
            discTypeDistribution.push({ type, count });
          }
          discTypeDistribution.sort((a, b) => b.count - a.count);
        }
      }
    }
  }

  // Recent activity with candidate names
  const activities = activitiesRes.data || [];
  const activityCandidateIds = [...new Set(activities.map((a) => a.candidate_id))];
  const candidateNameMap = new Map<string, string>();
  if (activityCandidateIds.length > 0) {
    const { data: names } = await admin.from("candidates")
      .select("id, name")
      .in("id", activityCandidateIds);
    if (names) names.forEach((n) => candidateNameMap.set(n.id, n.name));
  }

  const recentActivity = activities.map((a) => ({
    id: a.id,
    type: a.type,
    note: a.note,
    candidate_name: candidateNameMap.get(a.candidate_id) || "Unknown",
    created_at: a.created_at || "",
  }));

  // Funnel by job (top 5 open jobs)
  const openJobsList = jobs.filter((j) => j.status === "open").slice(0, 5);
  const funnelByJob = openJobsList.map((job) => {
    const jobStages = stages.filter((s) => s.job_id === job.id);
    const jobCandidates = candidates.filter((c) => c.job_id === job.id);
    return {
      job_title: job.title,
      job_id: job.id,
      stages: jobStages.map((s) => ({
        name: s.name,
        count: jobCandidates.filter((c) => c.current_stage_id === s.id).length,
      })),
    };
  });

  return {
    success: true,
    stats: {
      openJobs,
      totalCandidates: candidates.length,
      candidatesThisWeek: recentCandidatesRes.data?.length || 0,
      pipelineBreakdown,
      discTypeDistribution,
      recentActivity,
      funnelByJob,
    },
  };
}
