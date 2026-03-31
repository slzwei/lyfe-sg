"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function CandidateDetailError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="max-w-md text-center">
        <h2 className="text-lg font-semibold text-stone-800">
          Failed to load candidate
        </h2>
        <p className="mt-2 text-sm text-stone-500">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
