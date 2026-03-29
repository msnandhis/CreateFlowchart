import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const SNAPSHOT_PREFIX = "flowchart:snapshot:";
const DOCUMENT_PREFIX = "flowchart:document:";
const SNAPSHOT_TTL = 60 * 60 * 24 * 7;

export interface PersistedRoomState {
  yjsSnapshot: Buffer;
  documentSnapshot?: string | null;
}

export interface RoomPersistence {
  store(roomName: string, state: PersistedRoomState): Promise<void>;
  load(roomName: string): Promise<PersistedRoomState | null>;
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

  private documentKey(roomName: string): string {
    return `${DOCUMENT_PREFIX}${roomName}`;
  }

  async store(roomName: string, state: PersistedRoomState): Promise<void> {
    const multi = this.redis.multi();
    multi.set(
      this.key(roomName),
      state.yjsSnapshot.toString("base64"),
      "EX",
      SNAPSHOT_TTL,
    );

    if (state.documentSnapshot) {
      multi.set(
        this.documentKey(roomName),
        state.documentSnapshot,
        "EX",
        SNAPSHOT_TTL,
      );
    } else {
      multi.del(this.documentKey(roomName));
    }

    await multi.exec();
  }

  async load(roomName: string): Promise<PersistedRoomState | null> {
    const [stored, documentSnapshot] = await Promise.all([
      this.redis.get(this.key(roomName)),
      this.redis.get(this.documentKey(roomName)),
    ]);

    if (!stored) return null;

    try {
      return {
        yjsSnapshot: Buffer.from(stored, "base64"),
        documentSnapshot,
      };
    } catch {
      return null;
    }
  }

  async delete(roomName: string): Promise<void> {
    await this.redis.del(this.key(roomName), this.documentKey(roomName));
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
