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
    <section className="relative min-h-[92vh] flex items-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-orange-50" />

      {/* Decorative blobs */}
      <div className="absolute top-[10%] right-[5%] w-[500px] h-[500px] blob bg-orange-200/30" />
      <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] blob bg-orange-100/40" />
      <div className="absolute bottom-[5%] right-[35%] w-[200px] h-[200px] blob bg-orange-300/20" />
      <div className="absolute top-[60%] left-[5%] w-[150px] h-[150px] blob bg-orange-100/30" />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #1c1917 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Content */}
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 py-32 sm:py-40 w-full">
        <div className="max-w-2xl">
          <p
            className="inline-flex items-center gap-2 rounded-full bg-orange-50 border border-orange-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-orange-600"
            style={show(0.1)}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            Coming Soon
          </p>

          <h1
            className="mt-8 text-[2.75rem] sm:text-[3.5rem] lg:text-[4.25rem] font-extrabold tracking-tight text-stone-900 leading-[1.08]"
            style={show(0.2)}
          >
            We&apos;re{" "}
            <span className="relative">
              <span className="relative z-10 text-orange-500">revamping.</span>
              <span className="absolute bottom-1 left-0 right-0 h-3 bg-orange-100 -z-0 rounded-sm" />
            </span>
          </h1>

          <p
            className="mt-7 text-lg sm:text-xl text-stone-500 max-w-xl leading-relaxed font-medium"
            style={show(0.35)}
          >
            We&apos;re giving Lyfe a fresh new look.
            Stay tuned &mdash; something better is on the way.
          </p>

          <div
            className="mt-10 flex flex-col sm:flex-row gap-4"
            style={show(0.5)}
          >
            <a
              href="#contact"
              className="inline-flex items-center justify-center rounded-full bg-orange-500 px-8 py-4 text-[15px] font-semibold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30 transition-all"
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

        {/* Floating badge — right side */}
        <div
          className="hidden lg:block absolute right-10 top-1/2 -translate-y-1/2"
          style={show(0.6)}
        >
          <div className="relative">
            <div className="w-64 rounded-3xl bg-white/80 backdrop-blur-sm border border-stone-100 p-7 shadow-xl shadow-stone-200/50">
              <span
                className="font-display text-4xl text-orange-500 block mb-3"
                style={{ letterSpacing: "1px" }}
              >
                Lyfe
              </span>
              <p className="text-sm font-semibold text-stone-800">
                Financial guidance
                <br />
                for every stage of life.
              </p>
              <div className="mt-5 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-400" />
                <span className="text-xs font-medium text-stone-400">
                  Accepting new clients
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom curve */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 64" fill="none" className="w-full h-auto">
          <path d="M0 64h1440V32C1200 56 960 64 720 56S240 24 0 32v32z" fill="white" />
        </svg>
      </div>
    </section>
  );
}
