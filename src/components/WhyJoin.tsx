"use client";

import AnimateIn from "./AnimateIn";

const reasons = [
  {
    title: "Uncapped earning potential",
    description:
      "Your income grows with your effort. There\u2019s no ceiling on what you can earn.",
  },
  {
    title: "Flexible schedule",
    description:
      "Design your own work-life balance. You decide when and how you work.",
  },
  {
    title: "Comprehensive training",
    description:
      "Structured training and mentorship whether you\u2019re new to finance or experienced.",
  },
  {
    title: "Meaningful impact",
    description:
      "Help families achieve financial security. The work you do genuinely changes lives.",
  },
  {
    title: "Backed by a trusted brand",
    description:
      "Represent one of Singapore\u2019s most trusted insurance brands with a strong product suite.",
  },
  {
    title: "Supportive team culture",
    description:
      "A collaborative team that celebrates wins together and supports each other.",
  },
];

export default function WhyJoin() {
  return (
    <section id="join" className="relative py-28 sm:py-36 bg-stone-900 overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-start">
          {/* Left column */}
          <div>
            <AnimateIn>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400 mb-4">
                Careers
              </p>
            </AnimateIn>
            <AnimateIn delay={0.1}>
              <h2 className="text-3xl sm:text-[2.5rem] font-extrabold tracking-tight text-white leading-tight">
                Build a career
                <br />
                that matters
              </h2>
            </AnimateIn>
            <AnimateIn delay={0.2}>
              <p className="mt-5 text-base sm:text-lg text-stone-400 leading-relaxed max-w-md">
                We&apos;re always looking for driven individuals who want to
                make a real difference. Whether you&apos;re a fresh graduate or
                exploring a career switch, there&apos;s a place for you at Lyfe.
              </p>
            </AnimateIn>
            <AnimateIn delay={0.3}>
              <a
                href="#contact"
                className="mt-9 inline-flex items-center justify-center rounded-full bg-orange-500 px-8 py-4 text-[15px] font-semibold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-400 transition-all"
              >
                Start Your Journey
                <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </AnimateIn>
          </div>

          {/* Right column */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {reasons.map((reason, i) => (
              <AnimateIn key={reason.title} delay={0.1 + i * 0.07}>
                <div className="group rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 hover:bg-white/10 hover:border-orange-500/30 transition-all duration-300 h-full">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/20 text-sm font-bold text-orange-400">
                    {i + 1}
                  </span>
                  <p className="mt-3 text-sm font-bold text-white">
                    {reason.title}
                  </p>
                  <p className="mt-1.5 text-xs text-stone-400 leading-relaxed">
                    {reason.description}
                  </p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
