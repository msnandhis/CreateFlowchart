import { redis } from "./redis";

export interface JobProgressEvent {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  result?: unknown;
  error?: string;
  timestamp: string;
}

const JOB_EVENT_PREFIX = "job:events:";
const JOB_CHANNEL_PREFIX = "job:channel:";

export async function publishJobEvent(
  jobId: string,
  event: JobProgressEvent,
): Promise<void> {
  const channel = `${JOB_CHANNEL_PREFIX}${jobId}`;
  await redis.publish(channel, JSON.stringify(event));
}

export async function subscribeToJob(
  jobId: string,
  callback: (event: JobProgressEvent) => void,
): Promise<() => void> {
  const subscriber = redis.duplicate();
  const channel = `${JOB_CHANNEL_PREFIX}${jobId}`;

  await subscriber.subscribe(channel);

  subscriber.on("message", (ch: string, message: string) => {
    if (ch === channel) {
      try {
        const event = JSON.parse(message) as JobProgressEvent;
        callback(event);

        if (event.status === "completed" || event.status === "failed") {
          setTimeout(() => {
            subscriber.unsubscribe(channel);
            subscriber.quit();
          }, 1000);
        }
      } catch {
        console.error("[Redis PubSub] Failed to parse job event:", message);
      }
    }
  });

  return () => {
    subscriber.unsubscribe(channel);
    subscriber.quit();
  };
}

export async function storeJobResult(
  jobId: string,
  result: unknown,
): Promise<void> {
  const key = `${JOB_EVENT_PREFIX}${jobId}`;
  await redis.set(key, JSON.stringify(result), "EX", 3600);
}

export async function getJobResult(jobId: string): Promise<unknown | null> {
  const key = `${JOB_EVENT_PREFIX}${jobId}`;
  const data = await redis.get(key);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
}
