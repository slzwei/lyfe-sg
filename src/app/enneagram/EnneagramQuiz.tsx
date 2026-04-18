"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ENNEAGRAM_TYPES,
  scoreQuiz,
  type EnneagramType,
  type QuizQuestion,
  type QuizResult,
} from "./scoring";
import { TYPE_INFO } from "./type-info";

type Stage = "quiz" | "results";
type Pick = "A" | "B";
type Answer = { qIdx: number; pick: Pick } | null;

const STORAGE_KEY = "enneagram-sampler-v1";

const THEME = {
  paper: "#F5EFE2",
  paperAlt: "#EFE7D4",
  ink: "#1B1812",
  ink2: "#6A5F4A",
  rule: "#D9CEB5",
  accent: "#8E3A1F",
  accentSoft: "#EADFC8",
};

const SERIF = '"Cormorant Garamond", var(--font-serif), "EB Garamond", Georgia, serif';
const MONO = '"JetBrains Mono", var(--font-mono), ui-monospace, monospace';

export default function EnneagramQuiz({ questions }: { questions: QuizQuestion[] }) {
  const [stage, setStage] = useState<Stage>("quiz");
  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>(() => Array(questions.length).fill(null));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const saved = JSON.parse(raw) as { stage?: Stage; cur?: number; answers?: Answer[] };
        if (saved.answers && saved.answers.length === questions.length) {
          setStage(saved.stage === "results" ? "results" : "quiz");
          setCur(typeof saved.cur === "number" ? Math.min(saved.cur, questions.length - 1) : 0);
          setAnswers(saved.answers);
        }
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, [questions.length]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ stage, cur, answers }));
    } catch {
      // ignore
    }
  }, [stage, cur, answers, loaded]);

  const answered = answers.filter(Boolean).length;
  const pct = (answered / questions.length) * 100;

  function onPick(pick: Pick) {
    const next = [...answers];
    next[cur] = { qIdx: cur, pick };
    setAnswers(next);
    setTimeout(() => {
      if (cur + 1 < questions.length) setCur(cur + 1);
      else setStage("results");
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    }, 280);
  }

  function onBack() {
    if (cur > 0) setCur(cur - 1);
  }

  function onRestart() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setAnswers(Array(questions.length).fill(null));
    setCur(0);
    setStage("quiz");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: THEME.paper,
        color: THEME.ink,
        fontFamily: SERIF,
        position: "relative",
      }}
    >
      <PaperTexture />
      <JournalHeader stage={stage} cur={cur} total={questions.length} />

      <main style={{ maxWidth: 780, margin: "0 auto", padding: "0 32px 120px", position: "relative", zIndex: 2 }}>
        {stage === "quiz" && questions[cur] && (
          <QuestionView
            q={questions[cur]}
            idx={cur}
            total={questions.length}
            picked={answers[cur]?.pick ?? null}
            onPick={onPick}
            onBack={onBack}
          />
        )}
        {stage === "results" && <Results questions={questions} answers={answers} onRestart={onRestart} />}
      </main>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────

function JournalHeader({ stage, cur, total }: { stage: Stage; cur: number; total: number }) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: THEME.paper,
        borderBottom: `1px solid ${THEME.rule}`,
      }}
    >
      <div
        style={{
          maxWidth: 780,
          margin: "0 auto",
          padding: "18px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/lyfe-logo.png"
            alt="Lyfe"
            style={{ height: 28, width: "auto", display: "block" }}
          />
          <div
            style={{
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: ".22em",
              color: THEME.ink2,
              textTransform: "uppercase",
            }}
          >
            Enneagram Quiz
          </div>
        </div>
        {stage === "quiz" && (
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".18em", color: THEME.ink2 }}>
            {String(cur + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </div>
        )}
      </div>
      {stage === "quiz" && (
        <div style={{ height: 2, background: THEME.rule, position: "relative" }}>
          <div
            style={{
              position: "absolute",
              inset: "0 auto 0 0",
              width: `${(cur / total) * 100}%`,
              background: THEME.accent,
              transition: "width .45s cubic-bezier(.16,1,.3,1)",
            }}
          />
        </div>
      )}
    </header>
  );
}

// ─── Question ─────────────────────────────────────────────────────────────

function QuestionView({
  q,
  idx,
  total,
  picked,
  onPick,
  onBack,
}: {
  q: QuizQuestion;
  idx: number;
  total: number;
  picked: Pick | null;
  onPick: (p: Pick) => void;
  onBack: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(false);
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, [idx]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (e.key === "a" || e.key === "A" || e.key === "1") onPick("A");
      else if (e.key === "b" || e.key === "B" || e.key === "2") onPick("B");
      else if (e.key === "ArrowLeft") onBack();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onPick, onBack]);

  return (
    <div
      key={idx}
      style={{
        paddingTop: 72,
        paddingBottom: 40,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(12px)",
        transition:
          "opacity .45s cubic-bezier(.16,1,.3,1), transform .45s cubic-bezier(.16,1,.3,1)",
      }}
    >
      <div
        style={{
          fontFamily: SERIF,
          fontStyle: "italic",
          fontSize: 14,
          letterSpacing: ".08em",
          color: THEME.ink2,
          marginBottom: 28,
        }}
      >
        Question N&ordm; {String(idx + 1).padStart(2, "0")}{" "}
        <span style={{ color: THEME.ink2 }}>/ {String(total).padStart(2, "0")}</span>
      </div>

      <h2
        style={{
          fontSize: "clamp(26px, 3.4vw, 34px)",
          fontWeight: 400,
          lineHeight: 1.2,
          margin: 0,
          marginBottom: 48,
          color: THEME.ink,
          letterSpacing: "-.01em",
        }}
      >
        Which of these feels <em style={{ color: THEME.accent }}>more like you</em>?
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <StatementCard
          label="A"
          text={q.optionA}
          picked={picked === "A"}
          otherPicked={picked !== null && picked !== "A"}
          onClick={() => onPick("A")}
        />
        <StatementCard
          label="B"
          text={q.optionB}
          picked={picked === "B"}
          otherPicked={picked !== null && picked !== "B"}
          onClick={() => onPick("B")}
        />
      </div>

      <div style={{ marginTop: 40, display: "flex", alignItems: "center" }}>
        <button
          onClick={onBack}
          disabled={idx === 0}
          style={{ ...btnGhost(), opacity: idx === 0 ? 0.3 : 1, cursor: idx === 0 ? "default" : "pointer" }}
        >
          &larr; Previous
        </button>
      </div>
    </div>
  );
}

function StatementCard({
  label,
  text,
  picked,
  otherPicked,
  onClick,
}: {
  label: "A" | "B";
  text: string;
  picked: boolean;
  otherPicked: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "44px 1fr",
        alignItems: "start",
        gap: 20,
        textAlign: "left",
        padding: "24px 26px",
        borderRadius: 4,
        background: picked ? THEME.accentSoft : hover ? THEME.paperAlt : "transparent",
        border: `1px solid ${picked ? THEME.accent : THEME.rule}`,
        color: THEME.ink,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all .25s cubic-bezier(.16,1,.3,1)",
        opacity: otherPicked ? 0.4 : 1,
        transform: picked ? "translateX(4px)" : "translateX(0)",
      }}
    >
      <span
        style={{
          fontFamily: SERIF,
          fontStyle: "italic",
          fontSize: 28,
          lineHeight: 1,
          color: picked ? THEME.accent : THEME.ink2,
          letterSpacing: "-.01em",
          marginTop: 2,
        }}
      >
        {label}.
      </span>
      <span style={{ fontSize: 20, lineHeight: 1.45, color: THEME.ink, fontWeight: 400 }}>
        {text}
      </span>
    </button>
  );
}

// ─── Results ──────────────────────────────────────────────────────────────

function Results({
  questions,
  answers,
  onRestart,
}: {
  questions: QuizQuestion[];
  answers: Answer[];
  onRestart: () => void;
}) {
  const result = useMemo<QuizResult>(() => {
    const ansMap: Record<number, Pick> = {};
    for (const a of answers) {
      if (a) ansMap[questions[a.qIdx].question_number] = a.pick;
    }
    return scoreQuiz(questions, ansMap);
  }, [questions, answers]);

  const primary = TYPE_INFO[result.primary];
  const wingType = result.wing ? TYPE_INFO[result.wing] : null;
  const ranked = ENNEAGRAM_TYPES.slice().sort((a, b) => result.scores[b] - result.scores[a]);
  const wingKey = result.wing ? `w${result.wing}` : null;
  const wingDesc = wingKey && primary.wings[wingKey] ? primary.wings[wingKey] : null;

  return (
    <div style={{ paddingTop: 72 }}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: ".28em",
          color: THEME.ink2,
          textTransform: "uppercase",
          marginBottom: 24,
          textAlign: "center",
        }}
      >
        The reading &middot; Complete
      </div>

      <div style={{ textAlign: "center", marginBottom: 64 }}>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 20,
            color: THEME.ink2,
            fontStyle: "italic",
            marginBottom: 8,
          }}
        >
          You are a
        </div>
        <div
          style={{
            fontSize: "clamp(120px, 22vw, 240px)",
            lineHeight: 0.85,
            fontWeight: 500,
            color: THEME.accent,
            fontFamily: SERIF,
            letterSpacing: "-.04em",
          }}
        >
          {primary.num}
        </div>
        <div
          style={{
            fontSize: "clamp(32px, 4vw, 44px)",
            fontStyle: "italic",
            fontWeight: 400,
            color: THEME.ink,
            marginTop: -8,
            letterSpacing: "-.01em",
          }}
        >
          {primary.name}
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: ".22em",
            color: THEME.ink2,
            textTransform: "uppercase",
            marginTop: 16,
          }}
        >
          {primary.epithet}
          {result.wing ? ` \u00b7 with a ${result.wing} wing \u00b7 ${result.primary}w${result.wing}` : ""}
        </div>
      </div>

      <div
        style={{
          borderTop: `1px solid ${THEME.rule}`,
          borderBottom: `1px solid ${THEME.rule}`,
          padding: "40px 0",
          margin: "40px 0",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "clamp(22px, 2.8vw, 28px)",
            lineHeight: 1.4,
            fontStyle: "italic",
            color: THEME.ink,
            maxWidth: 620,
            margin: "0 auto",
            fontWeight: 400,
          }}
        >
          <span
            style={{
              fontSize: "3em",
              fontFamily: "Georgia, serif",
              color: THEME.accent,
              lineHeight: 0,
              verticalAlign: "-.35em",
              marginRight: 4,
            }}
          >
            &ldquo;
          </span>
          {primary.summary}
        </div>
      </div>

      <Section eyebrow="A fuller portrait" title="What it is to be" emphasis={primary.name}>
        <p style={bodyText()}>{primary.longDesc}</p>
      </Section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 1,
          background: THEME.rule,
          margin: "64px 0",
          border: `1px solid ${THEME.rule}`,
        }}
      >
        <MetaCell label="Center" value={primary.center} />
        <MetaCell label="Triad" value={primary.triad} />
        <MetaCell
          label="Wing"
          value={result.wing ? `${result.primary}w${result.wing}` : "\u2014"}
        />
      </div>

      <Section eyebrow="At your best" title="Strengths">
        <ul style={{ ...bodyText(), paddingLeft: 0, listStyle: "none", margin: 0 }}>
          {primary.strengths.map((s, i) => (
            <li
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr",
                gap: 16,
                padding: "14px 0",
                borderBottom:
                  i < primary.strengths.length - 1 ? `1px dashed ${THEME.rule}` : "none",
              }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  letterSpacing: ".18em",
                  color: THEME.accent,
                  paddingTop: 6,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ fontSize: 19, lineHeight: 1.45 }}>{s}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section eyebrow="Where you grow" title="Growth edges">
        <ul style={{ ...bodyText(), paddingLeft: 0, listStyle: "none", margin: 0 }}>
          {primary.growthEdges.map((s, i) => (
            <li
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr",
                gap: 16,
                padding: "14px 0",
                borderBottom:
                  i < primary.growthEdges.length - 1 ? `1px dashed ${THEME.rule}` : "none",
              }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  letterSpacing: ".18em",
                  color: THEME.ink2,
                  paddingTop: 6,
                }}
              >
                &rarr;
              </span>
              <span style={{ fontSize: 19, lineHeight: 1.45, color: THEME.ink }}>{s}</span>
            </li>
          ))}
        </ul>
      </Section>

      {wingType && wingDesc && (
        <Section
          eyebrow={`Your wing \u00b7 ${result.primary}w${result.wing}`}
          title="The secondary influence"
        >
          <p style={bodyText()}>
            Your dominant type colors the room; your wing shades it. You lean on{" "}
            <strong style={{ color: THEME.accent, fontWeight: 500 }}>
              Type {wingType.num}, {wingType.name}
            </strong>{" "}
            as a secondary source of energy and instinct.
          </p>
          <p style={{ ...bodyText(), fontStyle: "italic" }}>{wingDesc}.</p>
        </Section>
      )}

      <Section eyebrow="The full reading" title="Your score across all nine">
        <ScoreBars ranked={ranked} scores={result.scores} primary={result.primary} />
      </Section>

      <Section eyebrow="At work" title="Career">
        <p style={bodyText()}>{primary.careers}</p>
      </Section>

      <Section eyebrow="In love" title="Relationships">
        <p style={bodyText()}>{primary.relationships}</p>
      </Section>

      <Section eyebrow="In good company" title={`Other ${primary.name}s`}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", fontSize: 19 }}>
          {primary.famous.map((f, i) => (
            <span
              key={i}
              style={{ fontFamily: SERIF, fontStyle: "italic", color: THEME.ink }}
            >
              {f}
              {i < primary.famous.length - 1 && (
                <span style={{ color: THEME.ink2, margin: "0 6px" }}>&middot;</span>
              )}
            </span>
          ))}
        </div>
      </Section>

      <div
        style={{
          marginTop: 96,
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <button onClick={onRestart} style={btnGhost()}>
          Retake the quiz
        </button>
      </div>

      <div
        style={{
          marginTop: 64,
          textAlign: "center",
          fontFamily: SERIF,
          fontStyle: "italic",
          fontSize: 17,
          color: THEME.ink2,
          maxWidth: 480,
          margin: "64px auto 0",
        }}
      >
        The Enneagram is a map, not a verdict. You are more than one number &mdash; but
        knowing which door you default to is the beginning of walking through others.
      </div>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  emphasis,
  children,
}: {
  eyebrow: string;
  title: string;
  emphasis?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ margin: "64px 0" }}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: ".24em",
          color: THEME.ink2,
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        {eyebrow}
      </div>
      <h3
        style={{
          fontSize: "clamp(28px, 3.6vw, 36px)",
          fontWeight: 400,
          lineHeight: 1.15,
          letterSpacing: "-.01em",
          margin: 0,
          marginBottom: 24,
          color: THEME.ink,
        }}
      >
        {title}
        {emphasis && (
          <>
            {" "}
            <em style={{ color: THEME.accent, fontStyle: "italic" }}>{emphasis}</em>
          </>
        )}
      </h3>
      {children}
    </section>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "28px 24px", background: THEME.paper, textAlign: "center" }}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: ".24em",
          color: THEME.ink2,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: SERIF,
          fontStyle: "italic",
          fontSize: 26,
          color: THEME.ink,
          letterSpacing: "-.01em",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ScoreBars({
  ranked,
  scores,
  primary,
}: {
  ranked: EnneagramType[];
  scores: Record<EnneagramType, number>;
  primary: EnneagramType;
}) {
  const max = scores[ranked[0]] || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {ranked.map((t, i) => {
        const info = TYPE_INFO[t];
        const score = scores[t];
        const w = (score / max) * 100;
        const isPrimary = t === primary;
        return (
          <div
            key={t}
            style={{
              display: "grid",
              gridTemplateColumns: "36px 180px 1fr 48px",
              gap: 16,
              alignItems: "center",
              padding: "14px 0",
              borderBottom: i < ranked.length - 1 ? `1px dashed ${THEME.rule}` : "none",
            }}
          >
            <span
              style={{
                fontFamily: SERIF,
                fontSize: 28,
                fontStyle: isPrimary ? "normal" : "italic",
                color: isPrimary ? THEME.accent : THEME.ink2,
                fontWeight: isPrimary ? 500 : 400,
                letterSpacing: "-.02em",
              }}
            >
              {info.num}
            </span>
            <span
              style={{
                fontSize: 17,
                color: THEME.ink,
                fontWeight: isPrimary ? 500 : 400,
                fontStyle: isPrimary ? "normal" : "italic",
              }}
            >
              {info.name}
            </span>
            <div style={{ height: 2, background: THEME.rule, position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  inset: "0 auto 0 0",
                  height: "100%",
                  width: `${w}%`,
                  background: isPrimary ? THEME.accent : THEME.ink2,
                  transition: "width .8s cubic-bezier(.16,1,.3,1)",
                }}
              />
            </div>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 12,
                color: isPrimary ? THEME.accent : THEME.ink2,
                textAlign: "right",
                fontWeight: 500,
              }}
            >
              {score}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Decorative paper texture ─────────────────────────────────────────────

function PaperTexture() {
  const svg =
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
        opacity: 0.12,
        mixBlendMode: "multiply",
        backgroundImage: svg,
      }}
    />
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────

function btnGhost(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 20px",
    borderRadius: 999,
    background: "transparent",
    color: THEME.ink2,
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: ".18em",
    textTransform: "uppercase",
    border: "none",
    cursor: "pointer",
    transition: "color .2s",
  };
}

function bodyText(): CSSProperties {
  return {
    fontSize: 20,
    lineHeight: 1.6,
    color: THEME.ink,
    fontFamily: SERIF,
    fontWeight: 400,
    margin: "0 0 16px 0",
  };
}
