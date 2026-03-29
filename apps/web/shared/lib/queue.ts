import { Queue } from "bullmq";
import { redis } from "./redis";


// ─── Queue Definitions ─────────────────────────────────────────────
// All queues share the same Redis connection

export const aiGenerationQueue = new Queue("ai-generation", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },  // Keep last 100 completed
    removeOnFail: { count: 500 },      // Keep last 500 failed for debugging
    attempts: 2,                        // Retry once on failure
    backoff: { type: "exponential", delay: 3000 },
  },
});

export const exportRenderQueue = new Queue("export-render", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 200 },
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
  },
});

export const embeddingGenerationQueue = new Queue("embedding-generation", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 100 },
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  },
});

// ─── Queue Types ───────────────────────────────────────────────────

export interface AIGenerationJobData {
  userId: string;
  prompt: string;
  action: "generate" | "analyze" | "improve" | "explain";
  flowId?: string;          // For analyze/improve/explain
  existingFlowGraph?: string; // Serialized FlowGraph JSON
  existingDocument?: string; // Serialized DiagramDocument JSON
  existingDsl?: string; // Serialized native DSL
  imageUrl?: string;
  imageMimeType?: string;
}

export interface ExportRenderJobData {
  userId: string;
  flowId: string;
  format: "png" | "svg" | "pdf" | "mermaid" | "json";
}

export interface EmbeddingGenerationJobData {
  templateId: string;
  title: string;
  description: string;
  flowGraphJson: string;
}
