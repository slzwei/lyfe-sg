"use client";

import { useState, useEffect } from "react";
import { subscribeEmail } from "./actions";

export default function ComingSoon() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || submitting) return;

    setError("");
    setSubmitting(true);
    try {
      const result = await subscribeEmail(email);
      if (result.success) {
        setSubmitted(true);
        setEmail("");
      } else {
        setError(result.error || "Something went wrong.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0a]">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, #FF7600 0%, transparent 70%)",
            animation: "float 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full opacity-15"
          style={{
            background:
              "radial-gradient(circle, #FF9933 0%, transparent 70%)",
            animation: "float 10s ease-in-out infinite reverse",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-5"
          style={{
            background:
              "radial-gradient(circle, #FF7600 0%, transparent 60%)",
            animation: "pulse 6s ease-in-out infinite",
          }}
        />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div
        className={`relative z-10 text-center px-6 max-w-2xl mx-auto transition-all duration-1000 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Logo */}
        <h1
          className="font-display text-6xl sm:text-7xl md:text-8xl text-orange-500 mb-4 tracking-tight"
          style={{ textShadow: "0 0 60px rgba(255, 118, 0, 0.3)" }}
        >
          Lyfe
        </h1>

        {/* Tagline */}
        <p className="text-white/60 text-lg sm:text-xl font-light tracking-wide mb-2">
          Something great is brewing.
        </p>

        {/* Divider */}
        <div className="flex items-center justify-center gap-3 my-8">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-orange-500/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-orange-500/60" />
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-orange-500/40" />
        </div>

        {/* Email form */}
        {!submitted ? (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row items-center gap-3 max-w-sm mx-auto"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full sm:flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-400 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Sending..." : "Notify me"}
            </button>
          </form>
        ) : (
          <div
            className={`text-orange-400 text-sm font-medium transition-all duration-500 ${
              submitted ? "opacity-100" : "opacity-0"
            }`}
          >
            We&apos;ll keep you posted.
          </div>
        )}
        {!submitted && error && (
          <p className="mt-2 text-red-400 text-xs">{error}</p>
        )}

        {/* Footer links */}
        <div className="mt-16 flex items-center justify-center gap-6 text-white/20 text-xs">
          <span>&copy; {new Date().getFullYear()} Lyfe</span>
          <span className="w-1 h-1 rounded-full bg-white/10" />
          <span>Singapore</span>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -30px); }
        }
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
