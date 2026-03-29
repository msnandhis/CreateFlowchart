import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocketServer } from "ws";
// @ts-ignore - y-websocket doesn't have proper types for the bin/utils import
import { setupWSConnection } from "y-websocket/bin/utils";


const PORT = parseInt(process.env.PORT ?? "4000", 10);

// ─── HTTP Server (Health check) ───────────────────────────────────
const server = createServer((_req: IncomingMessage, res: ServerResponse) => {
  if (_req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
    return;
  }
  res.writeHead(404);
  res.end("Not Found");
});

// ─── WebSocket Server (Yjs) ───────────────────────────────────────
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws, req) => {
  // roomName is derived from the URL path: /yjs/:room
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const roomName = url.pathname.split("/").pop() || "default";
  
  console.log(`[Yjs] New connection for room: ${roomName}`);
  
  setupWSConnection(ws, req, { docName: roomName, gc: true });
});

// Upgrade HTTP to WS
server.on("upgrade", (request, socket, head) => {
  if (request.url?.startsWith("/yjs")) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Realtime server listening on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Yjs Endpoint: ws://localhost:${PORT}/yjs`);
});

// ─── Graceful shutdown ─────────────────────────────────────────────
process.on("SIGTERM", () => {
  console.log("Shutting down realtime server...");
  wss.close();
  server.close(() => process.exit(0));
});

