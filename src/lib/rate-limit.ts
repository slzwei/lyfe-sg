/**
 * Distributed rate limiter using Upstash Redis (serverless-safe).
 * Falls back to in-memory when UPSTASH env vars are not set.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const DEFAULT_WINDOW_MS = 60_000; // 1 minute

// ─── Upstash (distributed) ──────────────────────────────────────────────────

let redis: Redis | null = null;
const upstashLimiters = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

function getUpstashLimiter(maxRequests: number, windowMs: number): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;

  const key = `${maxRequests}:${windowMs}`;
  let limiter = upstashLimiters.get(key);
  if (!limiter) {
    const windowSec = Math.max(1, Math.round(windowMs / 1000));
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowSec} s`),
      prefix: "lyfe-sg-rl",
    });
    upstashLimiters.set(key, limiter);
  }
  return limiter;
}

// ─── In-memory fallback ─────────────────────────────────────────────────────

const memStore = new Map<string, { count: number; resetAt: number }>();

// Periodic cleanup to prevent unbounded growth
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memStore) {
      if (now > entry.resetAt) memStore.delete(key);
    }
  }, 60_000);
}

function checkMemoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const entry = memStore.get(key);

  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Rate limit check — uses Upstash Redis when available for true
 * cross-instance enforcement on serverless platforms (Vercel).
 * Falls back to in-memory when UPSTASH env vars are not set.
 */
export async function checkRateLimitAsync(
  key: string,
  maxRequests: number,
  windowMs = DEFAULT_WINDOW_MS
): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const upstash = getUpstashLimiter(maxRequests, windowMs);

  if (upstash) {
    try {
      const result = await upstash.limit(key);
      if (!result.success) {
        return { allowed: false, retryAfterMs: result.reset - Date.now() };
      }
      return { allowed: true };
    } catch (err) {
      console.warn("[rate-limit] Upstash failed, falling back to in-memory:", err);
      // Fall through to in-memory limiter
    }
  }

  return checkMemoryRateLimit(key, maxRequests, windowMs);
}
