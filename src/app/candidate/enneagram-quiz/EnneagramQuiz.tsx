"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { QuizQuestion } from "@/app/enneagram/scoring";
import { submitEnneagramQuiz, saveQuizProgress } from "./actions";
import { broadcastProgress } from "@/lib/supabase/progress-broadcast";

type Pick = "A" | "B";
type Responses = Record<string, Pick>;

const CALC_STAGES = [
  { pct: 15, label: "Saving your responses…" },
  { pct: 40, label: "Tallying your scores…" },
  { pct: 65, label: "Identifying your type…" },
  { pct: 85, label: "Generating your profile…" },
  { pct: 95, label: "Almost there…" },
];

function CalculatingOverlay({ progress, stage }: { progress: number; stage: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="w-full max-w-sm px-6 text-center">
        <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-stone-200 border-t-orange-500" />
        <div className="mb-3 h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-orange-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mb-1 text-2xl font-bold text-stone-800">{progress}%</p>
        <p className="text-sm text-stone-500">{stage}</p>
      </div>
    </div>
  );
}

interface Props {
  userId: string;
  questions: QuizQuestion[];
  initialResponses: Responses | null;
  initialEmail: string;
}

export default function EnneagramQuiz({ userId, questions, initialResponses, initialEmail }: Props) {
  const hasProgress = initialResponses && Object.keys(initialResponses).length > 0;
  const [showIntro, setShowIntro] = useState(!hasProgress);
  const quizStartRef = useRef<number>(hasProgress ? Date.now() : 0);
  const [responses, setResponses] = useState<Responses>(initialResponses ?? {});
  const [current, setCurrent] = useState(() => {
    if (!initialResponses) return 0;
    const firstUnanswered = questions.findIndex(
      (q) => initialResponses[String(q.question_number)] === undefined,
    );
    return firstUnanswered >= 0 ? firstUnanswered : questions.length - 1;
  });
  const [showEmailStep, setShowEmailStep] = useState(false);
  const [resultsEmail, setResultsEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);
  const [calcProgress, setCalcProgress] = useState(0);
  const [calcStage, setCalcStage] = useState(CALC_STAGES[0].label);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!submitting) return;
    let idx = 0;
    const t = setInterval(() => {
      if (idx < CALC_STAGES.length) {
        setCalcProgress(CALC_STAGES[idx].pct);
        setCalcStage(CALC_STAGES[idx].label);
        idx++;
      }
    }, 800);
    return () => clearInterval(t);
  }, [submitting]);

  useEffect(() => {
    if (!showIntro) broadcastProgress(userId, "quiz");
  }, [showIntro, userId]);

  // Persist after every answer change and broadcast state
  useEffect(() => {
    if (Object.keys(responses).length === 0) return;
    saveQuizProgress(responses).catch(() => {});
    broadcastProgress(userId, "quiz");
  }, [responses, userId]);

  const question = questions[current];
  const total = questions.length;
  const answeredCount = Object.keys(responses).length;

  const selectAnswer = useCallback(
    (pick: Pick) => {
      if (!question) return;
      const key = String(question.question_number);
      setResponses((prev) => ({ ...prev, [key]: pick }));
      setError("");
      setTimeout(() => {
        if (current + 1 < total) {
          setCurrent(current + 1);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          setShowEmailStep(true);
        }
      }, 200);
    },
    [current, question, total],
  );

  useEffect(() => {
    if (showIntro || submitting || showEmailStep) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (e.key === "a" || e.key === "A" || e.key === "1") selectAnswer("A");
      else if (e.key === "b" || e.key === "B" || e.key === "2") selectAnswer("B");
      else if (e.key === "ArrowLeft" && current > 0) setCurrent(current - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showIntro, submitting, showEmailStep, current, selectAnswer]);

  async function handleSubmit() {
    if (answeredCount < total) {
      setError(`Please answer all ${total} questions before submitting.`);
      return;
    }
    setSubmitting(true);
    setCalcProgress(0);
    setCalcStage(CALC_STAGES[0].label);
    const durationSeconds = Math.round((Date.now() - quizStartRef.current) / 1000);
    const result = await submitEnneagramQuiz(responses, resultsEmail, durationSeconds);
    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
      setCalcProgress(0);
    } else {
      setCalcProgress(100);
      setCalcStage("Done!");
    }
  }

  if (showIntro) {
    return (
      <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 text-center">
        <div className="mx-auto mb-6 flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs font-medium text-green-600">Application</span>
          </div>
          <div className="h-px w-8 bg-stone-200" />
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
              2
            </div>
            <span className="text-xs font-semibold text-orange-600">Personality Quiz</span>
          </div>
        </div>

        <h2 className="text-xl font-bold text-stone-800">Almost There!</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
          Your application form is saved. Complete a short personality quiz to finish your registration.
        </p>

        <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-orange-100 bg-orange-50 p-5">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <p className="text-sm font-medium text-stone-700">~5 minutes</p>
          <p className="text-sm font-medium text-stone-700">{total} questions</p>
          <p className="mt-1 text-xs text-stone-500">
            Pick the statement that feels more like you. Trust your first instinct.
          </p>
        </div>

        <button
          type="button"
          onClick={() => { quizStartRef.current = Date.now(); setShowIntro(false); }}
          className="mt-6 w-full max-w-xs rounded-xl bg-orange-500 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          Continue to Quiz →
        </button>
      </div>
    );
  }

  if (showEmailStep) {
    return (
      <div>
        {submitting && <CalculatingOverlay progress={calcProgress} stage={calcStage} />}
        <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-stone-800">All answered!</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">
              Enter your email to save your results and receive a PDF of your personality profile.
            </p>
          </div>

          <div className="mx-auto mt-6 max-w-md">
            <label className="mb-2 block text-sm font-medium text-stone-700">
              Save my results to this email:
            </label>
            <input
              type="email"
              value={resultsEmail}
              onChange={(e) => setResultsEmail(e.target.value)}
              className="h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-base outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              placeholder="you@example.com"
            />
            <p className="mt-1.5 text-xs italic text-stone-400">
              Enter your email to save your results and get more info on your personality type.
            </p>
          </div>

          {error && (
            <p className="mx-auto mt-4 max-w-md rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => { setShowEmailStep(false); setCurrent(total - 1); }}
              className="rounded-xl border border-stone-200 px-6 py-3 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-xl bg-orange-500 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {submitting ? "Calculating…" : "See Results"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const picked = responses[String(question.question_number)] ?? null;

  return (
    <div>
      {submitting && <CalculatingOverlay progress={calcProgress} stage={calcStage} />}

      {/* Progress header */}
      <div className="mb-4 flex items-center justify-between text-xs font-medium text-stone-500">
        <span>
          Question {current + 1} of {total}
        </span>
        <span>
          {answeredCount}/{total} answered
        </span>
      </div>
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-orange-500 transition-all duration-500 ease-out"
          style={{ width: `${(answeredCount / total) * 100}%` }}
        />
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8">
        <p className="mb-6 text-center text-sm font-medium text-stone-500">
          Which feels <span className="text-orange-500">more like you</span>?
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => selectAnswer("A")}
            className={`block w-full rounded-2xl border-2 px-5 py-4 text-left text-sm leading-relaxed transition-all sm:text-base ${
              picked === "A"
                ? "border-orange-500 bg-orange-50 text-stone-800"
                : "border-stone-200 bg-white text-stone-700 hover:border-orange-200 hover:bg-orange-50/40"
            }`}
          >
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-500">A</span>
            {question.optionA}
          </button>
          <button
            type="button"
            onClick={() => selectAnswer("B")}
            className={`block w-full rounded-2xl border-2 px-5 py-4 text-left text-sm leading-relaxed transition-all sm:text-base ${
              picked === "B"
                ? "border-orange-500 bg-orange-50 text-stone-800"
                : "border-stone-200 bg-white text-stone-700 hover:border-orange-200 hover:bg-orange-50/40"
            }`}
          >
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-500">B</span>
            {question.optionB}
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => current > 0 && setCurrent(current - 1)}
            disabled={current === 0}
            className="rounded-xl border border-stone-200 px-6 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:invisible"
          >
            Back
          </button>
          {answeredCount === total && (
            <button
              type="button"
              onClick={() => setShowEmailStep(true)}
              className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              Review →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
