"use client";

const COLORS = {
  D: "#2B8C8C",
  I: "#7B5EA7",
  S: "#D4876C",
  C: "#4A7FB5",
};

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
  const cx = 200;
  const cy = 200;
  const outerR = 160;

  // Scale scores to radii (min 30% of outer, max 100%)
  const maxPct = Math.max(d, i, s, c, 1);
  const scale = (pct: number) => 50 + (pct / maxPct) * (outerR - 50);

  const rD = scale(d);
  const rI = scale(i);
  const rS = scale(s);
  const rC = scale(c);

  // Quadrant arcs — each is a pie wedge
  // D = upper-left (90°–180°), I = upper-right (0°–90°)
  // S = lower-right (270°–360°), C = lower-left (180°–270°)
  function wedgePath(
    startAngle: number,
    endAngle: number,
    radius: number
  ): string {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy - radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy - radius * Math.sin(endRad);
    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 0 0 ${x2} ${y2} Z`;
  }

  // Dot position from angle
  const dotR = outerR * 0.65;
  const dotAngleRad = (angle * Math.PI) / 180;
  const dotX = cx + dotR * Math.cos(dotAngleRad);
  const dotY = cy - dotR * Math.sin(dotAngleRad);

  return (
    <div className="mx-auto w-full max-w-sm">
      <svg viewBox="0 0 400 400" className="w-full">
        {/* Background circle */}
        <circle
          cx={cx}
          cy={cy}
          r={outerR}
          fill="none"
          stroke="#e7e5e4"
          strokeWidth="1"
        />

        {/* Quadrant wedges */}
        {/* I = upper-right: 0° to 90° */}
        <path d={wedgePath(0, 90, rI)} fill={COLORS.I} opacity={0.25} />
        {/* D = upper-left: 90° to 180° */}
        <path d={wedgePath(90, 180, rD)} fill={COLORS.D} opacity={0.25} />
        {/* C = lower-left: 180° to 270° */}
        <path d={wedgePath(180, 270, rC)} fill={COLORS.C} opacity={0.25} />
        {/* S = lower-right: 270° to 360° */}
        <path d={wedgePath(270, 360, rS)} fill={COLORS.S} opacity={0.25} />

        {/* Filled wedges proportional to score */}
        <path d={wedgePath(0, 90, rI)} fill={COLORS.I} opacity={0.5} />
        <path d={wedgePath(90, 180, rD)} fill={COLORS.D} opacity={0.5} />
        <path d={wedgePath(180, 270, rC)} fill={COLORS.C} opacity={0.5} />
        <path d={wedgePath(270, 360, rS)} fill={COLORS.S} opacity={0.5} />

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

        {/* Inner circles for reference */}
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
        <text
          x={cx - outerR * 0.5}
          y={cy - outerR * 0.5}
          textAnchor="middle"
          className="text-2xl font-bold"
          fill={COLORS.D}
        >
          D
        </text>
        <text
          x={cx + outerR * 0.5}
          y={cy - outerR * 0.5}
          textAnchor="middle"
          className="text-2xl font-bold"
          fill={COLORS.I}
        >
          I
        </text>
        <text
          x={cx + outerR * 0.5}
          y={cy + outerR * 0.55}
          textAnchor="middle"
          className="text-2xl font-bold"
          fill={COLORS.S}
        >
          S
        </text>
        <text
          x={cx - outerR * 0.5}
          y={cy + outerR * 0.55}
          textAnchor="middle"
          className="text-2xl font-bold"
          fill={COLORS.C}
        >
          C
        </text>

        {/* Axis labels */}
        <text
          x={cx}
          y={cy - outerR - 12}
          textAnchor="middle"
          className="text-[10px]"
          fill="#78716c"
        >
          ACTIVE
        </text>
        <text
          x={cx}
          y={cy + outerR + 20}
          textAnchor="middle"
          className="text-[10px]"
          fill="#78716c"
        >
          RECEPTIVE
        </text>
        <text
          x={cx - outerR - 8}
          y={cy + 4}
          textAnchor="end"
          className="text-[10px]"
          fill="#78716c"
        >
          SKEPTICAL
        </text>
        <text
          x={cx + outerR + 8}
          y={cy + 4}
          textAnchor="start"
          className="text-[10px]"
          fill="#78716c"
        >
          AGREEABLE
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
    </div>
  );
}
