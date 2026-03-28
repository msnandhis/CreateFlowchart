import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const PORT = parseInt(process.env.PORT ?? "4000", 10);

// ─── HTTP Server (health check + future WSS upgrade) ───────────────
const server = createServer((_req: IncomingMessage, res: ServerResponse) => {
  if (_req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
    return;
  }
  res.writeHead(404);
  res.end("Not Found");
});

server.listen(PORT, () => {
  console.log(`🚀 Realtime server listening on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});

// ─── Graceful shutdown ─────────────────────────────────────────────
process.on("SIGTERM", () => {
  console.log("Shutting down realtime server...");
  server.close(() => process.exit(0));
});
