/**
 * Simple in-memory sliding window rate limiter.
 * Effective per serverless instance — upgrade to Upstash Redis for cross-instance enforcement.
 */

const DEFAULT_WINDOW_MS = 60_000; // 1 minute

const store = new Map<string, { count: number; resetAt: number }>();

// Periodic cleanup to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000);

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs = DEFAULT_WINDOW_MS
): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true };
}
