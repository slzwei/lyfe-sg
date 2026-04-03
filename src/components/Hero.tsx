"use client";

import { useEffect, useState } from "react";

export default function Hero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const show = (delay: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(32px)",
    transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  });

  return (
    <section className="relative pt-32 pb-24 sm:pt-40 sm:pb-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-orange-50/40 via-white to-white" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="max-w-2xl">
          <p
            className="inline-flex items-center gap-2 rounded-full bg-orange-50 border border-orange-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-orange-600"
            style={show(0.1)}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            Singapore
          </p>

          <h1
            className="mt-8 text-[2.75rem] sm:text-[3.5rem] lg:text-[4.25rem] font-extrabold tracking-tight text-stone-900 leading-[1.08]"
            style={show(0.2)}
          >
            Financial guidance
            <br />
            for every stage
            <br />
            of <span className="text-orange-500">life.</span>
          </h1>

          <p
            className="mt-7 text-lg sm:text-xl text-stone-500 max-w-xl leading-relaxed font-medium"
            style={show(0.35)}
          >
            We&apos;re a team of trusted financial representatives helping
            individuals and families in Singapore make informed decisions about
            their future.
          </p>

          <div
            className="mt-10 flex flex-col sm:flex-row gap-4"
            style={show(0.5)}
          >
            <a
              href="#contact"
              className="inline-flex items-center justify-center rounded-full bg-orange-500 px-8 py-4 text-[15px] font-semibold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 hover:shadow-xl transition-all"
            >
              Get Financial Advice
              <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
            <a
              href="#join"
              className="inline-flex items-center justify-center rounded-full border-2 border-stone-200 px-8 py-4 text-[15px] font-semibold text-stone-700 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 transition-all"
            >
              Join Our Team
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
