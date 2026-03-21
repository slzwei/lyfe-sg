"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { staffSendOtp, staffLogin } from "../actions";

export default function StaffLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"phone" | "admin">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fullPhone = `+65${phone.replace(/\s/g, "")}`;
    const result = await staffSendOtp(fullPhone);

    if (result.success) {
      sessionStorage.setItem("staff_otp_phone", fullPhone);
      router.push("/staff/verify");
    } else {
      setError(result.error || "Something went wrong.");
    }
    setLoading(false);
  }

  async function handleAdminSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await staffLogin(email, password);
    if (result.success) {
      router.push("/staff/dashboard");
    } else {
      setError(result.error || "Invalid credentials.");
    }
    setLoading(false);
  }

  function switchMode() {
    setError("");
    setMode(mode === "phone" ? "admin" : "phone");
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-stone-800">Staff Login</h1>
            <p className="mt-2 text-sm text-stone-500">
              {mode === "phone"
                ? "Sign in with your mobile number"
                : "Admin sign in"}
            </p>
          </div>

          {mode === "phone" ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
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
                    className="h-12 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
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
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-stone-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@lyfe.sg"
                  className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  autoFocus
                  autoComplete="email"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-stone-700"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!email || !password || loading}
                className="h-12 w-full rounded-xl bg-orange-500 font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          )}

          <div className="mt-4 text-center">
            <button
              onClick={switchMode}
              className="text-sm text-stone-400 hover:text-orange-500 transition-colors"
            >
              {mode === "phone" ? "Admin login" : "Sign in with phone"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
