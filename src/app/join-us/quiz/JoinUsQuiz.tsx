"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import StepIndicator from "@/components/ui/StepIndicator";
import {
  DISC_STEPS,
  type FormatAQuestion,
  type FormatBQuestion,
  type FormatCQuestion,
  type Question,
} from "@/app/candidate/disc-quiz/questions";
import { submitJoinUsQuiz } from "../actions";
import { broadcastProgress } from "@/lib/supabase/progress-broadcast";
import { createClient } from "@/lib/supabase/client";

const STEP_LABELS = ["Pairs 1", "Pairs 2", "Pairs 3", "Ratings", "Scenarios"];

const CALC_STAGES = [
  { pct: 15, label: "Saving your responses…" },
  { pct: 40, label: "Analysing personality patterns…" },
  { pct: 65, label: "Calculating DISC scores…" },
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

interface JoinUsQuizProps {
  userId: string;
  initialResponses: Record<string, number> | null;
}

export default function JoinUsQuiz({ userId, initialResponses }: JoinUsQuizProps) {
  const hasProgress = initialResponses && Object.keys(initialResponses).length > 0;
  const quizStartRef = useRef<number>(Date.now());
  const [currentStep, setCurrentStep] = useState(1);
  const [responses, setResponses] = useState<Record<string, number>>(
    initialResponses || {}
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [calcProgress, setCalcProgress] = useState(0);
  const [calcStage, setCalcStage] = useState(CALC_STAGES[0].label);

  // Animate progress while submitting
  useEffect(() => {
    if (!submitting) return;
    let stageIdx = 0;
    const interval = setInterval(() => {
      if (stageIdx < CALC_STAGES.length) {
        setCalcProgress(CALC_STAGES[stageIdx].pct);
        setCalcStage(CALC_STAGES[stageIdx].label);
        stageIdx++;
      }
    }, 800);
    return () => clearInterval(interval);
  }, [submitting]);

  // Broadcast quiz state to staff portal on mount
  useEffect(() => {
    broadcastProgress(userId, "quiz");
  }, [userId]);

  // Auto-save directly via browser client (no server action), then broadcast
  useEffect(() => {
    if (Object.keys(responses).length === 0) return;
    const supabase = createClient();
    supabase.from("disc_responses").upsert(
      { user_id: userId, responses, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    ).then(() => broadcastProgress(userId, "quiz"));
  }, [responses, userId]);

  const questions = DISC_STEPS[currentStep - 1];

  function setAnswer(questionId: number, value: number) {
    setResponses((prev) => ({ ...prev, [String(questionId)]: value }));
  }

  function allAnswered(): boolean {
    return questions.every((q) => responses[String(q.id)] !== undefined);
  }

  const handleNext = useCallback(async () => {
    if (!allAnswered()) {
      setError("Please answer all questions before continuing.");
      return;
    }
    setError("");
    const supabase = createClient();
    supabase.from("disc_responses").upsert(
      { user_id: userId, responses, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setSubmitting(true);
      setCalcProgress(0);
      setCalcStage(CALC_STAGES[0].label);
      const durationSeconds = Math.round((Date.now() - quizStartRef.current) / 1000);
      const result = await submitJoinUsQuiz(responses, durationSeconds);
      if (result?.error) {
        setError(result.error);
        setSubmitting(false);
        setCalcProgress(0);
      } else {
        setCalcProgress(100);
        setCalcStage("Done!");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, responses]);

  function handleBack() {
    if (currentStep > 1) {
      setError("");
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div>
      {submitting && <CalculatingOverlay progress={calcProgress} stage={calcStage} />}

      {currentStep === 1 && (
        <p className="mb-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs leading-relaxed text-stone-500">
          This work style quiz is designed to help you reflect on your natural
          work preferences. It is not a psychometric instrument.
        </p>
      )}

      <StepIndicator currentStep={currentStep} totalSteps={5} labels={STEP_LABELS} />

      <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8">
        {currentStep <= 3 && (
          <p className="mb-6 rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
            In each pair, mark the circle near the word that describes you
            best. If neither word describes you or both describe you equally
            well, mark the circle in the center.
          </p>
        )}
        {currentStep === 4 && (
          <p className="mb-6 rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
            Rate how well each word describes you, from &quot;Not Like Me&quot;
            to &quot;Like Me&quot;.
          </p>
        )}
        {currentStep === 5 && (
          <p className="mb-6 rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
            Choose the option that best describes you in each scenario.
          </p>
        )}

        <div className="space-y-5">
          {questions.map((q) => (
            <QuestionRenderer
              key={q.id}
              question={q}
              value={responses[String(q.id)]}
              onChange={(val) => setAnswer(q.id, val)}
            />
          ))}
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="rounded-xl border border-stone-200 px-6 py-3 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:invisible"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={submitting}
            className="rounded-xl bg-orange-500 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
          >
            {submitting
              ? "Calculating…"
              : currentStep === 5
                ? "See Results"
                : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Question renderers ──────────────────────────────────────────────────────

function QuestionRenderer({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: number | undefined;
  onChange: (val: number) => void;
}) {
  if (question.format === "A") return <WordPair q={question} value={value} onChange={onChange} />;
  if (question.format === "B") return <SingleWord q={question} value={value} onChange={onChange} />;
  return <Scenario q={question} value={value} onChange={onChange} />;
}

function WordPair({ q, value, onChange }: { q: FormatAQuestion; value: number | undefined; onChange: (val: number) => void }) {
  const answered = value !== undefined;
  return (
    <div className={`rounded-2xl border p-4 transition-colors ${answered ? "border-stone-200 bg-stone-50" : "border-stone-100 bg-white"}`}>
      <div className="flex flex-col gap-2 sm:hidden">
        <div className="flex items-center justify-between text-xs font-medium text-stone-500">
          <span>{q.left}</span>
          <span>{q.right}</span>
        </div>
        <div className="flex items-center justify-between">
          {[5, 4, 3, 2, 1].map((v) => (
            <button key={v} type="button" onClick={() => onChange(v)}
              className={`h-9 w-9 rounded-full border-2 transition-all ${
                value === v ? "border-orange-500 bg-orange-500" : "border-stone-300 bg-white hover:border-orange-300"
              } ${v === 3 ? "h-8 w-8" : ""}`}
              aria-label={`${v}`}
            />
          ))}
        </div>
      </div>
      <div className="hidden sm:flex sm:items-center sm:gap-3">
        <span className="w-32 shrink-0 text-right text-sm font-medium text-stone-700">{q.left}</span>
        <div className="flex flex-1 items-center justify-center gap-3">
          {[5, 4, 3, 2, 1].map((v) => (
            <button key={v} type="button" onClick={() => onChange(v)}
              className={`h-9 w-9 rounded-full border-2 transition-all ${
                value === v ? "border-orange-500 bg-orange-500" : "border-stone-300 bg-white hover:border-orange-300"
              } ${v === 3 ? "h-8 w-8" : ""}`}
              aria-label={`${v}`}
            />
          ))}
        </div>
        <span className="w-32 shrink-0 text-left text-sm font-medium text-stone-700">{q.right}</span>
      </div>
    </div>
  );
}

function SingleWord({ q, value, onChange }: { q: FormatBQuestion; value: number | undefined; onChange: (val: number) => void }) {
  const answered = value !== undefined;
  return (
    <div className={`rounded-2xl border p-4 transition-colors ${answered ? "border-stone-200 bg-stone-50" : "border-stone-100 bg-white"}`}>
      <p className="mb-3 text-center text-sm font-semibold text-stone-800">{q.word}</p>
      <div className="flex items-center justify-between text-xs text-stone-400 mb-1 sm:hidden">
        <span>Not Like Me</span>
        <span>Like Me</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden shrink-0 text-xs text-stone-400 sm:block">Not Like Me</span>
        <div className="flex flex-1 items-center justify-between sm:justify-center sm:gap-3">
          {[1, 2, 3, 4, 5].map((v) => (
            <button key={v} type="button" onClick={() => onChange(v)}
              className={`h-9 w-9 rounded-full border-2 text-xs font-medium transition-all ${
                value === v
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-stone-300 bg-white text-stone-500 hover:border-orange-300"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <span className="hidden shrink-0 text-xs text-stone-400 sm:block">Like Me</span>
      </div>
    </div>
  );
}

function Scenario({ q, value, onChange }: { q: FormatCQuestion; value: number | undefined; onChange: (val: number) => void }) {
  const answered = value !== undefined;
  return (
    <div className={`rounded-2xl border p-4 transition-colors ${answered ? "border-stone-200 bg-stone-50" : "border-stone-100 bg-white"}`}>
      <p className="mb-3 text-sm font-medium text-stone-800">{q.stem}</p>
      <div className="space-y-2">
        <button type="button" onClick={() => onChange(1)}
          className={`w-full rounded-xl border-2 px-4 py-3 text-left text-sm transition-all ${
            value === 1
              ? "border-orange-500 bg-orange-50 text-orange-800"
              : "border-stone-200 bg-white text-stone-600 hover:border-orange-200"
          }`}
        >
          {q.optionA.text}
        </button>
        <button type="button" onClick={() => onChange(2)}
          className={`w-full rounded-xl border-2 px-4 py-3 text-left text-sm transition-all ${
            value === 2
              ? "border-orange-500 bg-orange-50 text-orange-800"
              : "border-stone-200 bg-white text-stone-600 hover:border-orange-200"
          }`}
        >
          {q.optionB.text}
        </button>
      </div>
    </div>
  );
}
