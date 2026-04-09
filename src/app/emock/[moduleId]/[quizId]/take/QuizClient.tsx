"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { gradeQuiz } from "./actions";
import type { ClientQuiz, QuizResult, QuestionResult } from "@/lib/quiz";

const LETTERS = ["A", "B", "C", "D"] as const;

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

// ────────────────────────────────────────────────────────────────

export default function QuizClient({ quiz }: { quiz: ClientQuiz }) {
  const [phase, setPhase] = useState<"taking" | "submitting" | "results">(
    "taking"
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(quiz.duration * 60);
  const [results, setResults] = useState<QuizResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [resultFilter, setResultFilter] = useState<
    "all" | "incorrect" | "unanswered"
  >("all");
  const [timedOut, setTimedOut] = useState(false);

  const startTimeRef = useRef(Date.now());
  const answersRef = useRef(answers);
  const submittedRef = useRef(false);
  const questionRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const doSubmit = useCallback(
    async (auto = false) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      if (auto) setTimedOut(true);
      setPhase("submitting");
      setShowConfirm(false);
      try {
        const elapsed = Math.floor(
          (Date.now() - startTimeRef.current) / 1000
        );
        const result = await gradeQuiz(
          quiz.moduleId,
          quiz.quizId,
          answersRef.current,
          elapsed
        );
        setResults(result);
        setPhase("results");
        window.scrollTo(0, 0);
      } catch {
        submittedRef.current = false;
        setTimedOut(false);
        setPhase("taking");
      }
    },
    [quiz.moduleId, quiz.quizId]
  );

  const doSubmitRef = useRef(doSubmit);
  useEffect(() => {
    doSubmitRef.current = doSubmit;
  }, [doSubmit]);

  useEffect(() => {
    if (phase !== "taking") return;
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          doSubmitRef.current(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "taking") return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  const handleSelect = (qNum: number, letter: string) => {
    if (phase !== "taking") return;
    setAnswers((prev) => ({ ...prev, [qNum]: letter }));
  };

  const scrollToQuestion = (num: number) => {
    const el = questionRefs.current.get(num);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    setShowNav(false);
  };

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = quiz.total_questions - answeredCount;
  const backHref = `/emock/${quiz.moduleId}`;

  // ════════════════════════ RESULTS ════════════════════════

  if (phase === "results" && results) {
    const incorrectCount = results.questions.filter(
      (q) => !q.is_correct && q.selected_letter !== null
    ).length;
    const unansweredResultCount = results.questions.filter(
      (q) => q.selected_letter === null
    ).length;
    const filtered = results.questions.filter((q) => {
      if (resultFilter === "incorrect")
        return !q.is_correct && q.selected_letter !== null;
      if (resultFilter === "unanswered") return q.selected_letter === null;
      return true;
    });

    return (
      <>
        <Link
          href={backHref}
          className="text-sm text-orange-600 hover:text-orange-700 mb-6 inline-block"
        >
          &larr; Back to quizzes
        </Link>

        {timedOut && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
            Time&apos;s up! Your quiz was automatically submitted.
          </div>
        )}

        {/* Score card */}
        <div className="bg-white rounded-xl border border-stone-200 p-8 mb-8 text-center">
          <h1 className="text-lg font-semibold text-stone-600 mb-4">
            {results.quiz_title}
          </h1>
          <div
            className={`text-6xl font-bold mb-3 ${results.passed ? "text-green-600" : "text-red-500"}`}
          >
            {results.score}/{results.total}
          </div>

          {results.parts ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4 max-w-xs mx-auto">
                {results.parts.map((part) => (
                  <div
                    key={part.name}
                    className={`rounded-lg p-3 ${part.passed ? "bg-green-50" : "bg-red-50"}`}
                  >
                    <div className="text-xs font-semibold text-stone-500 mb-1">
                      {part.name}
                    </div>
                    <div
                      className={`text-xl font-bold ${part.passed ? "text-green-600" : "text-red-500"}`}
                    >
                      {part.score}/{part.total}
                    </div>
                    <div className="text-xs text-stone-400">
                      {part.passPercent}% req ({part.passRequired})
                    </div>
                  </div>
                ))}
              </div>
              <div
                className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4 ${
                  results.passed
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {results.passed ? "PASSED" : "FAILED"} &mdash; both parts
                required
              </div>
            </>
          ) : (
            <div
              className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4 ${
                results.passed
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-600"
              }`}
            >
              {results.passed ? "PASSED" : "FAILED"} &mdash;{" "}
              {quiz.passingGrade}
            </div>
          )}

          <div className="text-stone-400 text-sm">
            Time taken: {formatDuration(results.time_taken_seconds)}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(
            [
              { key: "all" as const, label: `All (${results.total})` },
              {
                key: "incorrect" as const,
                label: `Incorrect (${incorrectCount})`,
              },
              {
                key: "unanswered" as const,
                label: `Unanswered (${unansweredResultCount})`,
              },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setResultFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                resultFilter === f.key
                  ? "bg-orange-500 text-white"
                  : "bg-white border border-stone-200 text-stone-600 hover:border-orange-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filtered.length === 0 ? (
            <p className="text-stone-400 text-center py-8">
              No questions match this filter.
            </p>
          ) : (
            filtered.map((q, idx) => {
              const prevPassage =
                idx > 0 ? filtered[idx - 1].shared_passage : null;
              const showPassage =
                q.shared_passage && q.shared_passage !== prevPassage;
              return (
                <div key={q.question_number}>
                  {showPassage && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-4">
                      <p className="text-sm font-semibold text-blue-700 mb-2">
                        Shared Passage
                      </p>
                      <p className="text-stone-800 text-sm whitespace-pre-line">
                        {q.shared_passage}
                      </p>
                    </div>
                  )}
                  <ResultCard question={q} />
                </div>
              );
            })
          )}
        </div>

        <div className="mt-8 text-center pb-4">
          <Link
            href={backHref}
            className="inline-block bg-orange-500 text-white font-semibold px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Back to Quizzes
          </Link>
        </div>
      </>
    );
  }

  // ════════════════════════ SUBMITTING ════════════════════════

  if (phase === "submitting") {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-600 font-medium">Grading your quiz...</p>
        </div>
      </div>
    );
  }

  // ════════════════════════ TAKING ════════════════════════

  return (
    <div className="-mx-4 -mt-8">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white border-b border-stone-200 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-stone-700 hidden sm:inline">
              {quiz.title}
            </span>
            <span
              className={`font-mono text-lg font-bold tabular-nums ${
                timeLeft <= 300
                  ? "text-red-600 animate-pulse"
                  : timeLeft <= 600
                    ? "text-amber-600"
                    : "text-stone-900"
              }`}
            >
              {formatTime(timeLeft)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-500">
              <span className="font-medium text-stone-700">
                {answeredCount}
              </span>
              /{quiz.total_questions}
            </span>
            <button
              onClick={() => setShowNav((prev) => !prev)}
              className="px-3 py-1.5 text-sm bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors font-medium text-stone-600"
            >
              {showNav ? "Hide" : "Navigate"}
            </button>
          </div>
        </div>

        {showNav && (
          <div className="border-t border-stone-100 px-4 py-3">
            <div className="flex flex-wrap gap-1">
              {quiz.questions.map((q) => (
                <button
                  key={q.question_number}
                  onClick={() => scrollToQuestion(q.question_number)}
                  className={`w-8 h-8 text-xs rounded font-medium transition-colors ${
                    answers[q.question_number]
                      ? "bg-orange-500 text-white"
                      : "bg-white border border-stone-300 text-stone-500 hover:border-orange-300"
                  }`}
                >
                  {q.question_number}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pt-6">
        <QuestionList
          questions={quiz.questions}
          answers={answers}
          onSelect={handleSelect}
          questionRefs={questionRefs}
        />

        <div className="mt-8 mb-8 bg-white rounded-xl border border-stone-200 p-6 text-center">
          {unansweredCount > 0 && (
            <p className="text-amber-600 text-sm mb-4">
              {unansweredCount} question{unansweredCount !== 1 ? "s" : ""}{" "}
              unanswered
            </p>
          )}
          <button
            onClick={() => setShowConfirm(true)}
            className="bg-orange-500 text-white font-semibold px-8 py-3 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Submit Quiz
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-lg font-semibold text-stone-900 mb-2">
              Submit Quiz?
            </h2>
            <p className="text-stone-600 mb-6 text-sm">
              {unansweredCount > 0
                ? `You have ${unansweredCount} unanswered question${unansweredCount !== 1 ? "s" : ""}. Unanswered questions score 0.`
                : "You cannot change your answers after submission."}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700"
              >
                Cancel
              </button>
              <button
                onClick={() => doSubmit(false)}
                className="px-6 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────── Question list ────────────────────────

function QuestionList({
  questions,
  answers,
  onSelect,
  questionRefs,
}: {
  questions: ClientQuiz["questions"];
  answers: Record<string, string>;
  onSelect: (num: number, letter: string) => void;
  questionRefs: React.RefObject<Map<number, HTMLDivElement>>;
}) {
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < questions.length) {
    const q = questions[i];
    if (q.shared_passage) {
      const passage = q.shared_passage;
      const group: typeof questions = [];
      while (
        i < questions.length &&
        questions[i].shared_passage === passage
      ) {
        group.push(questions[i]);
        i++;
      }
      elements.push(
        <div key={`passage-${group[0].question_number}`} className="mb-2">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-4">
            <p className="text-sm font-semibold text-blue-700 mb-2">
              Shared Passage &mdash; Questions {group[0].question_number}
              &ndash;
              {group[group.length - 1].question_number}
            </p>
            <p className="text-stone-800 text-sm whitespace-pre-line">
              {passage}
            </p>
          </div>
          {group.map((gq) => (
            <QuestionCard
              key={gq.question_number}
              question={gq}
              selected={answers[gq.question_number] ?? null}
              onSelect={(letter) => onSelect(gq.question_number, letter)}
              refCallback={(el) => {
                if (el) questionRefs.current?.set(gq.question_number, el);
              }}
            />
          ))}
        </div>
      );
    } else {
      elements.push(
        <QuestionCard
          key={q.question_number}
          question={q}
          selected={answers[q.question_number] ?? null}
          onSelect={(letter) => onSelect(q.question_number, letter)}
          refCallback={(el) => {
            if (el) questionRefs.current?.set(q.question_number, el);
          }}
        />
      );
      i++;
    }
  }
  return <>{elements}</>;
}

// ──────────────────────── Question card ────────────────────────

function QuestionCard({
  question,
  selected,
  onSelect,
  refCallback,
}: {
  question: ClientQuiz["questions"][0];
  selected: string | null;
  onSelect: (letter: string) => void;
  refCallback: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={refCallback}
      className="bg-white rounded-xl border border-stone-200 p-5 mb-4"
    >
      <div className="flex items-start gap-3 mb-3">
        <span className="shrink-0 w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-sm font-semibold text-stone-600">
          {question.question_number}
        </span>
        <div>
          <p className="text-stone-900 leading-relaxed">{question.question}</p>
          {question.reference && (
            <span className="text-xs text-stone-400 mt-1 inline-block">
              Ref: {question.reference}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-2 ml-11">
        {question.options.map((opt, idx) => {
          const letter = LETTERS[idx];
          const isSelected = selected === letter;
          return (
            <label
              key={letter}
              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                isSelected
                  ? "bg-orange-50 border-orange-300"
                  : "border-transparent hover:bg-stone-50"
              }`}
            >
              <input
                type="radio"
                name={`q-${question.question_number}`}
                value={letter}
                checked={isSelected}
                onChange={() => onSelect(letter)}
                className="mt-0.5 accent-orange-500"
              />
              <span className="text-sm text-stone-700">
                <strong className="text-stone-500">{letter}.</strong> {opt}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────── Result card ────────────────────────

function ResultCard({ question }: { question: QuestionResult }) {
  return (
    <div
      className={`bg-white rounded-xl border p-5 ${
        question.is_correct ? "border-green-200" : "border-red-200"
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <span
          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            question.is_correct
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-600"
          }`}
        >
          {question.question_number}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-stone-900 leading-relaxed">{question.question}</p>
          {question.reference && (
            <span className="text-xs text-stone-400 mt-1 inline-block">
              Ref: {question.reference}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-1.5 ml-11">
        {question.options.map((opt, idx) => {
          const letter = LETTERS[idx];
          const isCorrect = letter === question.correct_answer_letter;
          const isWrongChoice =
            letter === question.selected_letter && !isCorrect;
          let cls = "border-transparent";
          if (isCorrect) cls = "bg-green-50 border-green-200";
          else if (isWrongChoice) cls = "bg-red-50 border-red-200";
          return (
            <div
              key={letter}
              className={`flex items-start gap-3 p-2.5 rounded-lg border text-sm ${cls}`}
            >
              <span className="flex-1 text-stone-700">
                <strong className="text-stone-500">{letter}.</strong> {opt}
              </span>
              {isCorrect && (
                <span className="text-green-600 text-xs font-semibold shrink-0">
                  Correct
                </span>
              )}
              {isWrongChoice && (
                <span className="text-red-500 text-xs font-semibold shrink-0">
                  Your answer
                </span>
              )}
            </div>
          );
        })}
        {question.selected_letter === null && (
          <p className="text-stone-400 text-sm italic mt-1">Not answered</p>
        )}
      </div>
    </div>
  );
}
