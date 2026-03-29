import Redis from "ioredis";

/**
 * Shared Redis instance for the Next.js app.
 * Used for rate-limiting (LLM calls) and potentially caching.
 */
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Avoid connecting during build if possible, or handle failure gracefully
export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableOfflineQueue: true, // Allow commands to be queued while offline
  retryStrategy(times) {
    // If it's a build environment, don't keep retrying forever
    if (process.env.NEXT_PHASE === "phase-production-build") {
      if (times > 3) return null; // Stop retrying after 3 attempts during build
    }
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on("error", (err) => {
  // Silent error during build to prevent crashing
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }
  console.error("[Redis] Error:", err);
});

redis.on("connect", () => {
  console.log("[Redis] Connected.");
});

