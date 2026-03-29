import { redis } from "./redis";


interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp in seconds
}

/**
 * Redis-based rate limiter using INCR + EXPIRE pattern.
 * No external dependencies (no Upstash). Works with self-hosted Redis.
 *
 * @param key - Unique identifier (e.g., `ai:${userId}`)
 * @param limit - Max requests allowed in the window
 * @param windowSeconds - Time window in seconds (default: 60)
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds = 60
): Promise<RateLimitResult> {
  const redisKey = `rate_limit:${key}`;
  const now = Math.floor(Date.now() / 1000);

  // Atomic: increment and set TTL if new key
  const current = await redis.incr(redisKey);

  if (current === 1) {
    // First request — set the expiration window
    await redis.expire(redisKey, windowSeconds);
  }

  const ttl = await redis.ttl(redisKey);
  const resetAt = now + Math.max(ttl, 0);

  if (current > limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  return {
    allowed: true,
    remaining: limit - current,
    resetAt,
  };
}

/**
 * Rate limit middleware for API routes.
 * Returns headers and status for 429 responses.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetAt),
    ...(result.allowed ? {} : { "Retry-After": String(result.resetAt - Math.floor(Date.now() / 1000)) }),
  };
}
