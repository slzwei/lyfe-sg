"use client";

import { useState } from "react";

const QUADRANTS = {
  D: { color: "#2B8C8C", startAngle: 90, endAngle: 180, labelPos: { x: -0.42, y: -0.42 } },
  I: { color: "#7B5EA7", startAngle: 0, endAngle: 90, labelPos: { x: 0.42, y: -0.42 } },
  S: { color: "#D4876C", startAngle: 270, endAngle: 360, labelPos: { x: 0.42, y: 0.48 } },
  C: { color: "#4A7FB5", startAngle: 180, endAngle: 270, labelPos: { x: -0.42, y: 0.48 } },
} as const;

type QuadrantKey = keyof typeof QUADRANTS;

/** Compute SVG text layout from a priority's angle. */
function labelLayout(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const anchor: "start" | "middle" | "end" =
    Math.abs(cos) < 0.4 ? "middle" : cos > 0 ? "start" : "end";
  const dx = Math.round(cos * 8);
  const dy = sin > 0.9 ? -8 : sin > 0.3 ? -2 : sin < -0.9 ? 14 : sin < -0.3 ? 10 : 4;
  return { anchor, dx, dy };
}

interface PriorityDef {
  name: string;
  angle: number;
  dimension: string;
}

interface CircumplexChartProps {
  d: number;
  i: number;
  s: number;
  c: number;
  angle: number;
  priorities: string[];
  priorityDefs: PriorityDef[];
  profileStrength: "strong" | "moderate" | "balanced";
  strengthPct: number;
}

export default function CircumplexChart({
  d,
  i,
  s,
  c,
  angle,
  priorities,
  priorityDefs,
  profileStrength,
  strengthPct,
}: CircumplexChartProps) {
  const [active, setActive] = useState<string | null>(null);

  const cx = 200;
  const cy = 200;
  const outerR = 140;

  // Dot distance from center encodes profile strength
  const normalizedMag = Math.min(strengthPct / 100, 1);
  const dotR = outerR * (0.15 + normalizedMag * 0.7);
  const dotAngleRad = (angle * Math.PI) / 180;
  const dotX = cx + dotR * Math.cos(dotAngleRad);
  const dotY = cy - dotR * Math.sin(dotAngleRad);

  // Primary dimension for bloom color
  const primaryDim: QuadrantKey = (() => {
    if (angle >= 0 && angle < 90) return "I";
    if (angle >= 90 && angle < 180) return "D";
    if (angle >= 180 && angle < 270) return "C";
    return "S";
  })();
  const bloomColor = QUADRANTS[primaryDim].color;
  const bloomR = outerR * (0.3 + normalizedMag * 0.5);

  // Pre-compute active tooltip data once
  const activePriority = active ? priorityDefs.find((p) => p.name === active) : null;
  const activeColor = activePriority
    ? QUADRANTS[activePriority.dimension as QuadrantKey]?.color
    : null;

  return (
    <div className="relative">
      <svg
        viewBox="0 -14 400 428"
        className="mx-auto w-full max-w-[340px]"
        style={{ overflow: "visible" }}
        role="img"
        aria-label={`DISC personality map. Drive ${d}%, Influence ${i}%, Support ${s}%, Clarity ${c}%.`}
        onClick={() => setActive(null)}
      >
        <defs>
          <radialGradient
            id="bloom"
            cx={dotX / 400}
            cy={dotY / 400}
            r={bloomR / 400}
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0%" stopColor={bloomColor} stopOpacity={0.22} />
            <stop offset="50%" stopColor={bloomColor} stopOpacity={0.08} />
            <stop offset="100%" stopColor={bloomColor} stopOpacity={0} />
          </radialGradient>
          <filter id="dotGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background quadrant tints */}
        {(Object.keys(QUADRANTS) as QuadrantKey[]).map((key) => {
          const q = QUADRANTS[key];
          const startRad = (q.startAngle * Math.PI) / 180;
          const endRad = (q.endAngle * Math.PI) / 180;
          const x1 = cx + outerR * Math.cos(startRad);
          const y1 = cy - outerR * Math.sin(startRad);
          const x2 = cx + outerR * Math.cos(endRad);
          const y2 = cy - outerR * Math.sin(endRad);
          return (
            <path
              key={`bg-${key}`}
              d={`M ${cx} ${cy} L ${x1} ${y1} A ${outerR} ${outerR} 0 0 0 ${x2} ${y2} Z`}
              fill={q.color}
              opacity={0.06}
            />
          );
        })}

        {/* Bloom overlay — hide for balanced profiles where it's just noise */}
        {profileStrength !== "balanced" && (
          <circle cx={dotX} cy={dotY} r={bloomR} fill="url(#bloom)" />
        )}

        {/* Outer circle */}
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="#d6d3d1" strokeWidth="1.5" />

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

        {/* Axis lines */}
        <line x1={cx - outerR} y1={cy} x2={cx + outerR} y2={cy} stroke="#d6d3d1" strokeWidth="0.75" />
        <line x1={cx} y1={cy - outerR} x2={cx} y2={cy + outerR} stroke="#d6d3d1" strokeWidth="0.75" />

        {/* Quadrant letters */}
        {(Object.keys(QUADRANTS) as QuadrantKey[]).map((key) => {
          const q = QUADRANTS[key];
          const dimmed = active !== null && active !== key;
          return (
            <text
              key={key}
              x={cx + outerR * q.labelPos.x}
              y={cy + outerR * q.labelPos.y}
              textAnchor="middle"
              className="pointer-events-none select-none text-lg font-bold transition-opacity duration-200"
              fill={q.color}
              opacity={dimmed ? 0.2 : 0.6}
            >
              {key}
            </text>
          );
        })}

        {/* Priority labels around the edge */}
        {priorityDefs.map((p) => {
          const isUserPriority = priorities.includes(p.name);
          const isSelected = active === p.name;
          const layout = labelLayout(p.angle);
          const labelR = outerR + 16;
          const rad = (p.angle * Math.PI) / 180;
          const lx = cx + labelR * Math.cos(rad) + layout.dx;
          const ly = cy - labelR * Math.sin(rad) + layout.dy;
          const dim = p.dimension as QuadrantKey;

          return (
            <text
              key={p.name}
              x={lx}
              y={ly}
              textAnchor={layout.anchor}
              className={`cursor-pointer select-none transition-all duration-200 ${
                isUserPriority ? "text-[10px] font-bold" : "text-[9px] font-medium"
              }`}
              fill={isUserPriority ? QUADRANTS[dim].color : "#c4c0b8"}
              opacity={isSelected ? 1 : isUserPriority ? 0.9 : 0.4}
              onClick={(e) => {
                e.stopPropagation();
                setActive((prev) => (prev === p.name ? null : p.name));
              }}
              onMouseEnter={() => setActive(p.name)}
              onMouseLeave={() => setActive(null)}
            >
              {p.name}
            </text>
          );
        })}

        {/* User dot */}
        <circle cx={dotX} cy={dotY} r={7} fill="white" stroke="#292524" strokeWidth="2.5" filter="url(#dotGlow)" />
        <circle cx={dotX} cy={dotY} r={3} fill="#292524" />

        {/* Balanced pulse ring */}
        {profileStrength === "balanced" && (
          <circle
            cx={dotX}
            cy={dotY}
            r={14}
            fill="none"
            stroke="#a8a29e"
            strokeWidth="1"
            opacity={0.4}
            strokeDasharray="2 2"
          >
            <animate attributeName="r" values="12;18;12" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0.1;0.4" dur="3s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>

      {/* Tooltip for priority labels — only rendered when active */}
      {activePriority && activeColor && (
        <div
          className="mx-auto mt-1 max-w-[260px] rounded-xl border px-4 py-2.5 text-center animate-in fade-in duration-200"
          style={{
            borderColor: activeColor + "30",
            backgroundColor: activeColor + "08",
          }}
        >
          <p className="text-sm font-semibold" style={{ color: activeColor }}>
            {activePriority.name}
            {priorities.includes(activePriority.name) && (
              <span className="ml-1.5 text-[10px] font-medium opacity-60">Your priority</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
