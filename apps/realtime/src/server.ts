import "dotenv/config";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { redis, closeRedis } from "./redis";
import { getPersistence, closePersistence } from "./persistence";
import {
  startPersistenceWorker,
  stopPersistenceWorker,
} from "./persistence-worker";
import {
  getActiveRoomNames,
  handleSyncConnection,
  getRoomConnections,
  getRoomSession,
} from "./handlers";

const PORT = parseInt(process.env.PORT ?? "4000", 10);

const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_PREFIX = "ratelimit:";

async function checkRateLimit(clientId: string): Promise<boolean> {
  const key = `${RATE_LIMIT_PREFIX}${clientId}`;
  const now = Date.now();

  const multi = redis.multi();
  multi.zremrangebyscore(key, 0, now - RATE_LIMIT_WINDOW * 1000);
  multi.zadd(key, now, `${now}-${Math.random()}`);
  multi.zcard(key);
  multi.expire(key, RATE_LIMIT_WINDOW);

  const results = await multi.exec();

  if (!results) return false;

  const count = results[2][1] as number;
  return count <= RATE_LIMIT_MAX;
}

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
    res.end(
      JSON.stringify({
        activeRooms: getActiveRoomNames().length,
        rooms: getActiveRoomNames().map((roomName) => ({
          roomName,
          connections: getRoomConnections(roomName).length,
          protocolVersion: getRoomSession(roomName)?.protocolVersion ?? null,
          updatedAt: getRoomSession(roomName)?.updatedAt ?? null,
        })),
      }),
    );
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

const wss = new WebSocketServer({ noServer: true });

wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const pathParts = url.pathname.split("/").filter(Boolean);

  if (pathParts[0] === "yjs" && pathParts.length >= 2) {
    const roomName = pathParts.slice(1).join("/");
    const clientId = `room-${roomName}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const allowed = await checkRateLimit(clientId);
    if (!allowed) {
      ws.close(4003, "Rate limit exceeded");
      return;
    }

    const result = await handleSyncConnection(ws, req, roomName);

    if (!result.success) {
      return;
    }

    ws.on("message", async (_data: Uint8Array, isBinary: boolean) => {
      if (!isBinary) return;

      const rateAllowed = await checkRateLimit(clientId);
      if (!rateAllowed) {
        ws.close(4003, "Rate limit exceeded");
        return;
      }

      try {
        const session = getRoomSession(roomName);
        if (!session) {
          ws.close(1011, "Room session unavailable");
        }
      } catch (err) {
        console.error(
          `[Server] Error processing message in room ${roomName}:`,
          err,
        );
      }
    });

    ws.on("close", () => {
      const remaining = getRoomConnections(roomName).length;
      console.log(
        `[Server] Connection closed for room: ${roomName} (${remaining} active)`,
      );
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
  await closeRedis();
  wss.close();
  server.close(() => process.exit(0));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

start();
