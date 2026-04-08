"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitApplication } from "./actions";
import { broadcastProgress } from "@/lib/supabase/progress-broadcast";

const EDUCATION_OPTIONS = [
  "PSLE",
  "GCE N-Level",
  "GCE O-Level",
  "GCE A-Level",
  "ITE/NITEC",
  "Diploma",
  "Advanced Diploma",
  "Bachelor's Degree",
  "Postgraduate Diploma",
  "Master's Degree",
  "Doctorate (PhD)",
  "Professional Qualification",
  "Other",
];

const INPUT_CLASS =
  "h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-base outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-stone-700";

export default function JoinUsForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [highestEducation, setHighestEducation] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [dateAvailable, setDateAvailable] = useState("");
  const [honeypot, setHoneypot] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const result = await submitApplication({
      fullName,
      phone,
      email,
      highestEducation,
      dateOfBirth,
      dateAvailable,
      honeypot,
    });

    if (!result.success) {
      setError(result.error || "Something went wrong.");
      setSubmitting(false);
      return;
    }

    // Notify staff dashboard so the new candidate appears without refresh
    if (result.userId) broadcastProgress(result.userId, "form");

    router.push("/join-us/quiz");
  }

  // Max DOB = 18 years ago
  const maxDob = new Date();
  maxDob.setFullYear(maxDob.getFullYear() - 18);
  const maxDobStr = maxDob.toISOString().split("T")[0];

  // Min start date = today
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8">
      <div className="space-y-5">
        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className={LABEL_CLASS}>
            Full Name <span className="text-red-400">*</span>
          </label>
          <input
            id="fullName"
            type="text"
            required
            maxLength={255}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={INPUT_CLASS}
            placeholder="As per NRIC / passport"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className={LABEL_CLASS}>
            Phone Number <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2">
            <div className="flex h-12 items-center rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm text-stone-500">
              +65
            </div>
            <input
              id="phone"
              type="tel"
              required
              maxLength={8}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              className={INPUT_CLASS}
              placeholder="9123 4567"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className={LABEL_CLASS}>
            Email <span className="text-red-400">*</span>
          </label>
          <input
            id="email"
            type="email"
            required
            maxLength={255}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT_CLASS}
            placeholder="you@example.com"
          />
        </div>

        {/* Highest Education */}
        <div>
          <label htmlFor="education" className={LABEL_CLASS}>
            Highest Education <span className="text-red-400">*</span>
          </label>
          <select
            id="education"
            required
            value={highestEducation}
            onChange={(e) => setHighestEducation(e.target.value)}
            className={`${INPUT_CLASS} ${!highestEducation ? "text-stone-400" : ""}`}
          >
            <option value="" disabled>
              Select your highest qualification
            </option>
            {EDUCATION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Date of Birth */}
        <div>
          <label htmlFor="dob" className={LABEL_CLASS}>
            Date of Birth <span className="text-red-400">*</span>
          </label>
          <input
            id="dob"
            type="date"
            required
            max={maxDobStr}
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        {/* Earliest Start Date */}
        <div>
          <label htmlFor="startDate" className={LABEL_CLASS}>
            Earliest Start Date <span className="text-red-400">*</span>
          </label>
          <input
            id="startDate"
            type="date"
            required
            min={todayStr}
            value={dateAvailable}
            onChange={(e) => setDateAvailable(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        {/* Honeypot — hidden from real users */}
        <div className="hidden" aria-hidden="true">
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Continue to Personality Quiz →"}
      </button>

      <p className="mt-3 text-center text-xs text-stone-400">
        By submitting, you consent to Lyfe processing your data for recruitment purposes.
      </p>
    </form>
  );
}
