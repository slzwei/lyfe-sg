"use client";

import { useState, useTransition } from "react";
import AnimateIn from "./AnimateIn";

interface ContactProps {
  action?: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}

export default function Contact({ action }: ContactProps) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!action) {
      setSubmitted(true);
      return;
    }
    const formData = new FormData(e.currentTarget);
    setError("");
    startTransition(async () => {
      const result = await action(formData);
      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error || "Something went wrong.");
      }
    });
  }

  return (
    <section id="contact" className="relative py-28 sm:py-36">
      {/* Subtle warm background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-orange-50/30 to-white" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20">
          {/* Left */}
          <div>
            <AnimateIn>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500 mb-4">
                Get in Touch
              </p>
            </AnimateIn>
            <AnimateIn delay={0.1}>
              <h2 className="text-3xl sm:text-[2.5rem] font-extrabold tracking-tight text-stone-900 leading-tight">
                Let&apos;s have a<br />conversation
              </h2>
            </AnimateIn>
            <AnimateIn delay={0.2}>
              <p className="mt-5 text-base sm:text-lg text-stone-500 leading-relaxed max-w-md">
                Whether you&apos;re looking for financial advice or interested
                in joining our team, we&apos;d love to hear from you.
              </p>
            </AnimateIn>

            <AnimateIn delay={0.3}>
              <div className="mt-10 space-y-5">
                <a
                  href="mailto:hello@lyfe.sg"
                  className="flex items-center gap-4 rounded-xl bg-stone-50 p-4 hover:bg-orange-50 transition-colors group"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900">Email us</p>
                    <p className="text-sm text-stone-500">hello@lyfe.sg</p>
                  </div>
                </a>
                <div className="flex items-center gap-4 rounded-xl bg-stone-50 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-500">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900">Based in</p>
                    <p className="text-sm text-stone-500">Singapore</p>
                  </div>
                </div>
              </div>
            </AnimateIn>
          </div>

          {/* Right — form */}
          <AnimateIn delay={0.15}>
            <div className="rounded-3xl bg-white p-8 sm:p-10 border border-stone-100 shadow-xl shadow-stone-200/40">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-500 mb-5">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-stone-900">Thank you!</h3>
                  <p className="mt-2 text-sm text-stone-500">
                    We&apos;ve received your message and will get back to you shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-stone-700 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      className="block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none transition-all"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-stone-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      className="block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none transition-all"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="interest" className="block text-sm font-semibold text-stone-700 mb-2">
                      I&apos;m interested in
                    </label>
                    <select
                      id="interest"
                      name="interest"
                      className="block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none transition-all"
                    >
                      <option value="advice">Getting financial advice</option>
                      <option value="career">Joining the team</option>
                      <option value="other">Something else</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-semibold text-stone-700 mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      required
                      className="block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none transition-all resize-none"
                      placeholder="Tell us how we can help..."
                    />
                  </div>
                  {error && (
                    <p className="text-red-500 text-sm">{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full rounded-xl bg-orange-500 px-8 py-3.5 text-sm font-semibold text-white hover:bg-orange-600 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? "Sending..." : "Send Message"}
                  </button>
                </form>
              )}
            </div>
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}
