import type { Job } from "bullmq";
import type { EmbeddingGenerationJobData } from "../shared/lib/queue";
import { redis } from "../shared/lib/redis";

export interface EmbeddingJobData {
  templateId: string;
  title: string;
  description: string;
  flowGraphJson: string;
}

export async function processEmbeddingJob(
  job: Job<EmbeddingJobData>,
): Promise<{ success: boolean; vectorId: string }> {
  const { templateId, title, description, flowGraphJson } = job.data;

  console.log(
    `[EmbeddingWorker] Processing template ${templateId}: "${title}"`,
  );

  try {
    const combinedText =
      `${title}. ${description}. Flow: ${flowGraphJson}`.slice(0, 8000);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const OpenAI = require("openai");
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: combinedText,
    });

    const embedding = response.data[0].embedding;

    const key = `template:embedding:${templateId}`;
    await redis.set(key, JSON.stringify(embedding), "EX", 86400 * 30);

    await job.updateProgress(100);

    console.log(
      `[EmbeddingWorker] Successfully embedded template ${templateId}`,
    );
    return { success: true, vectorId: templateId };
  } catch (error) {
    console.error(
      `[EmbeddingWorker] Failed to embed template ${templateId}:`,
      error,
    );
    throw error;
  }
}

export function createEmbeddingWorker() {
  const { Worker } = require("bullmq");

  const worker = new Worker(
    "embedding-generation",
    async (job: Job<EmbeddingJobData>) => {
      return processEmbeddingJob(job);
    },
    {
      connection: redis.duplicate(),
      concurrency: 2,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  );

  worker.on("completed", (job: Job<EmbeddingJobData> | undefined) => {
    console.log(`[EmbeddingWorker] Job ${job?.id} completed`);
  });

  worker.on("failed", (job: Job<EmbeddingJobData> | undefined, err: Error) => {
    console.error(`[EmbeddingWorker] Job ${job?.id} failed:`, err);
  });

  worker.on(
    "progress",
    (job: Job<EmbeddingJobData>, progress: number | object) => {
      console.log(
        `[EmbeddingWorker] Job ${job.id} progress: ${JSON.stringify(progress)}`,
      );
    },
  );

  return worker;
}
