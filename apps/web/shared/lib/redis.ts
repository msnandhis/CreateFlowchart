import Redis from "ioredis";

// Singleton Redis connection for the web app
// Used by: rate-limit, BullMQ, session cache
const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

function createRedisConnection(): Redis {
  const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    retryStrategy(times: number) {
      const delay = Math.min(times * 200, 5000);
      return delay;
    },
  });

  redis.on("error", (err) => {
    console.error("[Redis] Connection error:", err.message);
  });

  redis.on("connect", () => {
    console.log("[Redis] Connected successfully");
  });

  return redis;
}

// In development, reuse connections across hot reloads
export const redis: Redis =
  globalForRedis.redis ?? createRedisConnection();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export default redis;
