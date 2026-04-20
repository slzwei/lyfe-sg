"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import type { TutorialItem } from "@/lib/quiz";
import {
  saveTutorialAnswer,
  resetQuestion,
  resetChapter,
  type TutorialAnswerRecord,
} from "../actions";

const LETTERS = ["A", "B", "C", "D", "E"] as const;

interface AnswerState {
  selected: string;
  isCorrect: boolean;
}

export default function TutorialClient({
  moduleId,
  chapterKey,
  chapterLabel,
  isUncategorised,
  items,
  initialProgress,
}: {
  moduleId: string;
  chapterKey: string;
  chapterLabel: string;
  isUncategorised: boolean;
  items: TutorialItem[];
  initialProgress: TutorialAnswerRecord[];
}) {
  const initialAnswers = useMemo(() => {
    const map = new Map<string, AnswerState>();
    for (const row of initialProgress) {
      map.set(row.question_key, {
        selected: row.selected_letter,
        isCorrect: row.is_correct,
      });
    }
    return map;
  }, [initialProgress]);

  const [answers, setAnswers] = useState<Map<string, AnswerState>>(
    initialAnswers
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<"taking" | "summary">("taking");
  const [resetChapterConfirm, setResetChapterConfirm] = useState(false);

  const total = items.length;
  const attempted = answers.size;
  const correct = useMemo(
    () => Array.from(answers.values()).filter((a) => a.isCorrect).length,
    [answers]
  );
  const current = items[currentIdx];

  const backHref = `/emock/${moduleId}/tutorial`;

  const handleSelect = useCallback(
    async (letter: string) => {
      const prev = answers.get(current.question_key);
      if (prev?.selected === letter) return; // no-op — already selected
      // Optimistic: grade locally from embedded answer
      const optimistic: AnswerState = {
        selected: letter,
        isCorrect: letter === current.correct_answer_letter,
      };
      setAnswers((m) => {
        const next = new Map(m);
        next.set(current.question_key, optimistic);
        return next;
      });
      // Persist
      try {
        const res = await saveTutorialAnswer(
          moduleId,
          chapterKey,
          current.question_key,
          letter
        );
        if (!res.success) {
          // Revert on hard failure
          setAnswers((m) => {
            const next = new Map(m);
            if (prev) next.set(current.question_key, prev);
            else next.delete(current.question_key);
            return next;
          });
        } else if (
          typeof res.is_correct === "boolean" &&
          res.is_correct !== optimistic.isCorrect
        ) {
          // Reconcile if server disagrees
          setAnswers((m) => {
            const next = new Map(m);
            next.set(current.question_key, {
              selected: letter,
              isCorrect: res.is_correct!,
            });
            return next;
          });
        }
      } catch {
        // Network error: keep optimistic state but don't throw
      }
    },
    [answers, current, moduleId, chapterKey]
  );

  const handleRetryQuestion = useCallback(async () => {
    setAnswers((m) => {
      const next = new Map(m);
      next.delete(current.question_key);
      return next;
    });
    try {
      await resetQuestion(moduleId, chapterKey, current.question_key);
    } catch {
      // best-effort
    }
  }, [current, moduleId, chapterKey]);

  const handleResetChapter = useCallback(async () => {
    setAnswers(new Map());
    setCurrentIdx(0);
    setResetChapterConfirm(false);
    setPhase("taking");
    try {
      await resetChapter(moduleId, chapterKey);
    } catch {
      // best-effort
    }
  }, [moduleId, chapterKey]);

  const goPrev = () => setCurrentIdx((i) => Math.max(0, i - 1));
  const goNext = () => {
    if (currentIdx >= total - 1) {
      setPhase("summary");
    } else {
      setCurrentIdx((i) => i + 1);
    }
  };

  // Detect if previous question shared the same passage (to avoid repeating intro styling)
  const prevItem = currentIdx > 0 ? items[currentIdx - 1] : null;
  const isPassageContinuation =
    !!current.shared_passage &&
    prevItem?.shared_passage === current.shared_passage;

  // ═══════════════════════ SUMMARY ═══════════════════════

  if (phase === "summary") {
    const unanswered = total - attempted;
    return (
      <>
        <Link
          href={backHref}
          className="text-sm text-orange-600 hover:text-orange-700 mb-6 inline-block"
        >
          &larr; Back to chapters
        </Link>

        <h1 className="text-2xl font-bold text-stone-900 mb-1">
          {chapterLabel} — Summary
        </h1>
        <p className="text-stone-500 mb-6">
          You&apos;ve reached the end of this chapter.
        </p>

        <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6 text-center">
          <div className="text-5xl font-bold text-stone-900 mb-2">
            {correct}
            <span className="text-stone-400">/{total}</span>
          </div>
          <div className="text-sm text-stone-500">
            {attempted} attempted · {correct} correct
            {unanswered > 0 ? ` · ${unanswered} unanswered` : ""}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => {
              setPhase("taking");
              setCurrentIdx(0);
            }}
            className="bg-orange-500 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Review from start
          </button>
          <button
            onClick={() => setResetChapterConfirm(true)}
            className="bg-white border border-stone-300 text-stone-700 font-medium px-5 py-2.5 rounded-lg hover:border-red-300 hover:text-red-600 transition-colors"
          >
            Reset chapter
          </button>
          <Link
            href={backHref}
            className="bg-white border border-stone-300 text-stone-700 font-medium px-5 py-2.5 rounded-lg hover:border-stone-400 transition-colors"
          >
            Pick another chapter
          </Link>
        </div>

        {resetChapterConfirm && (
          <ResetChapterDialog
            onCancel={() => setResetChapterConfirm(false)}
            onConfirm={handleResetChapter}
          />
        )}
      </>
    );
  }

  // ═══════════════════════ TAKING ═══════════════════════

  const answer = answers.get(current.question_key);
  const answered = !!answer;

  return (
    <div className="-mx-4 -mt-8">
      {/* Sticky progress header */}
      <div className="sticky top-0 z-20 bg-white border-b border-stone-200 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <Link
            href={backHref}
            className="text-sm text-stone-500 hover:text-orange-600 shrink-0"
          >
            &larr; Chapters
          </Link>
          <div className="flex items-center gap-3 text-sm min-w-0">
            <span className="font-semibold text-stone-700 truncate">
              {chapterLabel}
            </span>
            <span className="text-stone-400 shrink-0">·</span>
            <span className="text-stone-500 shrink-0">
              <span className="font-medium text-stone-700">
                {currentIdx + 1}
              </span>
              /{total}
            </span>
          </div>
          <span className="text-xs text-stone-500 shrink-0 tabular-nums">
            {correct}/{attempted || 0} correct
          </span>
        </div>
        <div className="h-1 bg-stone-100">
          <div
            className="h-1 bg-orange-500 transition-all"
            style={{ width: `${((currentIdx + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="px-4 pt-6 pb-24">
        {/* Shared passage */}
        {current.shared_passage && (
          <div
            className={`rounded-xl p-5 mb-4 ${
              isPassageContinuation
                ? "bg-blue-50/50 border border-blue-100"
                : "bg-blue-50 border border-blue-200"
            }`}
          >
            <p className="text-sm font-semibold text-blue-700 mb-2">
              {isPassageContinuation
                ? "Shared Passage (continued)"
                : "Shared Passage"}
            </p>
            <p className="text-stone-800 text-sm whitespace-pre-line">
              {current.shared_passage}
            </p>
          </div>
        )}

        {/* Question card */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 mb-4">
          <div className="flex items-start gap-3 mb-4">
            <span className="shrink-0 w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-sm font-semibold text-stone-600">
              {current.question_number}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-stone-900 leading-relaxed">
                {current.question}
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-stone-400">
                {current.reference && (
                  <span>Ref: {current.reference}</span>
                )}
                {isUncategorised && !current.reference && (
                  <span className="italic">No chapter reference</span>
                )}
                <span>· Source: {current.quiz_id}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 ml-11">
            {current.options.map((opt, idx) => {
              const letter = LETTERS[idx];
              const isSelected = answer?.selected === letter;
              const isCorrectAnswer =
                letter === current.correct_answer_letter;
              let cls =
                "border border-transparent hover:bg-stone-50 cursor-pointer";
              if (answered) {
                if (isCorrectAnswer) {
                  cls = "bg-green-50 border-green-300 cursor-pointer";
                } else if (isSelected) {
                  cls = "bg-red-50 border-red-300 cursor-pointer";
                } else {
                  cls =
                    "border border-transparent cursor-pointer hover:bg-stone-50";
                }
              } else if (isSelected) {
                cls = "bg-orange-50 border-orange-300 cursor-pointer";
              }
              return (
                <label
                  key={letter}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${cls}`}
                >
                  <input
                    type="radio"
                    name={`q-${current.question_key}`}
                    value={letter}
                    checked={isSelected}
                    onChange={() => handleSelect(letter)}
                    className="mt-0.5 accent-orange-500"
                  />
                  <span className="flex-1 text-sm text-stone-700">
                    <strong className="text-stone-500">{letter}.</strong> {opt}
                  </span>
                  {answered && isCorrectAnswer && (
                    <span className="text-green-600 text-xs font-semibold shrink-0">
                      Correct
                    </span>
                  )}
                  {answered && isSelected && !isCorrectAnswer && (
                    <span className="text-red-500 text-xs font-semibold shrink-0">
                      Your answer
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          {/* Feedback panel */}
          {answered && (
            <div
              className={`mt-4 ml-11 rounded-lg p-3 text-sm ${
                answer.isCorrect
                  ? "bg-green-50 border border-green-200 text-green-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">
                  {answer.isCorrect ? "Correct!" : "Not quite."}
                </span>
                <button
                  onClick={handleRetryQuestion}
                  className="text-xs underline underline-offset-2 hover:opacity-80"
                >
                  Try again
                </button>
              </div>
              {!answer.isCorrect && (
                <p className="mt-1 text-stone-700">
                  The correct answer is{" "}
                  <strong>{current.correct_answer_letter}</strong>:{" "}
                  {current.correct_answer}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={goPrev}
            disabled={currentIdx === 0}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-stone-600 bg-white border border-stone-300 hover:border-stone-400 disabled:opacity-40 disabled:hover:border-stone-300 transition-colors"
          >
            &larr; Prev
          </button>
          <span className="text-xs text-stone-400">
            {currentIdx + 1} / {total}
          </span>
          <button
            onClick={goNext}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors"
          >
            {currentIdx === total - 1 ? "Finish" : "Next"} &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetChapterDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
        <h2 className="text-lg font-semibold text-stone-900 mb-2">
          Reset this chapter?
        </h2>
        <p className="text-stone-600 mb-6 text-sm">
          All your answers in this chapter will be cleared. Your progress in
          other chapters and exam mode is unaffected.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
