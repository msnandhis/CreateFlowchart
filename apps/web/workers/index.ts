import "dotenv/config";

console.log("🚀 Starting CreateFlowchart Workers...");
console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);

const { createAIGatewayWorker } = require("./ai-worker");
const { createExportWorker } = require("./export-worker");
const { createEmbeddingWorker } = require("./embedding-worker");

let aiWorker: ReturnType<typeof createAIGatewayWorker>;
let exportWorker: ReturnType<typeof createExportWorker>;
let embeddingWorker: ReturnType<typeof createEmbeddingWorker>;

async function startWorkers() {
  console.log("[Workers] Initializing AI Gateway Worker...");
  aiWorker = createAIGatewayWorker();

  console.log("[Workers] Initializing Export Worker...");
  exportWorker = createExportWorker();

  console.log("[Workers] Initializing Embedding Worker...");
  embeddingWorker = createEmbeddingWorker();

  console.log("✅ All workers started successfully");
}

async function gracefulShutdown(signal: string) {
  console.log(`\n[Workers] Received ${signal}, shutting down gracefully...`);

  const shutdown = async (
    worker: { close: () => Promise<void> },
    name: string,
  ) => {
    try {
      await worker.close();
      console.log(`[Workers] ${name} closed`);
    } catch (err) {
      console.error(`[Workers] Error closing ${name}:`, err);
    }
  };

  await Promise.all([
    shutdown(aiWorker, "AI Gateway Worker"),
    shutdown(exportWorker, "Export Worker"),
    shutdown(embeddingWorker, "Embedding Worker"),
  ]);

  console.log("[Workers] All workers shut down");
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  console.error("[Workers] Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "[Workers] Unhandled Rejection at:",
    promise,
    "reason:",
    reason,
  );
});

startWorkers().catch((err) => {
  console.error("[Workers] Failed to start workers:", err);
  process.exit(1);
});
