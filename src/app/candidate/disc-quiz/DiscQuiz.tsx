"use client";

import { useState, useEffect, useCallback } from "react";
import StepIndicator from "@/components/ui/StepIndicator";
import {
  DISC_STEPS,
  type FormatAQuestion,
  type FormatBQuestion,
  type FormatCQuestion,
  type Question,
} from "./questions";
import { submitDiscQuiz, saveQuizProgress } from "./actions";
import { broadcastProgress } from "@/lib/supabase/progress-broadcast";

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
        {/* Spinner */}
        <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-stone-200 border-t-orange-500" />

        {/* Progress bar */}
        <div className="mb-3 h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-orange-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Percentage */}
        <p className="mb-1 text-2xl font-bold text-stone-800">{progress}%</p>

        {/* Stage label */}
        <p className="text-sm text-stone-500">{stage}</p>
      </div>
    </div>
  );
}

interface DiscQuizProps {
  initialResponses?: Record<string, number> | null;
  initialEmail?: string;
}

export default function DiscQuiz({ initialResponses, initialEmail }: DiscQuizProps) {
  const hasProgress = initialResponses && Object.keys(initialResponses).length > 0;
  const [showIntro, setShowIntro] = useState(!hasProgress);
  const [currentStep, setCurrentStep] = useState(1);
  const [responses, setResponses] = useState<Record<string, number>>(
    initialResponses || {}
  );
  const [resultsEmail, setResultsEmail] = useState(initialEmail || "");
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

  // Save progress to DB after every answer and notify staff portal
  useEffect(() => {
    if (Object.keys(responses).length === 0) return;
    saveQuizProgress(responses).catch(() => {});
    broadcastProgress();
  }, [responses]);

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

    // Save progress (also saved per-answer via useEffect, but
    // this ensures the latest state is persisted before navigating)
    saveQuizProgress(responses).catch(() => {});

    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Final submit
      setSubmitting(true);
      setCalcProgress(0);
      setCalcStage(CALC_STAGES[0].label);
      const result = await submitDiscQuiz(responses, resultsEmail);
      if (result?.error) {
        setError(result.error);
        setSubmitting(false);
        setCalcProgress(0);
      } else {
        setCalcProgress(100);
        setCalcStage("Done!");
      }
      // On success, server action redirects
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, responses, resultsEmail]);

  function handleBack() {
    if (currentStep > 1) {
      setError("");
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  if (showIntro) {
    return (
      <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 text-center">
        {/* Progress indicator — form done, quiz pending */}
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

        <h2 className="text-xl font-bold text-stone-800">
          Almost There!
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
          Your application form is saved. Complete a short personality quiz to
          finish your registration.
        </p>

        <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-orange-100 bg-orange-50 p-5">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-stone-700">~5 minutes</p>
          <p className="text-sm font-medium text-stone-700">38 questions</p>
          <p className="mt-1 text-xs text-stone-500">
            No right or wrong answers — just answer honestly based on how you
            naturally think and behave.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowIntro(false)}
          className="mt-6 w-full max-w-xs rounded-xl bg-orange-500 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          Continue to Quiz →
        </button>
      </div>
    );
  }

  return (
    <div>
      {submitting && (
        <CalculatingOverlay progress={calcProgress} stage={calcStage} />
      )}
      {currentStep === 1 && (
        <p className="mb-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs leading-relaxed text-stone-500">
          This work style quiz is designed to help you reflect on your natural
          work preferences. It is not a psychometric instrument.
        </p>
      )}
      <StepIndicator
        currentStep={currentStep}
        totalSteps={5}
        labels={STEP_LABELS}
      />

      <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8">
        {/* Format instructions */}
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

        {/* Email field on final step */}
        {currentStep === 5 && (
          <div className="mt-8 rounded-2xl border border-stone-200 bg-stone-50 p-5">
            <label className="mb-2 block text-sm font-medium text-stone-700">
              Save my results to this email:
            </label>
            <input
              type="email"
              value={resultsEmail}
              onChange={(e) => setResultsEmail(e.target.value)}
              className="h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              placeholder="you@example.com"
            />
            <p className="mt-1.5 text-xs italic text-stone-400">
              Enter your email to save your results and get more info on your personality type.
            </p>
          </div>
        )}

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

function WordPair({
  q,
  value,
  onChange,
}: {
  q: FormatAQuestion;
  value: number | undefined;
  onChange: (val: number) => void;
}) {
  const answered = value !== undefined;
  return (
    <div className={`rounded-2xl border p-4 transition-colors ${answered ? "border-stone-200 bg-stone-50" : "border-stone-100 bg-white"}`}>
      {/* Mobile: stacked layout */}
      <div className="flex flex-col gap-2 sm:hidden">
        <div className="flex items-center justify-between text-xs font-medium text-stone-500">
          <span>{q.left}</span>
          <span>{q.right}</span>
        </div>
        <div className="flex items-center justify-between">
          {[5, 4, 3, 2, 1].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={`h-9 w-9 rounded-full border-2 transition-all ${
                value === v
                  ? "border-orange-500 bg-orange-500"
                  : "border-stone-300 bg-white hover:border-orange-300"
              } ${v === 3 ? "h-8 w-8" : ""}`}
              aria-label={`${v}`}
            />
          ))}
        </div>
      </div>
      {/* Desktop: inline layout */}
      <div className="hidden sm:flex sm:items-center sm:gap-3">
        <span className="w-32 shrink-0 text-right text-sm font-medium text-stone-700">
          {q.left}
        </span>
        <div className="flex flex-1 items-center justify-center gap-3">
          {[5, 4, 3, 2, 1].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={`h-9 w-9 rounded-full border-2 transition-all ${
                value === v
                  ? "border-orange-500 bg-orange-500"
                  : "border-stone-300 bg-white hover:border-orange-300"
              } ${v === 3 ? "h-8 w-8" : ""}`}
              aria-label={`${v}`}
            />
          ))}
        </div>
        <span className="w-32 shrink-0 text-left text-sm font-medium text-stone-700">
          {q.right}
        </span>
      </div>
    </div>
  );
}

function SingleWord({
  q,
  value,
  onChange,
}: {
  q: FormatBQuestion;
  value: number | undefined;
  onChange: (val: number) => void;
}) {
  const answered = value !== undefined;
  return (
    <div className={`rounded-2xl border p-4 transition-colors ${answered ? "border-stone-200 bg-stone-50" : "border-stone-100 bg-white"}`}>
      <p className="mb-3 text-center text-sm font-semibold text-stone-800">
        {q.word}
      </p>
      <div className="flex items-center justify-between text-xs text-stone-400 mb-1 sm:hidden">
        <span>Not Like Me</span>
        <span>Like Me</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden shrink-0 text-xs text-stone-400 sm:block">Not Like Me</span>
        <div className="flex flex-1 items-center justify-between sm:justify-center sm:gap-3">
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
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

function Scenario({
  q,
  value,
  onChange,
}: {
  q: FormatCQuestion;
  value: number | undefined;
  onChange: (val: number) => void;
}) {
  const answered = value !== undefined;
  return (
    <div className={`rounded-2xl border p-4 transition-colors ${answered ? "border-stone-200 bg-stone-50" : "border-stone-100 bg-white"}`}>
      <p className="mb-3 text-sm font-medium text-stone-800">{q.stem}</p>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => onChange(1)}
          className={`w-full rounded-xl border-2 px-4 py-3 text-left text-sm transition-all ${
            value === 1
              ? "border-orange-500 bg-orange-50 text-orange-800"
              : "border-stone-200 bg-white text-stone-600 hover:border-orange-200"
          }`}
        >
          {q.optionA.text}
        </button>
        <button
          type="button"
          onClick={() => onChange(2)}
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
