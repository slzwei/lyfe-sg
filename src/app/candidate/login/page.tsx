"use client";

import { useState, useEffect, useRef } from "react";
import { acceptInvite, validateInviteToken } from "../actions";

export default function LoginPage() {
  const [status, setStatus] = useState<"checking" | "processing" | "error" | "no-token">("checking");
  const [error, setError] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const processed = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setStatus("no-token");
      return;
    }

    // Prevent double-processing in React strict mode
    if (processed.current) return;
    processed.current = true;

    // First validate to get the candidate name for display, then accept
    validateInviteToken(token).then(async (result) => {
      if (!result.valid) {
        setError(result.error || "Invalid invitation link.");
        setStatus("error");
        return;
      }

      setCandidateName(result.candidateName || "");
      setStatus("processing");

      const acceptResult = await acceptInvite(token);
      // acceptInvite redirects on success — we only reach here on error
      if (!acceptResult.success) {
        setError(acceptResult.error || "Something went wrong.");
        setStatus("error");
      }
    });
  }, []);

  // Loading state — validating token
  if (status === "checking") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-stone-200 border-t-orange-500" />
          <p className="text-sm text-stone-400">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  // Processing state — creating account
  if (status === "processing") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-stone-200 border-t-orange-500" />
              <div className="text-center">
                <h1 className="text-xl font-bold text-stone-800">
                  {candidateName ? `Welcome, ${candidateName}` : "Welcome"}
                </h1>
                <p className="mt-2 text-sm text-stone-500">
                  Setting up your application...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-stone-800">Unable to proceed</h1>
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
              <p className="mt-4 text-sm text-stone-500">
                If you need assistance, please contact the person who sent you the invitation.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No token — invite-only gate
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
          </div>
        </div>
      </div>
    </div>
  );
}
