"use client";

import { useState } from "react";

const QUADRANTS = {
  D: {
    color: "#2B8C8C",
    bg: "#2B8C8C15",
    label: "Drive",
    letter: "D",
    desc: "Decisive, competitive, and results-oriented.",
    startAngle: 90,
    endAngle: 180,
    labelPos: { x: -0.48, y: -0.48 },
  },
  I: {
    color: "#7B5EA7",
    bg: "#7B5EA715",
    label: "Influence",
    letter: "I",
    desc: "Enthusiastic, optimistic, and people-oriented.",
    startAngle: 0,
    endAngle: 90,
    labelPos: { x: 0.48, y: -0.48 },
  },
  S: {
    color: "#D4876C",
    bg: "#D4876C15",
    label: "Support",
    letter: "S",
    desc: "Patient, reliable, and team-oriented.",
    startAngle: 270,
    endAngle: 360,
    labelPos: { x: 0.48, y: 0.55 },
  },
  C: {
    color: "#4A7FB5",
    bg: "#4A7FB515",
    label: "Clarity",
    letter: "C",
    desc: "Analytical, precise, and quality-focused.",
    startAngle: 180,
    endAngle: 270,
    labelPos: { x: -0.48, y: 0.55 },
  },
} as const;

type QuadrantKey = keyof typeof QUADRANTS;

interface CircumplexChartProps {
  d: number;
  i: number;
  s: number;
  c: number;
  angle: number;
}

export default function CircumplexChart({
  d,
  i,
  s,
  c,
  angle,
}: CircumplexChartProps) {
  const [hovered, setHovered] = useState<QuadrantKey | null>(null);

  const cx = 200;
  const cy = 200;
  const outerR = 140;
  const maxR = outerR * 0.85;

  const scores: Record<QuadrantKey, number> = { D: d, I: i, S: s, C: c };
  const maxPct = Math.max(d, i, s, c, 1);
  const scale = (pct: number) => 30 + (pct / maxPct) * (maxR - 30);

  function wedgePath(startAngle: number, endAngle: number, radius: number) {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy - radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy - radius * Math.sin(endRad);
    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 0 0 ${x2} ${y2} Z`;
  }

  // Dot distance from center encodes profile strength (differentiation)
  const vScore = d + i - (s + c);
  const hScore = i + s - (d + c);
  const rawMag = Math.sqrt(vScore ** 2 + hScore ** 2);
  const normalizedMag = Math.min(rawMag / 120, 1);
  const dotR = outerR * (0.2 + normalizedMag * 0.65);
  const dotAngleRad = (angle * Math.PI) / 180;
  const dotX = cx + dotR * Math.cos(dotAngleRad);
  const dotY = cy - dotR * Math.sin(dotAngleRad);

  return (
    <div className="relative">
      <svg viewBox="0 0 400 400" className="mx-auto w-full max-w-[320px]">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Subtle background quadrant tints */}
        {(Object.keys(QUADRANTS) as QuadrantKey[]).map((key) => {
          const q = QUADRANTS[key];
          return (
            <path
              key={`bg-${key}`}
              d={wedgePath(q.startAngle, q.endAngle, outerR)}
              fill={q.color}
              opacity={0.06}
            />
          );
        })}

        {/* Outer circle */}
        <circle
          cx={cx}
          cy={cy}
          r={outerR}
          fill="none"
          stroke="#d6d3d1"
          strokeWidth="1.5"
        />

        {/* Reference circles */}
        {[0.33, 0.66].map((f) => (
          <circle
            key={f}
            cx={cx}
            cy={cy}
            r={outerR * f}
            fill="none"
            stroke="#e7e5e4"
            strokeWidth="0.75"
            strokeDasharray="3 3"
          />
        ))}

        {/* Score wedges */}
        {(Object.keys(QUADRANTS) as QuadrantKey[]).map((key) => {
          const q = QUADRANTS[key];
          const r = scale(scores[key]);
          const isHovered = hovered === key;
          return (
            <path
              key={key}
              d={wedgePath(q.startAngle, q.endAngle, r)}
              fill={q.color}
              opacity={isHovered ? 0.65 : 0.35}
              className="cursor-pointer transition-opacity duration-200"
              filter={isHovered ? "url(#glow)" : undefined}
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}

        {/* Axis lines */}
        <line
          x1={cx - outerR}
          y1={cy}
          x2={cx + outerR}
          y2={cy}
          stroke="#d6d3d1"
          strokeWidth="0.75"
        />
        <line
          x1={cx}
          y1={cy - outerR}
          x2={cx}
          y2={cy + outerR}
          stroke="#d6d3d1"
          strokeWidth="0.75"
        />

        {/* Quadrant letters */}
        {(Object.keys(QUADRANTS) as QuadrantKey[]).map((key) => {
          const q = QUADRANTS[key];
          const dimmed = hovered !== null && hovered !== key;
          return (
            <text
              key={key}
              x={cx + outerR * q.labelPos.x}
              y={cy + outerR * q.labelPos.y}
              textAnchor="middle"
              className="pointer-events-none select-none text-xl font-bold transition-opacity duration-200"
              fill={q.color}
              opacity={dimmed ? 0.25 : 0.8}
            >
              {key}
            </text>
          );
        })}

        {/* Axis labels */}
        <text x={cx} y={cy - outerR - 10} textAnchor="middle" className="text-[9px] font-medium uppercase tracking-[0.15em]" fill="#a8a29e">Active</text>
        <text x={cx} y={cy + outerR + 16} textAnchor="middle" className="text-[9px] font-medium uppercase tracking-[0.15em]" fill="#a8a29e">Receptive</text>
        <text x={cx - outerR - 8} y={cy + 3} textAnchor="end" className="text-[9px] font-medium uppercase tracking-[0.15em]" fill="#a8a29e">Skeptical</text>
        <text x={cx + outerR + 8} y={cy + 3} textAnchor="start" className="text-[9px] font-medium uppercase tracking-[0.15em]" fill="#a8a29e">Agreeable</text>

        {/* User dot */}
        <circle cx={dotX} cy={dotY} r={7} fill="white" stroke="#292524" strokeWidth="2.5" />
        <circle cx={dotX} cy={dotY} r={3} fill="#292524" />
      </svg>

      {/* Hover tooltip */}
      <div
        className={`mx-auto mt-2 max-w-[240px] rounded-xl border px-4 py-2.5 text-center transition-all duration-200 ${
          hovered
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-1 pointer-events-none"
        }`}
        style={{
          borderColor: hovered ? QUADRANTS[hovered].color + "30" : "transparent",
          backgroundColor: hovered ? QUADRANTS[hovered].color + "08" : "transparent",
          minHeight: 56,
        }}
      >
        {hovered && (
          <>
            <p className="text-sm font-semibold" style={{ color: QUADRANTS[hovered].color }}>
              {QUADRANTS[hovered].label} &middot; {scores[hovered]}%
            </p>
            <p className="mt-0.5 text-xs text-stone-500">{QUADRANTS[hovered].desc}</p>
          </>
        )}
      </div>
    </div>
  );
}
