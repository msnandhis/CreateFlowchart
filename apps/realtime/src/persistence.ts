import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const SNAPSHOT_PREFIX = "flowchart:snapshot:";
const DOCUMENT_PREFIX = "flowchart:document:";
const SNAPSHOT_TTL = 60 * 60 * 24 * 7;
export const ROOM_PROTOCOL_VERSION = 1;

export interface PersistedRoomState {
  roomId: string;
  protocolVersion: number;
  updatedAt: string;
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
        JSON.stringify({
          roomId: state.roomId,
          protocolVersion: state.protocolVersion,
          updatedAt: state.updatedAt,
          documentSnapshot: state.documentSnapshot,
        }),
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
      const parsedDocument =
        documentSnapshot && documentSnapshot.startsWith("{")
          ? (JSON.parse(documentSnapshot) as {
              roomId?: string;
              protocolVersion?: number;
              updatedAt?: string;
              documentSnapshot?: string | null;
            })
          : null;

      return {
        roomId: parsedDocument?.roomId ?? roomName,
        protocolVersion: parsedDocument?.protocolVersion ?? ROOM_PROTOCOL_VERSION,
        updatedAt: parsedDocument?.updatedAt ?? new Date().toISOString(),
        yjsSnapshot: Buffer.from(stored, "base64"),
        documentSnapshot: parsedDocument?.documentSnapshot ?? documentSnapshot,
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
