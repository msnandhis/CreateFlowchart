import "dotenv/config";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
import { getPersistence, closePersistence } from "./persistence";
import {
  startPersistenceWorker,
  stopPersistenceWorker,
} from "./persistence-worker";
import {
  handleSyncConnection,
  createAwareness,
  clearAwareness,
} from "./handlers";

const PORT = parseInt(process.env.PORT ?? "4000", 10);

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 100;

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(clientId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

function cleanupRateLimit(): void {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}

setInterval(cleanupRateLimit, RATE_LIMIT_WINDOW);

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
    );
    return;
  }

  if (req.url === "/rooms") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ activeRooms: 0 }));
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const pathParts = url.pathname.split("/").filter(Boolean);

  if (pathParts[0] === "yjs" && pathParts.length >= 2) {
    const roomName = pathParts.slice(1).join("/");
    const clientId = `room-${roomName}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    if (!checkRateLimit(clientId)) {
      ws.close(4003, "Rate limit exceeded");
      return;
    }

    const ydoc = new Y.Doc();
    createAwareness(roomName, ydoc);

    const result = handleSyncConnection(ws, req, roomName);

    if (!result.success) {
      ydoc.destroy();
      clearAwareness(roomName);
      return;
    }

    ws.on("message", (data: Uint8Array, isBinary: boolean) => {
      if (!isBinary) return;

      if (!checkRateLimit(clientId)) {
        ws.close(4003, "Rate limit exceeded");
        return;
      }

      try {
        const update = new Uint8Array(data);
        Y.applyUpdate(ydoc, update, "remote");
      } catch (err) {
        console.error(
          `[Server] Error processing message in room ${roomName}:`,
          err,
        );
      }
    });

    ws.on("close", () => {
      clearAwareness(roomName);
      ydoc.destroy();
      console.log(`[Server] Connection closed for room: ${roomName}`);
    });

    ws.on("close", () => {
      clearAwareness(roomName);
      ydoc.destroy();
      console.log(`[Server] Connection closed for room: ${roomName}`);
    });

    console.log(`[Server] New Yjs connection for room: ${roomName}`);
  } else {
    ws.close(4004, "Invalid path");
  }
});

server.on("upgrade", (request, socket, head) => {
  if (request.url?.startsWith("/yjs")) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

async function start(): Promise<void> {
  try {
    const persistence = getPersistence();
    if (persistence) {
      console.log("[Server] Redis persistence initialized");
    }

    await startPersistenceWorker();

    server.listen(PORT, () => {
      console.log(`🚀 Realtime server listening on port ${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
      console.log(`   Yjs Endpoint: ws://localhost:${PORT}/yjs`);
    });
  } catch (err) {
    console.error("[Server] Failed to start:", err);
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  console.log("Shutting down realtime server...");
  await stopPersistenceWorker();
  closePersistence();
  wss.close();
  server.close(() => process.exit(0));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

start();
