"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, -apple-system, sans-serif", margin: 0 }}>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
          <div style={{ maxWidth: 400, textAlign: "center", padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#292524" }}>
              Something went wrong
            </h2>
            <p style={{ marginTop: 8, fontSize: 14, color: "#78716c" }}>
              An unexpected error occurred. Please try again.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: 16,
                borderRadius: 12,
                backgroundColor: "#f97316",
                padding: "10px 24px",
                fontSize: 14,
                fontWeight: 600,
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
