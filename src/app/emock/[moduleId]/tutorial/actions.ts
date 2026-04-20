"use server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimitAsync } from "@/lib/rate-limit";
import {
  isValidModuleId,
  isValidChapterKey,
  findTutorialItemInChapter,
  type ModuleId,
} from "@/lib/quiz";

const LETTERS = new Set(["A", "B", "C", "D", "E"]);

/* eslint-disable @typescript-eslint/no-explicit-any */
function db(supabase: any): any {
  return supabase;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface TutorialAnswerRecord {
  question_key: string;
  selected_letter: string;
  is_correct: boolean;
}

export interface ChapterStat {
  chapter_key: string;
  attempted: number;
  correct: number;
}

export interface SaveTutorialAnswerResult {
  success: boolean;
  error?: string;
  is_correct?: boolean;
  correct_answer_letter?: string;
}

export async function saveTutorialAnswer(
  moduleId: string,
  chapterKey: string,
  questionKey: string,
  selectedLetter: string
): Promise<SaveTutorialAnswerResult> {
  if (!isValidModuleId(moduleId))
    return { success: false, error: "Invalid module" };
  if (!isValidChapterKey(moduleId as ModuleId, chapterKey))
    return { success: false, error: "Invalid chapter" };
  if (!LETTERS.has(selectedLetter))
    return { success: false, error: "Invalid answer" };

  const item = findTutorialItemInChapter(
    moduleId as ModuleId,
    chapterKey,
    questionKey
  );
  if (!item) return { success: false, error: "Question not found in chapter" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { allowed } = await checkRateLimitAsync(
    `tutorial-answer:${user.id}`,
    120
  );
  if (!allowed)
    return { success: false, error: "Too many requests. Slow down a bit." };

  const isCorrect = selectedLetter === item.correct_answer_letter;

  const { error } = await db(supabase)
    .from("emock_tutorial_progress")
    .upsert(
      {
        user_id: user.id,
        module_id: moduleId,
        chapter_key: chapterKey,
        question_key: questionKey,
        selected_letter: selectedLetter,
        is_correct: isCorrect,
        answered_at: new Date().toISOString(),
      },
      { onConflict: "user_id,module_id,chapter_key,question_key" }
    );

  if (error) return { success: false, error: "Failed to save answer" };

  return {
    success: true,
    is_correct: isCorrect,
    correct_answer_letter: item.correct_answer_letter,
  };
}

export async function resetQuestion(
  moduleId: string,
  chapterKey: string,
  questionKey: string
): Promise<{ success: boolean; error?: string }> {
  if (!isValidModuleId(moduleId))
    return { success: false, error: "Invalid module" };
  if (!isValidChapterKey(moduleId as ModuleId, chapterKey))
    return { success: false, error: "Invalid chapter" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  await db(supabase)
    .from("emock_tutorial_progress")
    .delete()
    .eq("user_id", user.id)
    .eq("module_id", moduleId)
    .eq("chapter_key", chapterKey)
    .eq("question_key", questionKey);

  return { success: true };
}

export async function resetChapter(
  moduleId: string,
  chapterKey: string
): Promise<{ success: boolean; error?: string }> {
  if (!isValidModuleId(moduleId))
    return { success: false, error: "Invalid module" };
  if (!isValidChapterKey(moduleId as ModuleId, chapterKey))
    return { success: false, error: "Invalid chapter" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  await db(supabase)
    .from("emock_tutorial_progress")
    .delete()
    .eq("user_id", user.id)
    .eq("module_id", moduleId)
    .eq("chapter_key", chapterKey);

  return { success: true };
}

export async function getChapterProgress(
  moduleId: string,
  chapterKey: string
): Promise<TutorialAnswerRecord[]> {
  if (!isValidModuleId(moduleId)) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await db(supabase)
    .from("emock_tutorial_progress")
    .select("question_key, selected_letter, is_correct")
    .eq("user_id", user.id)
    .eq("module_id", moduleId)
    .eq("chapter_key", chapterKey);

  return (data as TutorialAnswerRecord[] | null) ?? [];
}

export async function getChapterStats(moduleId: string): Promise<ChapterStat[]> {
  if (!isValidModuleId(moduleId)) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await db(supabase)
    .from("emock_tutorial_progress")
    .select("chapter_key, is_correct")
    .eq("user_id", user.id)
    .eq("module_id", moduleId);

  const stats = new Map<string, { attempted: number; correct: number }>();
  for (const row of (data as
    | { chapter_key: string; is_correct: boolean }[]
    | null) ?? []) {
    const s = stats.get(row.chapter_key) ?? { attempted: 0, correct: 0 };
    s.attempted += 1;
    if (row.is_correct) s.correct += 1;
    stats.set(row.chapter_key, s);
  }
  return Array.from(stats.entries()).map(([chapter_key, s]) => ({
    chapter_key,
    attempted: s.attempted,
    correct: s.correct,
  }));
}
