"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimitAsync } from "@/lib/rate-limit";
import { redirect } from "next/navigation";
import {
  isValidModuleId,
  isValidQuizId,
  gradeQuizAnswers,
  type QuizResult,
} from "@/lib/quiz";

// ── Auth ──

export async function emockSendOtp(phone: string) {
  const cleaned = phone.replace(/\s/g, "");
  if (!/^\+65\d{8}$/.test(cleaned)) {
    return { success: false, error: "Please enter a valid SG mobile number." };
  }

  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  const { allowed } = await checkRateLimitAsync(`emock-otp:${ip}`, 5);
  if (!allowed)
    return {
      success: false,
      error: "Too many attempts. Please wait a minute.",
    };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone: cleaned });

  if (error) {
    if (
      error.message.toLowerCase().includes("invalid payload sent to hook")
    ) {
      return {
        success: false,
        error:
          "This number is not registered. Please contact your manager for an invitation.",
      };
    }
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function emockVerifyOtp(phone: string, token: string) {
  if (!/^\d{6}$/.test(token)) {
    return { success: false, error: "Please enter a 6-digit code." };
  }

  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  const { allowed } = await checkRateLimitAsync(`emock-verify-otp:${ip}`, 10);
  if (!allowed)
    return {
      success: false,
      error: "Too many attempts. Please wait a minute.",
    };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });

  if (error)
    return {
      success: false,
      error: "Invalid or expired code. Please try again.",
    };
  if (!data.user) return { success: false, error: "Verification failed." };
  return { success: true };
}

export async function emockSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/emock/login");
}

export async function getEmockUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, phone: user.phone || null };
}

// ── In-progress attempts ──

export interface InProgressAttempt {
  id: string;
  answers: Record<string, string>;
  started_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: any) {
  return supabase as any;
}

export async function getInProgressAttempt(
  moduleId: string,
  quizId: string
): Promise<InProgressAttempt | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await db(supabase)
    .from("emock_attempts")
    .select("id, answers, started_at")
    .eq("user_id", user.id)
    .eq("module_id", moduleId)
    .eq("quiz_id", quizId)
    .eq("status", "in_progress")
    .maybeSingle();

  return (data as InProgressAttempt | null) ?? null;
}

export async function startQuiz(
  moduleId: string,
  quizId: string
): Promise<InProgressAttempt> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const existing = await getInProgressAttempt(moduleId, quizId);
  if (existing) return existing;

  const { data, error } = await db(supabase)
    .from("emock_attempts")
    .insert({
      user_id: user.id,
      module_id: moduleId,
      quiz_id: quizId,
      status: "in_progress",
      answers: {},
    })
    .select("id, answers, started_at")
    .single();

  if (error) throw new Error("Failed to start quiz");
  return data as InProgressAttempt;
}

export async function saveQuizProgress(
  attemptId: string,
  answers: Record<string, string>
): Promise<void> {
  const supabase = await createClient();
  await db(supabase)
    .from("emock_attempts")
    .update({ answers })
    .eq("id", attemptId)
    .eq("status", "in_progress");
}

export async function clearQuizProgress(
  moduleId: string,
  quizId: string
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await db(supabase)
    .from("emock_attempts")
    .delete()
    .eq("user_id", user.id)
    .eq("module_id", moduleId)
    .eq("quiz_id", quizId)
    .eq("status", "in_progress");
}

// ── Quiz grading ──

export async function gradeQuiz(
  attemptId: string,
  moduleId: string,
  quizId: string,
  answers: Record<string, string>,
  timeTakenSeconds: number
): Promise<QuizResult> {
  if (!isValidModuleId(moduleId) || !isValidQuizId(moduleId, quizId)) {
    throw new Error("Invalid module or quiz ID");
  }

  const result = gradeQuizAnswers(moduleId, quizId, answers, timeTakenSeconds);

  const supabase = await createClient();
  await db(supabase)
    .from("emock_attempts")
    .update({
      status: "completed",
      score: result.score,
      total: result.total,
      passed: result.passed,
      time_taken_seconds: timeTakenSeconds,
      answers,
      parts: result.parts ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", attemptId)
    .eq("status", "in_progress");

  return result;
}

// ── Attempt history ──

export interface EmockAttempt {
  id: string;
  quiz_id: string;
  score: number;
  total: number;
  passed: boolean;
  time_taken_seconds: number;
  completed_at: string;
}

export async function getAttempts(moduleId: string): Promise<EmockAttempt[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await db(supabase)
    .from("emock_attempts")
    .select(
      "id, quiz_id, score, total, passed, time_taken_seconds, completed_at"
    )
    .eq("user_id", user.id)
    .eq("module_id", moduleId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  return (data as EmockAttempt[] | null) ?? [];
}

export async function getInProgressQuizIds(
  moduleId: string
): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await db(supabase)
    .from("emock_attempts")
    .select("quiz_id")
    .eq("user_id", user.id)
    .eq("module_id", moduleId)
    .eq("status", "in_progress");

  return (
    (data as { quiz_id: string }[] | null)?.map((d) => d.quiz_id) ?? []
  );
}
