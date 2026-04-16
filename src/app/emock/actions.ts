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
    return { success: false, error: "Too many attempts. Please wait a minute." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone: cleaned });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function emockVerifyOtp(phone: string, token: string) {
  if (!/^\d{6}$/.test(token)) {
    return { success: false, error: "Please enter a 6-digit code." };
  }

  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  const { allowed } = await checkRateLimitAsync(`emock-verify-otp:${ip}`, 10);
  if (!allowed)
    return { success: false, error: "Too many attempts. Please wait a minute." };

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

// ── Quiz grading + persistence ──

export async function gradeQuiz(
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("emock_attempts").insert({
      user_id: user.id,
      module_id: moduleId,
      quiz_id: quizId,
      score: result.score,
      total: result.total,
      passed: result.passed,
      time_taken_seconds: timeTakenSeconds,
      answers,
      parts: result.parts ?? null,
    });
  }

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

export async function getAttempts(
  moduleId: string
): Promise<EmockAttempt[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("emock_attempts")
    .select(
      "id, quiz_id, score, total, passed, time_taken_seconds, completed_at"
    )
    .eq("user_id", user.id)
    .eq("module_id", moduleId)
    .order("completed_at", { ascending: false });

  return (data as EmockAttempt[] | null) ?? [];
}
