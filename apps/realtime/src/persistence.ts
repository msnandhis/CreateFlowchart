import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const SNAPSHOT_PREFIX = "flowchart:snapshot:";
const SNAPSHOT_TTL = 60 * 60 * 24 * 7;

export interface RoomPersistence {
  store(roomName: string, data: Buffer): Promise<void>;
  load(roomName: string): Promise<Buffer | null>;
  delete(roomName: string): Promise<void>;
}

class RedisPersistence implements RoomPersistence {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    });

    this.redis.on("error", (err) => {
      console.error("[Persistence] Redis error:", err);
    });

    this.redis.on("connect", () => {
      console.log("[Persistence] Connected to Redis");
    });
  }

  private key(roomName: string): string {
    return `${SNAPSHOT_PREFIX}${roomName}`;
  }

  async store(roomName: string, data: Buffer): Promise<void> {
    await this.redis.set(
      this.key(roomName),
      data.toString("base64"),
      "EX",
      SNAPSHOT_TTL,
    );
  }

  async load(roomName: string): Promise<Buffer | null> {
    const stored = await this.redis.get(this.key(roomName));
    if (!stored) return null;

    try {
      return Buffer.from(stored, "base64");
    } catch {
      return null;
    }
  }

  async delete(roomName: string): Promise<void> {
    await this.redis.del(this.key(roomName));
  }

  close(): void {
    this.redis.disconnect();
  }
}

let persistenceInstance: RoomPersistence | null = null;

export function getPersistence(): RoomPersistence | null {
  if (!persistenceInstance) {
    try {
      persistenceInstance = new RedisPersistence();
    } catch (err) {
      console.error(
        "[Persistence] Failed to initialize Redis persistence:",
        err,
      );
      return null;
    }
  }
  return persistenceInstance;
}

export function closePersistence(): void {
  if (persistenceInstance instanceof RedisPersistence) {
    persistenceInstance.close();
  }
}
