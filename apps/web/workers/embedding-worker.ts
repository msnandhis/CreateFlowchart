import { Job } from "bullmq";
import {
  embeddingGenerationQueue,
  type EmbeddingGenerationJobData,
} from "../shared/lib/queue";
import { redis } from "../shared/lib/redis";
import { db } from "../shared/lib/db";
import { templates } from "@createflowchart/db/schema";
import { eq } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: combinedText,
    });

    const embedding = response.data[0].embedding;

    await db
      .update(templates)
      .set({
        embedding: embedding as unknown as string,
        updatedAt: new Date(),
      })
      .where(eq(templates.id, templateId));

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

  const worker = new Worker<EmbeddingGenerationJobData>(
    "embedding-generation",
    async (job) => {
      return processEmbeddingJob(job);
    },
    {
      connection: redis.duplicate(),
      concurrency: 2,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  );

  worker.on("completed", (job) => {
    console.log(`[EmbeddingWorker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[EmbeddingWorker] Job ${job?.id} failed:`, err);
  });

  worker.on("progress", (job, progress) => {
    console.log(`[EmbeddingWorker] Job ${job.id} progress: ${progress}%`);
  });

  return worker;
}
