"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { emockSendOtp } from "../actions";

export default function EmockLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fullPhone = `+65${phone.replace(/\s/g, "")}`;
    const result = await emockSendOtp(fullPhone);

    if (result.success) {
      sessionStorage.setItem("emock_otp_phone", fullPhone);
      router.push("/emock/verify");
    } else {
      setError(result.error || "Something went wrong.");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-stone-800">
              Sign in to eMock
            </h1>
            <p className="mt-2 text-sm text-stone-500">
              Enter your mobile number to get started
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
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
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
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
