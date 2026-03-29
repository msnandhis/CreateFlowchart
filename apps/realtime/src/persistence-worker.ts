import { Worker, Queue } from "bullmq";
import Redis from "ioredis";
import * as Y from "yjs";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const SNAPSHOT_PREFIX = "flowchart:snapshot:";
const SNAPSHOT_TTL = 60 * 60 * 24 * 7;
const SNAPSHOT_INTERVAL = 60 * 5;

interface SnapshotJobData {
  roomName: string;
  docState: string;
}

class PersistenceWorker {
  private redis: Redis;
  private worker: Worker<SnapshotJobData> | null = null;
  private queue: Queue<SnapshotJobData> | null = null;
  private isRunning = false;

  constructor() {
    this.redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    });

    this.redis.on("error", (err) => {
      console.error("[PersistenceWorker] Redis error:", err);
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.queue = new Queue<SnapshotJobData>("persistence-snapshots", {
      connection: this.redis.duplicate(),
    });

    this.worker = new Worker<SnapshotJobData>(
      "persistence-snapshots",
      async (job) => {
        const { roomName, docState } = job.data;
        await this.storeSnapshot(roomName, docState);
      },
      {
        connection: this.redis.duplicate(),
        concurrency: 3,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      },
    );

    this.worker.on("completed", (job) => {
      console.log(`[PersistenceWorker] Snapshot job ${job.id} completed`);
    });

    this.worker.on("failed", (job, err) => {
      console.error(`[PersistenceWorker] Snapshot job ${job?.id} failed:`, err);
    });

    this.isRunning = true;
    console.log("[PersistenceWorker] Started");
  }

  async stop(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
    this.isRunning = false;
    console.log("[PersistenceWorker] Stopped");
  }

  private async storeSnapshot(
    roomName: string,
    docState: string,
  ): Promise<void> {
    const key = `${SNAPSHOT_PREFIX}${roomName}`;
    await this.redis.set(key, docState, "EX", SNAPSHOT_TTL);
    console.log(`[PersistenceWorker] Stored snapshot for room: ${roomName}`);
  }

  async getSnapshot(roomName: string): Promise<string | null> {
    const key = `${SNAPSHOT_PREFIX}${roomName}`;
    return this.redis.get(key);
  }

  async deleteSnapshot(roomName: string): Promise<void> {
    const key = `${SNAPSHOT_PREFIX}${roomName}`;
    await this.redis.del(key);
  }

  scheduleSnapshot(roomName: string, doc: Y.Doc): void {
    if (!this.queue) return;

    const state = Buffer.from(Y.encodeStateAsUpdate(doc)).toString("base64");

    this.queue.add(
      `snapshot-${roomName}-${Date.now()}`,
      {
        roomName,
        docState: state,
      },
      {
        repeat: {
          every: SNAPSHOT_INTERVAL * 1000,
        },
        removeOnComplete: { count: 10 },
        removeOnFail: { count: 50 },
      },
    );
  }
}

let workerInstance: PersistenceWorker | null = null;

export function getPersistenceWorker(): PersistenceWorker {
  if (!workerInstance) {
    workerInstance = new PersistenceWorker();
  }
  return workerInstance;
}

export async function startPersistenceWorker(): Promise<void> {
  const worker = getPersistenceWorker();
  await worker.start();
}

export async function stopPersistenceWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.stop();
    workerInstance = null;
  }
}
