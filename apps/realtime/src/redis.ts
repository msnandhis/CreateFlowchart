import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on("error", (err) => {
  console.error("[Redis] Error:", err);
});

redis.on("connect", () => {
  console.log("[Redis] Connected.");
});

export async function closeRedis(): Promise<void> {
  await redis.quit();
}
