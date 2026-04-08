"use client";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(month: number, year: number) {
  if (!month || !year) return 31;
  return new Date(year, month, 0).getDate();
}

export default function DateDropdownPicker({
  value,
  onChange,
  yearStart,
  yearEnd,
  yearOrder = "desc",
  className,
  error,
}: {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (v: string) => void;
  yearStart: number;
  yearEnd: number;
  yearOrder?: "asc" | "desc";
  className?: string;
  error?: boolean;
}) {
  const [y, m, d] = value ? value.split("-").map(Number) : [0, 0, 0];

  const years: number[] = [];
  if (yearOrder === "desc") {
    for (let i = yearEnd; i >= yearStart; i--) years.push(i);
  } else {
    for (let i = yearStart; i <= yearEnd; i++) years.push(i);
  }

  const maxDay = daysInMonth(m, y);
  const days: number[] = [];
  for (let i = 1; i <= maxDay; i++) days.push(i);

  function emit(ny: number, nm: number, nd: number) {
    if (!ny || !nm || !nd) {
      // Partial selection — store what we have so the other dropdowns stay in sync
      // but only emit a full date string when all 3 are set
      if (ny && nm && nd) {
        onChange(
          `${ny}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`
        );
      } else {
        // Store partial as empty — dropdowns maintain local state via value parsing
        onChange(
          ny || nm || nd
            ? `${ny || "0000"}-${String(nm || 0).padStart(2, "0")}-${String(nd || 0).padStart(2, "0")}`
            : ""
        );
      }
      return;
    }
    // Clamp day if month changed
    const clamped = Math.min(nd, daysInMonth(nm, ny));
    onChange(
      `${ny}-${String(nm).padStart(2, "0")}-${String(clamped).padStart(2, "0")}`
    );
  }

  const selectBase =
    "h-12 rounded-xl border bg-stone-50 px-2 text-base outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
  const borderClass = error
    ? " !border-red-400 !bg-red-50"
    : " border-stone-200";

  return (
    <div className={`flex gap-2 ${className || ""}`}>
      <select
        className={`${selectBase}${borderClass} w-[72px] shrink-0`}
        value={d || ""}
        onChange={(e) => emit(y, m, Number(e.target.value))}
      >
        <option value="">Day</option>
        {days.map((day) => (
          <option key={day} value={day}>
            {day}
          </option>
        ))}
      </select>
      <select
        className={`${selectBase}${borderClass} min-w-0 flex-1`}
        value={m || ""}
        onChange={(e) => emit(y, Number(e.target.value), d)}
      >
        <option value="">Month</option>
        {MONTHS.map((label, idx) => (
          <option key={label} value={idx + 1}>
            {label}
          </option>
        ))}
      </select>
      <select
        className={`${selectBase}${borderClass} w-[88px] shrink-0`}
        value={y || ""}
        onChange={(e) => emit(Number(e.target.value), m, d)}
      >
        <option value="">Year</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}
