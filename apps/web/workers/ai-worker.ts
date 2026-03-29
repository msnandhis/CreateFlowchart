import type { Job } from "bullmq";
import { FlowGraphSchema } from "@createflowchart/core";
import type { FlowGraph } from "@createflowchart/core";
import type { DiagramDocument } from "@createflowchart/schema";
import { flowDslToDocument, documentToFlowDsl } from "@createflowchart/dsl";
import type { AIGenerationJobData } from "../shared/lib/queue";
import { redis } from "../shared/lib/redis";
import { aiPipeline } from "../shared/lib/ai-gateway";
import {
  publishJobEvent,
  type JobProgressEvent,
} from "../shared/lib/job-events";
import {
  ANALYZE_SYSTEM_PROMPT,
  parseAnalyzeResponse,
  type AnalyzeReport,
  EXPLAIN_SYSTEM_PROMPT,
  parseExplainResponse,
  type ExplainReport,
} from "@createflowchart/ai";
import { toDiagramDocument } from "../features/editor/lib/document-compat";
import { documentToFlowGraph } from "../features/editor/lib/document-compat";

export interface GenerateResult {
  document: DiagramDocument;
  dsl: string;
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
  originalDocument: DiagramDocument;
  originalDsl: string;
  improvedDocument: DiagramDocument;
  improvedDsl: string;
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
  dsl?: string;
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

async function emitProgress(
  jobId: string,
  status: JobProgressEvent["status"],
  progress: number,
  extra?: Partial<JobProgressEvent>,
): Promise<void> {
  const event: JobProgressEvent = {
    jobId,
    status,
    progress,
    timestamp: new Date().toISOString(),
    ...extra,
  };
  await publishJobEvent(jobId, event);
}

export async function processAIJob(
  job: Job<AIGenerationJobData>,
): Promise<AIJobResult> {
  const { userId, prompt, action, flowId, existingFlowGraph, existingDocument } = job.data;
  const startedAt = new Date().toISOString();
  const jobId = job.id || "unknown";

  console.log(`[AIWorker] Processing ${action} job for user ${userId}`);

  await emitProgress(jobId, "processing", 10);

  try {
    const sanitizedPrompt = sanitizePrompt(prompt);
    let result: AIJobResult;

    switch (action) {
      case "generate":
        await emitProgress(jobId, "processing", 20);
        result = await handleGenerate(userId, sanitizedPrompt, jobId);
        break;
      case "analyze":
        await emitProgress(jobId, "processing", 20);
        result = await handleAnalyze(
          userId,
          sanitizedPrompt,
          existingFlowGraph,
          existingDocument,
          jobId,
        );
        break;
      case "improve":
        await emitProgress(jobId, "processing", 20);
        result = await handleImprove(
          userId,
          sanitizedPrompt,
          existingFlowGraph,
          existingDocument,
          jobId,
        );
        break;
      case "explain":
        await emitProgress(jobId, "processing", 20);
        result = await handleExplain(userId, existingFlowGraph, existingDocument, jobId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    await emitProgress(jobId, "processing", 90);

    result.startedAt = startedAt;
    result.completedAt = new Date().toISOString();
    result.duration =
      new Date(result.completedAt).getTime() - new Date(startedAt).getTime();

    await job.updateProgress(100);
    await emitProgress(jobId, "completed", 100, { result });

    return result;
  } catch (error) {
    console.error(`[AIWorker] Job failed:`, error);
    const errorResult = {
      success: false,
      error: String(error),
      jobId,
      action,
      startedAt,
      completedAt: new Date().toISOString(),
      duration: 0,
    };
    await emitProgress(jobId, "failed", 0, { error: String(error) });
    return errorResult;
  }
}

const DSL_SYSTEM_PROMPT = `You are an expert diagram designer.
Return only native CreateFlowchart DSL.
Do not return JSON.
Do not wrap the response in markdown fences.
Use the format:
diagram "Title" family flowchart kit core-flowchart
node ...
edge ...
container ...
automation ...

Prefer flowchart and BPMN-lite shapes from this set:
terminator-start, process, decision, action-task, terminator-end, document, multi-document, data, database, stored-data, subprocess, predefined-process, manual-input, display, preparation, delay, connector, off-page-connector,
bpmn-start-event, bpmn-end-event, bpmn-task, bpmn-user-task, bpmn-service-task, bpmn-subprocess, bpmn-exclusive-gateway, bpmn-parallel-gateway, bpmn-inclusive-gateway.

Use containers for pools, lanes, and swimlanes when the workflow has roles, teams, or systems.`;

function buildGenerateDslPrompt(prompt: string): string {
  return `Create a complete diagram for the following request.\n\n${prompt}\n\nReturn only valid CreateFlowchart DSL.`;
}

async function handleGenerate(
  userId: string,
  prompt: string,
  jobId: string,
): Promise<AIJobResult> {
  const result = await aiPipeline.generateText({
    prompt: buildGenerateDslPrompt(prompt),
    systemPrompt: DSL_SYSTEM_PROMPT,
  });

  if (!result.success || !result.data) {
    throw result.error || new Error("Generation failed");
  }

  const document = flowDslToDocument(result.data, {
    metadata: {
      title: "Generated Flow",
      authorId: userId,
      source: "native",
      tags: ["ai-generated"],
    },
  });
  const generatedDocument: DiagramDocument = {
    ...document,
    metadata: {
      ...document.metadata,
      authorId: userId,
      source: "native",
      tags: Array.from(new Set([...(document.metadata.tags ?? []), "ai-generated"])),
    },
  };
  const generatedFlow = {
    ...documentToFlowGraph(generatedDocument),
    meta: {
      ...documentToFlowGraph(generatedDocument).meta,
      createdBy: userId,
      isSandbox: true,
    },
  };
  const dsl = documentToFlowDsl(generatedDocument);

  return {
    success: true,
    jobId,
    action: "generate",
    data: {
      document: generatedDocument,
      dsl,
      flow: generatedFlow,
      provider: result.metadata.provider,
      model: result.metadata.model,
      confidence: result.metadata.confidence,
      nodeConfidences: result.metadata.nodeConfidences,
      edgeConfidences: result.metadata.edgeConfidences,
      repairAttempts: result.metadata.repairAttempts,
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
  existingDocument?: string,
  jobId?: string,
): Promise<AIJobResult> {
  if (!existingFlowGraph) {
    throw new Error("No existing flow graph provided for analysis");
  }

  let parsedFlow: FlowGraph;
  try {
    parsedFlow = JSON.parse(existingFlowGraph);
  } catch {
    throw new Error("Invalid flow graph JSON");
  }

  const analysisPrompt = `Analyze the following flowchart and identify any issues.\n\nUser context: ${prompt}`;
  const document = parseExistingDocument(existingDocument, parsedFlow, userId);

  const result = await aiPipeline.generateText({
    prompt: `${analysisPrompt}\n\nCurrent DSL:\n${documentToFlowDsl(document)}`,
    context: parsedFlow,
    systemPrompt: ANALYZE_SYSTEM_PROMPT,
  });

  if (!result.success || !result.data) {
    throw result.error || new Error("Analysis failed");
  }

  const report: AnalyzeReport = parseAnalyzeResponse(result.data);

  const issues = report.issues.map((issue) => ({
    type: issue.type as "dead_end" | "loop" | "decision" | "depth" | "other",
    nodeId: issue.nodeId || undefined,
    message: issue.message,
    severity: issue.severity,
  }));

  return {
    success: true,
    jobId: jobId || "",
    action: "analyze",
    data: {
      issues,
      overallHealth: report.overallHealth,
      suggestions: report.suggestions,
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
  existingDocument?: string,
  jobId?: string,
): Promise<AIJobResult> {
  if (!existingFlowGraph) {
    throw new Error("No existing flow graph provided for improvement");
  }

  let parsedFlow: FlowGraph;
  try {
    parsedFlow = JSON.parse(existingFlowGraph);
  } catch {
    throw new Error("Invalid flow graph JSON");
  }

  const originalDocument = parseExistingDocument(existingDocument, parsedFlow, userId);
  const originalDsl = documentToFlowDsl(originalDocument);
  const improvePrompt = `Improve this diagram according to the following instructions:\n${prompt}\n\nCurrent diagram DSL:\n${originalDsl}`;

  const result = await aiPipeline.generateText({
    prompt: improvePrompt,
    systemPrompt: `${DSL_SYSTEM_PROMPT}\nReturn an improved diagram in CreateFlowchart DSL only.`,
  });

  if (!result.success || !result.data) {
    throw result.error || new Error("Improvement failed");
  }

  const improvedDocument = flowDslToDocument(result.data, {
    id: originalDocument.id,
    metadata: {
      ...originalDocument.metadata,
      authorId: userId,
      title: originalDocument.metadata.title,
      source: "native",
    },
    theme: originalDocument.theme,
    layout: originalDocument.layout,
    annotations: originalDocument.annotations,
  });
  const improvedFlow = {
    ...documentToFlowGraph(improvedDocument),
    meta: {
      ...documentToFlowGraph(improvedDocument).meta,
      createdBy: userId,
      isSandbox: true,
    },
  };
  const originalFlow = {
    ...parsedFlow,
    meta: { ...parsedFlow.meta, isSandbox: true },
  };
  const report = buildImproveDiffReport(originalDocument, improvedDocument, prompt);

  return {
    success: true,
    jobId: jobId || "",
    action: "improve",
    data: {
      originalDocument,
      originalDsl,
      improvedDocument,
      improvedDsl: documentToFlowDsl(improvedDocument),
      original: originalFlow,
      improved: improvedFlow,
      changes: report.changes.map((change) => ({
        type: change.type,
        description: change.description,
        nodeId: change.nodeId || undefined,
      })),
      confidence: 0.78,
    },
    startedAt: "",
    completedAt: "",
    duration: 0,
  };
}

async function handleExplain(
  userId: string,
  existingFlowGraph?: string,
  existingDocument?: string,
  jobId?: string,
): Promise<AIJobResult> {
  if (!existingFlowGraph) {
    throw new Error("No existing flow graph provided for explanation");
  }

  let parsedFlow: FlowGraph;
  try {
    parsedFlow = JSON.parse(existingFlowGraph);
  } catch {
    throw new Error("Invalid flow graph JSON");
  }

  const explainPrompt = "Explain how this flowchart works.";

  const document = parseExistingDocument(existingDocument, parsedFlow, userId);

  const result = await aiPipeline.generateText({
    prompt: explainPrompt,
    context: parsedFlow,
    systemPrompt: EXPLAIN_SYSTEM_PROMPT,
  });

  if (!result.success || !result.data) {
    throw result.error || new Error("Explanation generation failed");
  }

  const report: ExplainReport = parseExplainResponse(result.data);
  const markdown = `# Flowchart Explanation\n\n${report.overview}\n\n## Node Walkthrough\n\n${report.nodeWalkthrough.map((node) => `### ${node.label} (${node.type})\n\n${node.explanation}`).join("\n\n")}\n\n## Main Paths\n\n${report.mainPaths.map((path) => `- ${path.description}: ${path.steps.join(" → ")}`).join("\n")}\n\n## Key Insights\n\n${report.keyInsights.map((insight) => `- ${insight}`).join("\n")}`;

  return {
    success: true,
    jobId: jobId || "",
    action: "explain",
    data: {
      markdown,
      dsl: documentToFlowDsl(document),
      nodeWalkthrough: report.nodeWalkthrough.map((node) => ({
        nodeId: node.nodeId,
        label: node.label,
        explanation: node.explanation,
      })),
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

  worker.on("completed", async (job: Job | undefined) => {
    console.log(`[AIWorker] Job ${job?.id} completed`);
    if (job?.id) {
      await emitProgress(job.id, "completed", 100);
    }
  });

  worker.on("failed", async (job: Job | undefined, err: Error) => {
    console.error(`[AIWorker] Job ${job?.id} failed:`, err);
    if (job?.id) {
      await emitProgress(job.id, "failed", 0, { error: err.message });
    }
  });

  worker.on("progress", async (job: Job, progress: number | object) => {
    console.log(
      `[AIWorker] Job ${job.id} progress: ${JSON.stringify(progress)}`,
    );
    if (job.id) {
      const progressNum = typeof progress === "number" ? progress : 0;
      await emitProgress(job.id, "processing", progressNum);
    }
  });

  return worker;
}

function buildImproveDiffReport(
  original: DiagramDocument,
  improved: DiagramDocument,
  prompt: string,
) {
  const originalNodes = new Map(original.nodes.map((node) => [node.id, node]));
  const improvedNodes = new Map(improved.nodes.map((node) => [node.id, node]));
  const changes: Array<{
    type: "add" | "remove" | "modify";
    nodeId: string | null;
    description: string;
  }> = [];

  for (const node of improved.nodes) {
    if (!originalNodes.has(node.id)) {
      changes.push({
        type: "add",
        description: `Added node "${node.content.title}"`,
        nodeId: node.id,
      });
      continue;
    }

    const previous = originalNodes.get(node.id)!;
    if (
      previous.content.title !== node.content.title ||
      previous.shape !== node.shape ||
      previous.kind !== node.kind
    ) {
      changes.push({
        type: "modify",
        description: `Updated node "${previous.content.title}"`,
        nodeId: node.id,
      });
    }
  }

  for (const node of original.nodes) {
    if (!improvedNodes.has(node.id)) {
      changes.push({
        type: "remove",
        description: `Removed node "${node.content.title}"`,
        nodeId: node.id,
      });
    }
  }

  if (changes.length === 0) {
      changes.push({
        type: "modify",
        description: `Refined the diagram for: ${prompt}`,
        nodeId: null,
      });
  }

  return {
    changes,
    confidence: 0.78,
  };
}

function parseExistingDocument(
  existingDocument: string | undefined,
  fallbackFlow: FlowGraph,
  userId: string,
): DiagramDocument {
  if (existingDocument) {
    try {
      return toDiagramDocument({
        data: JSON.parse(existingDocument),
        authorId: userId,
        title: "Current Flow",
      });
    } catch {
      // fall through
    }
  }

  return toDiagramDocument({
    data: fallbackFlow,
    authorId: userId,
    title: "Current Flow",
  });
}
