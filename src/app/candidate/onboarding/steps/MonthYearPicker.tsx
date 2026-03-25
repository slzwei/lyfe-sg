"use client";

import { useState, useRef, useEffect } from "react";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function MonthYearPicker({
  value,
  onChange,
  className,
}: {
  value: string; // "YYYY-MM" or ""
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Derive displayed year from value, default to current year
  const today = new Date();
  const [year, month] = value
    ? value.split("-").map(Number)
    : [today.getFullYear(), today.getMonth() + 1];
  const [viewYear, setViewYear] = useState(year);

  // Sync viewYear when value changes externally
  useEffect(() => {
    if (value) setViewYear(Number(value.split("-")[0]));
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function pick(m: number) {
    const mm = String(m).padStart(2, "0");
    onChange(`${viewYear}-${mm}`);
    setOpen(false);
  }

  // Format display value
  const display = value
    ? `${MONTHS[month - 1]} ${year}`
    : "";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); if (!open && !value) setViewYear(today.getFullYear()); }}
        className={className}
      >
        <span className={value ? "text-stone-800" : "text-stone-400"}>
          {display || "---------- ----"}
        </span>
        {/* calendar icon */}
        <svg className="ml-auto h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-stone-200 bg-white p-3 shadow-lg">
          {/* Year navigation */}
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setViewYear(viewYear - 1)} className="rounded-lg p-1 text-stone-500 hover:bg-stone-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-semibold text-stone-700">{viewYear}</span>
            <button type="button" onClick={() => setViewYear(viewYear + 1)} className="rounded-lg p-1 text-stone-500 hover:bg-stone-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          {/* Month grid */}
          <div className="grid grid-cols-4 gap-1">
            {MONTHS.map((label, idx) => {
              const m = idx + 1;
              const selected = value === `${viewYear}-${String(m).padStart(2, "0")}`;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => pick(m)}
                  className={`rounded-lg py-1.5 text-xs font-medium transition-colors ${
                    selected
                      ? "bg-orange-500 text-white"
                      : "text-stone-600 hover:bg-orange-50 hover:text-orange-600"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {/* Footer */}
          <div className="mt-2 flex justify-between">
            <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="text-xs font-medium text-orange-500 hover:text-orange-600">Clear</button>
            <button type="button" onClick={() => { setViewYear(today.getFullYear()); pick(today.getMonth() + 1); }} className="text-xs font-medium text-orange-500 hover:text-orange-600">This month</button>
          </div>
        </div>
      )}
    </div>
  );
}
