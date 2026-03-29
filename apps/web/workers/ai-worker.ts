import type { Job } from "bullmq";
import { FlowGraphSchema } from "@createflowchart/core";
import type { FlowGraph } from "@createflowchart/core";
import type { AIGenerationJobData } from "../shared/lib/queue";
import { redis } from "../shared/lib/redis";

export interface GenerateResult {
  flow: FlowGraph;
  provider: string;
  model: string;
  confidence: number;
  nodeConfidences: Record<string, number>;
  edgeConfidences: Record<string, number>;
  repairAttempts: number;
}

export interface AnalyzeResult {
  issues: {
    type: "dead_end" | "loop" | "decision" | "depth" | "other";
    nodeId?: string;
    message: string;
    severity: "error" | "warning" | "info";
  }[];
  overallHealth: number;
  suggestions: string[];
}

export interface ImproveResult {
  original: FlowGraph;
  improved: FlowGraph;
  changes: {
    type: "add" | "remove" | "modify";
    description: string;
    nodeId?: string;
  }[];
  confidence: number;
}

export interface ExplainResult {
  markdown: string;
  nodeWalkthrough: {
    nodeId: string;
    label: string;
    explanation: string;
  }[];
}

export interface AIJobResult {
  success: boolean;
  data?: GenerateResult | AnalyzeResult | ImproveResult | ExplainResult;
  error?: string;
  jobId: string;
  action: "generate" | "analyze" | "improve" | "explain";
  startedAt: string;
  completedAt: string;
  duration: number;
}

export function sanitizePrompt(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .slice(0, 2000)
    .trim();
}

export function validateFlowGraphResponse(data: unknown): FlowGraph | null {
  const result = FlowGraphSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  return null;
}

export function attemptAutoRepair(data: unknown): FlowGraph | null {
  if (typeof data !== "object" || data === null) return null;

  const obj = data as Record<string, unknown>;

  if (typeof obj.nodes !== "object" || !Array.isArray(obj.nodes)) {
    obj.nodes = [];
  }

  if (typeof obj.edges !== "object" || !Array.isArray(obj.edges)) {
    obj.edges = [];
  }

  if (typeof obj.meta !== "object" || obj.meta === null) {
    obj.meta = { version: 1, isSandbox: false };
  }

  const meta = obj.meta as Record<string, unknown>;
  if (typeof meta.version === "undefined") meta.version = 1;
  if (typeof meta.isSandbox === "undefined") meta.isSandbox = false;

  const validNodes = (obj.nodes as unknown[])
    .filter((n) => {
      if (typeof n !== "object" || n === null) return false;
      const node = n as Record<string, unknown>;
      return (
        typeof node.id === "string" &&
        typeof node.type === "string" &&
        typeof node.position === "object"
      );
    })
    .map((n, i) => {
      const node = n as Record<string, unknown>;
      const pos = node.position as Record<string, unknown>;
      return {
        id: String(node.id || `node_${i}`),
        type: node.type || "process",
        position: {
          x: typeof pos?.x === "number" ? pos.x : 0,
          y: typeof pos?.y === "number" ? pos.y : 0,
        },
        data: {
          label: String(
            (node.data as { label?: unknown })?.label ??
              (node as { label?: unknown })?.label ??
              "Untitled",
          ),
          confidence: 0.5,
          meta: {},
        },
      };
    });

  const validEdges = (obj.edges as unknown[])
    .filter((e) => {
      if (typeof e !== "object" || e === null) return false;
      const edge = e as Record<string, unknown>;
      return typeof edge.source === "string" && typeof edge.target === "string";
    })
    .map((e, i) => {
      const edge = e as Record<string, unknown>;
      return {
        id: String(edge.id || `edge_${i}`),
        source: String(edge.source),
        target: String(edge.target),
        label: edge.label ? String(edge.label) : undefined,
        confidence: edge.confidence ? Number(edge.confidence) : undefined,
      };
    });

  const repaired = {
    nodes: validNodes,
    edges: validEdges,
    meta: obj.meta,
  };

  return validateFlowGraphResponse(repaired);
}

export async function processAIJob(
  job: Job<AIGenerationJobData>,
): Promise<AIJobResult> {
  const { userId, prompt, action, flowId, existingFlowGraph } = job.data;
  const startedAt = new Date().toISOString();

  console.log(`[AIWorker] Processing ${action} job for user ${userId}`);

  try {
    const sanitizedPrompt = sanitizePrompt(prompt);
    let result: AIJobResult;

    switch (action) {
      case "generate":
        result = await handleGenerate(userId, sanitizedPrompt, job.id!);
        break;
      case "analyze":
        result = await handleAnalyze(
          userId,
          sanitizedPrompt,
          existingFlowGraph,
          job.id!,
        );
        break;
      case "improve":
        result = await handleImprove(
          userId,
          sanitizedPrompt,
          existingFlowGraph,
          job.id!,
        );
        break;
      case "explain":
        result = await handleExplain(userId, existingFlowGraph, job.id!);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    result.startedAt = startedAt;
    result.completedAt = new Date().toISOString();
    result.duration =
      new Date(result.completedAt).getTime() - new Date(startedAt).getTime();

    await job.updateProgress(100);
    return result;
  } catch (error) {
    console.error(`[AIWorker] Job failed:`, error);
    return {
      success: false,
      error: String(error),
      jobId: job.id!,
      action,
      startedAt,
      completedAt: new Date().toISOString(),
      duration: 0,
    };
  }
}

async function handleGenerate(
  userId: string,
  prompt: string,
  jobId: string,
): Promise<AIJobResult> {
  return {
    success: true,
    jobId,
    action: "generate",
    data: {
      flow: {
        nodes: [],
        edges: [],
        meta: { version: 1, isSandbox: true },
      },
      provider: "placeholder",
      model: "placeholder",
      confidence: 0,
      nodeConfidences: {},
      edgeConfidences: {},
      repairAttempts: 0,
    },
    startedAt: "",
    completedAt: "",
    duration: 0,
  };
}

async function handleAnalyze(
  userId: string,
  prompt: string,
  existingFlowGraph?: string,
  jobId?: string,
): Promise<AIJobResult> {
  return {
    success: true,
    jobId: jobId || "",
    action: "analyze",
    data: {
      issues: [],
      overallHealth: 100,
      suggestions: [],
    },
    startedAt: "",
    completedAt: "",
    duration: 0,
  };
}

async function handleImprove(
  userId: string,
  prompt: string,
  existingFlowGraph?: string,
  jobId?: string,
): Promise<AIJobResult> {
  return {
    success: true,
    jobId: jobId || "",
    action: "improve",
    data: {
      original: { nodes: [], edges: [], meta: { version: 1, isSandbox: true } },
      improved: { nodes: [], edges: [], meta: { version: 1, isSandbox: true } },
      changes: [],
      confidence: 0,
    },
    startedAt: "",
    completedAt: "",
    duration: 0,
  };
}

async function handleExplain(
  userId: string,
  existingFlowGraph?: string,
  jobId?: string,
): Promise<AIJobResult> {
  return {
    success: true,
    jobId: jobId || "",
    action: "explain",
    data: {
      markdown: "",
      nodeWalkthrough: [],
    },
    startedAt: "",
    completedAt: "",
    duration: 0,
  };
}

export function createAIGatewayWorker() {
  const { Worker } = require("bullmq");

  const worker = new Worker(
    "ai-generation",
    async (job: Job) => {
      return processAIJob(job as Job<AIGenerationJobData>);
    },
    {
      connection: redis.duplicate(),
      concurrency: 5,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  );

  worker.on("completed", (job: Job | undefined) => {
    console.log(`[AIWorker] Job ${job?.id} completed`);
  });

  worker.on("failed", (job: Job | undefined, err: Error) => {
    console.error(`[AIWorker] Job ${job?.id} failed:`, err);
  });

  worker.on("progress", (job: Job, progress: number | object) => {
    console.log(
      `[AIWorker] Job ${job.id} progress: ${JSON.stringify(progress)}`,
    );
  });

  return worker;
}
