"use client";

import { useState } from "react";
import StepIndicator from "@/components/ui/StepIndicator";
import {
  DISC_STEPS,
  type FormatAQuestion,
  type FormatBQuestion,
  type FormatCQuestion,
  type Question,
} from "./questions";
import { submitDiscQuiz, saveQuizProgress } from "./actions";

const STEP_LABELS = ["Pairs 1", "Pairs 2", "Pairs 3", "Ratings", "Scenarios"];

interface DiscQuizProps {
  initialResponses?: Record<string, number> | null;
  initialEmail?: string;
}

export default function DiscQuiz({ initialResponses, initialEmail }: DiscQuizProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [responses, setResponses] = useState<Record<string, number>>(
    initialResponses || {}
  );
  const [resultsEmail, setResultsEmail] = useState(initialEmail || "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const questions = DISC_STEPS[currentStep - 1];

  function setAnswer(questionId: number, value: number) {
    setResponses((prev) => ({ ...prev, [String(questionId)]: value }));
  }

  function allAnswered(): boolean {
    return questions.every((q) => responses[String(q.id)] !== undefined);
  }

  async function handleNext() {
    if (!allAnswered()) {
      setError("Please answer all questions before continuing.");
      return;
    }
    setError("");

    // Auto-save progress
    saveQuizProgress(responses).catch(() => {});

    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Final submit
      setSubmitting(true);
      const result = await submitDiscQuiz(responses, resultsEmail);
      if (result?.error) {
        setError(result.error);
        setSubmitting(false);
      }
      // On success, server action redirects
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setError("");
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div>
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
