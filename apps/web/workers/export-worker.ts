import { Job, Worker } from "bullmq";
import type { ExportRenderJobData } from "../shared/lib/queue";
import { redis } from "../shared/lib/redis";
import { db } from "../shared/lib/db";
import { flows } from "@createflowchart/db/src/schema";
import { eq } from "drizzle-orm";
import {
  exportAsJSON,
  exportAsMermaid,
  exportAsSVG,
  exportAsPNGData,
  exportAsPDFData,
  type ExportFormat,
} from "../shared/lib/export-renderer";
import { normalizePersistedFlow } from "../features/editor/lib/persisted-flow";

export async function processExportJob(job: Job<ExportRenderJobData>): Promise<{
  success: boolean;
  downloadUrl?: string;
  format: ExportFormat;
  fileSize?: number;
  svgContent?: string;
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

    const normalized = normalizePersistedFlow({
      data: typeof flow.data === "string" ? JSON.parse(flow.data) : flow.data,
      id: flow.id,
      title: flow.title,
      authorId: flow.userId,
    });
    const document = normalized.document;

    await job.updateProgress(25);

    let result: {
      success: boolean;
      downloadUrl?: string;
      format: ExportFormat;
      fileSize?: number;
      svgContent?: string;
    };

    switch (format) {
      case "json": {
        const jsonResult = exportAsJSON(document);
        if (!jsonResult.content) throw new Error("Failed to generate JSON");
        const key = `export:${flowId}:${Date.now()}.json`;
        await redis.set(key, jsonResult.content, "EX", 3600);
        result = {
          success: true,
          downloadUrl: `/api/export/download?key=${key}`,
          format: "json",
          fileSize: jsonResult.fileSize,
        };
        break;
      }
      case "mermaid": {
        const mermaidResult = exportAsMermaid(document);
        if (!mermaidResult.content)
          throw new Error("Failed to generate Mermaid");
        const key = `export:${flowId}:${Date.now()}.mmd`;
        await redis.set(key, mermaidResult.content, "EX", 3600);
        result = {
          success: true,
          downloadUrl: `/api/export/download?key=${key}`,
          format: "mermaid",
          fileSize: mermaidResult.fileSize,
        };
        break;
      }
      case "svg": {
        const svgResult = exportAsSVG(document);
        if (!svgResult.content) throw new Error("Failed to generate SVG");
        const key = `export:${flowId}:${Date.now()}.svg`;
        await redis.set(key, svgResult.content, "EX", 3600);
        result = {
          success: true,
          downloadUrl: `/api/export/download?key=${key}`,
          format: "svg",
          fileSize: svgResult.fileSize,
        };
        break;
      }
      case "png": {
        const svgResult = exportAsPNGData(document);
        if (!svgResult.content) throw new Error("Failed to generate PNG data");
        const key = `export:${flowId}:${Date.now()}.svg`;
        await redis.set(key, svgResult.content, "EX", 3600);
        result = {
          success: true,
          downloadUrl: `/api/export/download?key=${key}`,
          format: "png",
          fileSize: svgResult.fileSize,
          svgContent: svgResult.content,
        };
        break;
      }
      case "pdf": {
        const pdfResult = exportAsPDFData(document);
        if (!pdfResult.content) throw new Error("Failed to generate PDF data");
        const key = `export:${flowId}:${Date.now()}.svg`;
        await redis.set(key, pdfResult.content, "EX", 3600);
        result = {
          success: true,
          downloadUrl: `/api/export/download?key=${key}`,
          format: "pdf",
          fileSize: pdfResult.fileSize,
          svgContent: pdfResult.content,
        };
        break;
      }
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
