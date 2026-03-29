import { Job, Worker } from "bullmq";
import type { ExportRenderJobData } from "../shared/lib/queue";
import { redis } from "../shared/lib/redis";
import { db } from "../shared/lib/db";
import { flows } from "@createflowchart/db/src/schema";
import { eq } from "drizzle-orm";
import type { FlowGraph } from "@createflowchart/core";
import { toMermaid } from "@createflowchart/core";

export type ExportFormat = "png" | "svg" | "pdf" | "mermaid" | "json";

export async function processExportJob(job: Job<ExportRenderJobData>): Promise<{
  success: boolean;
  downloadUrl?: string;
  format: ExportFormat;
  fileSize?: number;
}> {
  const { flowId, format, userId } = job.data;

  console.log(
    `[ExportWorker] Processing export for flow ${flowId} as ${format}`,
  );

  try {
    const [flow] = await db
      .select()
      .from(flows)
      .where(eq(flows.id, flowId))
      .limit(1);

    if (!flow) {
      throw new Error(`Flow ${flowId} not found`);
    }

    const flowGraph: FlowGraph =
      typeof flow.data === "string" ? JSON.parse(flow.data) : flow.data;

    await job.updateProgress(25);

    let result: {
      success: boolean;
      downloadUrl: string;
      format: ExportFormat;
      fileSize?: number;
    };

    switch (format) {
      case "json":
        result = await exportAsJSON(flowGraph, flowId);
        break;
      case "mermaid":
        result = await exportAsMermaid(flowGraph, flowId);
        break;
      case "png":
        result = await exportAsPNG(flowGraph, flowId);
        break;
      case "svg":
        result = await exportAsSVG(flowGraph, flowId);
        break;
      case "pdf":
        result = await exportAsPDF(flowGraph, flowId);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    await job.updateProgress(100);
    console.log(`[ExportWorker] Export complete for flow ${flowId}`);
    return result;
  } catch (error) {
    console.error(`[ExportWorker] Export failed for flow ${flowId}:`, error);
    throw error;
  }
}

async function exportAsJSON(
  flowGraph: FlowGraph,
  flowId: string,
): Promise<{
  success: boolean;
  downloadUrl: string;
  format: "json";
  fileSize: number;
}> {
  const json = JSON.stringify(flowGraph, null, 2);
  const buffer = Buffer.from(json, "utf-8");

  const key = `export:${flowId}:${Date.now()}.json`;
  await redis.set(key, buffer.toString("base64"), "EX", 3600);

  return {
    success: true,
    downloadUrl: `/api/export/download?key=${key}`,
    format: "json",
    fileSize: buffer.length,
  };
}

async function exportAsMermaid(
  flowGraph: FlowGraph,
  flowId: string,
): Promise<{
  success: boolean;
  downloadUrl: string;
  format: "mermaid";
  fileSize: number;
}> {
  const mermaid = toMermaid(flowGraph);
  const buffer = Buffer.from(mermaid, "utf-8");

  const key = `export:${flowId}:${Date.now()}.mmd`;
  await redis.set(key, buffer.toString("base64"), "EX", 3600);

  return {
    success: true,
    downloadUrl: `/api/export/download?key=${key}`,
    format: "mermaid",
    fileSize: buffer.length,
  };
}

async function exportAsPNG(
  flowGraph: FlowGraph,
  flowId: string,
): Promise<{
  success: boolean;
  downloadUrl: string;
  format: "png";
  fileSize: number;
}> {
  const { toReactFlowFormat } = await import("@createflowchart/core");
  const { nodes, edges } = toReactFlowFormat(flowGraph);

  console.log(
    `[ExportWorker] Would render PNG for ${nodes.length} nodes and ${edges.length} edges`,
  );

  const key = `export:${flowId}:${Date.now()}.png`;
  await redis.set(key, "placeholder-png-base64", "EX", 3600);

  return {
    success: true,
    downloadUrl: `/api/export/download?key=${key}`,
    format: "png",
    fileSize: 0,
  };
}

async function exportAsSVG(
  flowGraph: FlowGraph,
  flowId: string,
): Promise<{
  success: boolean;
  downloadUrl: string;
  format: "svg";
  fileSize: number;
}> {
  const { toReactFlowFormat } = await import("@createflowchart/core");
  const { nodes, edges } = toReactFlowFormat(flowGraph);

  console.log(
    `[ExportWorker] Would render SVG for ${nodes.length} nodes and ${edges.length} edges`,
  );

  const key = `export:${flowId}:${Date.now()}.svg`;
  await redis.set(key, "placeholder-svg-content", "EX", 3600);

  return {
    success: true,
    downloadUrl: `/api/export/download?key=${key}`,
    format: "svg",
    fileSize: 0,
  };
}

async function exportAsPDF(
  flowGraph: FlowGraph,
  flowId: string,
): Promise<{
  success: boolean;
  downloadUrl: string;
  format: "pdf";
  fileSize: number;
}> {
  console.log(`[ExportWorker] Would render PDF for flow ${flowId}`);

  const key = `export:${flowId}:${Date.now()}.pdf`;
  await redis.set(key, "placeholder-pdf-base64", "EX", 3600);

  return {
    success: true,
    downloadUrl: `/api/export/download?key=${key}`,
    format: "pdf",
    fileSize: 0,
  };
}

export function createExportWorker() {
  const { Worker } = require("bullmq");

  const worker = new Worker(
    "export-render",
    async (job: Job) => {
      return processExportJob(job as Job<ExportRenderJobData>);
    },
    {
      connection: redis.duplicate(),
      concurrency: 3,
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 100 },
    },
  );

  worker.on("completed", (job: Job<ExportRenderJobData>) => {
    console.log(`[ExportWorker] Job ${job.id} completed`);
  });

  worker.on(
    "failed",
    (job: Job<ExportRenderJobData> | undefined, err: Error) => {
      console.error(`[ExportWorker] Job ${job?.id} failed:`, err);
    },
  );

  worker.on(
    "progress",
    (job: Job<ExportRenderJobData>, progress: number | object) => {
      console.log(
        `[ExportWorker] Job ${job.id} progress: ${JSON.stringify(progress)}`,
      );
    },
  );

  return worker;
}
