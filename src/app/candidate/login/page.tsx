"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sendOtp, validateInviteToken } from "../actions";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Invite token state
  const [tokenChecking, setTokenChecking] = useState(true);
  const [hasValidToken, setHasValidToken] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [position, setPosition] = useState("");

  // Show error from proxy redirect (e.g. wrong role)
  useEffect(() => {
    if (searchParams.get("error") === "unauthorized_role") {
      setError("This portal is for candidates only. Please use the correct portal for your role.");
    }
  }, [searchParams]);

  // Check for invite token
  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setTokenChecking(false);
      return;
    }

    validateInviteToken(token).then((result) => {
      if (result.valid) {
        setHasValidToken(true);
        setCandidateName(result.candidateName || "");
        setPosition(result.position || "");
        sessionStorage.setItem("invite_token", token);
      } else {
        setError(result.error || "Invalid invitation link.");
      }
      setTokenChecking(false);
    });
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fullPhone = `+65${phone.replace(/\s/g, "")}`;
    const result = await sendOtp(fullPhone);

    if (result.success) {
      sessionStorage.setItem("otp_phone", fullPhone);
      router.push("/candidate/verify");
    } else {
      setError(result.error || "Something went wrong.");
    }
    setLoading(false);
  }

  if (tokenChecking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-stone-400">Verifying invitation…</p>
      </div>
    );
  }

  // No valid token — show invite-only gate
  if (!hasValidToken) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50">
                <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-stone-800">Invite Only</h1>
              <p className="mt-3 text-sm leading-relaxed text-stone-500">
                This portal is invite-only. Please check your email for an invitation link to get started.
              </p>
              {error && (
                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Valid token — show personalized welcome + phone input
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-stone-800">
              {candidateName ? `Hi ${candidateName}` : "Welcome"}
            </h1>
            <p className="mt-2 text-sm text-stone-500">
              {position
                ? `You've been invited to apply for ${position}`
                : "You've been invited to apply"}
            </p>
            <p className="mt-1 text-sm text-stone-400">
              Enter your mobile number to verify your identity
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block text-sm font-medium text-stone-700"
              >
                Mobile Number
              </label>
              <div className="flex gap-2">
                <div className="flex h-12 items-center rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm text-stone-500">
                  +65
                </div>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={8}
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setPhone(val);
                  }}
                  placeholder="8123 4567"
                  className="h-12 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-4 text-base outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={phone.length !== 8 || loading}
              className="h-12 w-full rounded-xl bg-orange-500 font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending OTP…" : "Send OTP"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-stone-400">
            We&apos;ll send a 6-digit verification code to your phone.
          </p>
        </div>
      </div>
    </div>
  );
}
