"use client";

import { useState } from "react";

const QUADRANTS = {
  D: {
    color: "#2B8C8C",
    label: "Drive",
    desc: "Decisive, competitive, and results-oriented. Focuses on getting things done.",
    startAngle: 90,
    endAngle: 180,
    labelOffset: { x: -0.45, y: -0.45 },
  },
  I: {
    color: "#7B5EA7",
    label: "Influence",
    desc: "Enthusiastic, optimistic, and people-oriented. Loves collaboration and energy.",
    startAngle: 0,
    endAngle: 90,
    labelOffset: { x: 0.45, y: -0.45 },
  },
  S: {
    color: "#D4876C",
    label: "Support",
    desc: "Patient, reliable, and team-oriented. Values harmony and consistency.",
    startAngle: 270,
    endAngle: 360,
    labelOffset: { x: 0.45, y: 0.52 },
  },
  C: {
    color: "#4A7FB5",
    label: "Clarity",
    desc: "Analytical, precise, and quality-focused. Prioritises accuracy and logic.",
    startAngle: 180,
    endAngle: 270,
    labelOffset: { x: -0.45, y: 0.52 },
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

  const cx = 230;
  const cy = 210;
  const outerR = 150;
  const maxR = outerR * 0.88; // wedges stay inside the circle

  const scores: Record<QuadrantKey, number> = { D: d, I: i, S: s, C: c };
  const maxPct = Math.max(d, i, s, c, 1);
  const scale = (pct: number) => 40 + (pct / maxPct) * (maxR - 40);

  function wedgePath(startAngle: number, endAngle: number, radius: number) {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy - radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy - radius * Math.sin(endRad);
    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 0 0 ${x2} ${y2} Z`;
  }

  // User dot
  const dotR = outerR * 0.65;
  const dotAngleRad = (angle * Math.PI) / 180;
  const dotX = cx + dotR * Math.cos(dotAngleRad);
  const dotY = cy - dotR * Math.sin(dotAngleRad);

  return (
    <div className="mx-auto w-full max-w-sm">
      <svg viewBox="0 0 460 440" className="w-full">
        {/* Outer circle */}
        <circle
          cx={cx}
          cy={cy}
          r={outerR}
          fill="none"
          stroke="#e7e5e4"
          strokeWidth="1"
        />

        {/* Quadrant wedges */}
        {(Object.keys(QUADRANTS) as QuadrantKey[]).map((key) => {
          const q = QUADRANTS[key];
          const r = scale(scores[key]);
          const isHovered = hovered === key;
          return (
            <path
              key={key}
              d={wedgePath(q.startAngle, q.endAngle, r)}
              fill={q.color}
              opacity={isHovered ? 0.7 : 0.4}
              className="cursor-pointer transition-opacity duration-200"
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
          strokeWidth="1"
        />
        <line
          x1={cx}
          y1={cy - outerR}
          x2={cx}
          y2={cy + outerR}
          stroke="#d6d3d1"
          strokeWidth="1"
        />

        {/* Reference circles */}
        <circle
          cx={cx}
          cy={cy}
          r={outerR * 0.33}
          fill="none"
          stroke="#e7e5e4"
          strokeWidth="0.5"
          strokeDasharray="4 4"
        />
        <circle
          cx={cx}
          cy={cy}
          r={outerR * 0.66}
          fill="none"
          stroke="#e7e5e4"
          strokeWidth="0.5"
          strokeDasharray="4 4"
        />

        {/* Quadrant labels */}
        {(Object.keys(QUADRANTS) as QuadrantKey[]).map((key) => {
          const q = QUADRANTS[key];
          return (
            <text
              key={key}
              x={cx + outerR * q.labelOffset.x}
              y={cy + outerR * q.labelOffset.y}
              textAnchor="middle"
              className="pointer-events-none select-none text-2xl font-bold"
              fill={q.color}
              opacity={hovered && hovered !== key ? 0.3 : 1}
            >
              {key}
            </text>
          );
        })}

        {/* Axis labels */}
        <text
          x={cx}
          y={cy - outerR - 16}
          textAnchor="middle"
          className="text-[10px] uppercase tracking-widest"
          fill="#78716c"
        >
          Active
        </text>
        <text
          x={cx}
          y={cy + outerR + 24}
          textAnchor="middle"
          className="text-[10px] uppercase tracking-widest"
          fill="#78716c"
        >
          Receptive
        </text>
        <text
          x={cx - outerR - 12}
          y={cy + 4}
          textAnchor="end"
          className="text-[10px] uppercase tracking-widest"
          fill="#78716c"
        >
          Skeptical
        </text>
        <text
          x={cx + outerR + 12}
          y={cy + 4}
          textAnchor="start"
          className="text-[10px] uppercase tracking-widest"
          fill="#78716c"
        >
          Agreeable
        </text>

        {/* User dot */}
        <circle
          cx={dotX}
          cy={dotY}
          r={8}
          fill="white"
          stroke="#1c1917"
          strokeWidth="3"
        />
        <circle cx={dotX} cy={dotY} r={4} fill="#1c1917" />
      </svg>

      {/* Hover tooltip */}
      <div
        className={`mx-auto max-w-xs rounded-xl border border-stone-200 bg-white px-4 py-3 text-center shadow-sm transition-all duration-200 ${
          hovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"
        }`}
        style={{ minHeight: 72 }}
      >
        {hovered && (
          <>
            <p className="text-sm font-semibold" style={{ color: QUADRANTS[hovered].color }}>
              {QUADRANTS[hovered].label} — {scores[hovered]}%
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {QUADRANTS[hovered].desc}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
