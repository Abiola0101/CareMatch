import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Returns null if Upstash env vars are not configured (dev / missing setup).
 * In that case callers skip rate limiting gracefully.
 */
function makeRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = makeRedis();

function limiter(requests: number, window: `${number} ${"s" | "m" | "h" | "d"}`) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: false,
  });
}

/** Auth signup — 5 attempts per IP per hour */
export const signupLimiter = limiter(5, "1 h");

/** Match run — 20 runs per user per hour */
export const matchLimiter = limiter(20, "1 h");

/** Contact form — 5 submissions per IP per hour */
export const contactLimiter = limiter(5, "1 h");

/** Stripe checkout — 10 per user per hour */
export const checkoutLimiter = limiter(10, "1 h");

/**
 * Check the rate limit for a given identifier (IP or user ID).
 * Returns { limited: true } if the limit is exceeded, { limited: false } otherwise.
 * If the limiter is null (Upstash not configured), always returns { limited: false }.
 */
export async function checkRateLimit(
  limiterInstance: Ratelimit | null,
  identifier: string,
): Promise<{ limited: boolean; remaining?: number }> {
  if (!limiterInstance) return { limited: false };
  const { success, remaining } = await limiterInstance.limit(identifier);
  return { limited: !success, remaining };
}
