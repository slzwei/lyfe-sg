"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { emockVerifyOtp, emockSendOtp } from "../actions";

export default function EmockVerifyPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem("emock_otp_phone");
    if (!stored) {
      router.replace("/emock/login");
      return;
    }
    setPhone(stored);
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = useCallback(
    async (digits: string[]) => {
      const token = digits.join("");
      if (token.length !== 6 || !phone) return;

      setError("");
      setLoading(true);

      const result = await emockVerifyOtp(phone, token);
      if (result.success) {
        sessionStorage.removeItem("emock_otp_phone");
        router.push("/emock");
      } else {
        setError(result.error || "Verification failed.");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
      setLoading(false);
    },
    [phone, router]
  );

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value && index === 5 && newCode.every((d) => d !== "")) {
      handleSubmit(newCode);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 0) return;

    const newCode = [...code];
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || "";
    }
    setCode(newCode);

    const nextEmpty = newCode.findIndex((d) => d === "");
    inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();

    if (pasted.length === 6) {
      handleSubmit(newCode);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || !phone) return;
    setCooldown(60);
    await emockSendOtp(phone);
  }

  const maskedPhone = phone
    ? `${phone.slice(0, 4)} •••• ${phone.slice(-2)}`
    : "";

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-stone-800">
              Enter verification code
            </h1>
            <p className="mt-2 text-sm text-stone-500">
              We sent a 6-digit code to {maskedPhone}
            </p>
          </div>

          <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={loading}
                className="h-14 w-11 rounded-xl border border-stone-200 bg-stone-50 text-center text-xl font-semibold outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:opacity-50"
                autoFocus={i === 0}
              />
            ))}
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">
              {error}
            </p>
          )}

          {loading && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-stone-200 border-t-orange-500" />
              <p className="text-sm text-stone-500">Verifying...</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={handleResend}
              disabled={cooldown > 0}
              className="text-sm text-orange-500 hover:text-orange-600 disabled:text-stone-400"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          </div>

          <button
            onClick={() => {
              sessionStorage.removeItem("emock_otp_phone");
              router.push("/emock/login");
            }}
            className="mt-4 block w-full text-center text-sm text-stone-400 hover:text-stone-600"
          >
            Use a different number
          </button>
        </div>
      </div>
    </div>
  );
}
