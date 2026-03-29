import type { WebSocket } from "ws";
import type { IncomingMessage } from "node:http";
import * as Y from "yjs";
import {
  getPersistence,
  type PersistedRoomState,
  type RoomPersistence,
} from "../persistence";

interface SyncConnection {
  ws: WebSocket;
  doc: Y.Doc;
  userId: string;
  roomName: string;
  isAlive: boolean;
}

const connections = new Map<string, SyncConnection[]>();

export function getRoomConnections(roomName: string): SyncConnection[] {
  return connections.get(roomName) || [];
}

export function addConnection(conn: SyncConnection): void {
  const room = connections.get(conn.roomName) || [];
  room.push(conn);
  connections.set(conn.roomName, room);
}

export function removeConnection(roomName: string, ws: WebSocket): void {
  const room = connections.get(roomName);
  if (!room) return;

  const idx = room.findIndex((c) => c.ws === ws);
  if (idx !== -1) {
    room.splice(idx, 1);
    if (room.length === 0) {
      connections.delete(roomName);
    }
  }
}

export function broadcastToRoom(
  roomName: string,
  excludeWs: WebSocket,
  message: Uint8Array,
): void {
  const room = connections.get(roomName);
  if (!room) return;

  for (const conn of room) {
    if (conn.ws !== excludeWs && conn.ws.readyState === 1) {
      conn.ws.send(message, { binary: true });
    }
  }
}

export function handleSyncConnection(
  ws: WebSocket,
  _req: IncomingMessage,
  roomName: string,
): { success: boolean; error?: string; userId?: string } {
  const doc = new Y.Doc();
  const persistence = getPersistence();

  const conn: SyncConnection = {
    ws,
    doc,
    userId: `guest-${Date.now()}`,
    roomName,
    isAlive: true,
  };

  addConnection(conn);

  ws.on("pong", () => {
    conn.isAlive = true;
  });

  ws.on("message", (data: Uint8Array, isBinary: boolean) => {
    if (!isBinary) return;

    try {
      const update = new Uint8Array(data);
      Y.applyUpdate(doc, update, "remote");

      broadcastToRoom(roomName, ws, update);
      void persistRoom(roomName, persistence);
    } catch (err) {
      console.error(
        `[Sync] Error processing message in room ${roomName}:`,
        err,
      );
    }
  });

  ws.on("close", () => {
    void persistRoom(roomName, persistence);
    removeConnection(roomName, ws);
    doc.destroy();
    console.log(
      `[Sync] Connection closed for room: ${roomName}, user: guest`,
    );
  });

  ws.on("error", (err) => {
    console.error(`[Sync] WebSocket error in room ${roomName}:`, err);
    removeConnection(roomName, ws);
    doc.destroy();
  });

  void loadPersistedDoc(doc, roomName, persistence);

  console.log(
    `[Sync] New connection for room: ${roomName}, user: guest`,
  );
  return { success: true, userId: "guest" };
}

async function loadPersistedDoc(
  doc: Y.Doc,
  roomName: string,
  persistence: RoomPersistence | null,
): Promise<void> {
  if (!persistence) return;

  try {
    const persisted = await persistence.load(roomName);
    if (persisted) {
      const update = new Uint8Array(persisted.yjsSnapshot);
      Y.applyUpdate(doc, update, "persisted");
      restoreCanonicalDocument(doc, persisted);
      console.log(`[Sync] Loaded persisted state for room: ${roomName}`);
    }
  } catch (err) {
    console.error(
      `[Sync] Failed to load persisted state for room ${roomName}:`,
      err,
    );
  }
}

export async function persistRoom(
  roomName: string,
  persistence: RoomPersistence | null,
): Promise<void> {
  if (!persistence) return;

  const room = connections.get(roomName);
  if (!room || room.length === 0) return;

  const doc = room[0].doc;
  const state = Y.encodeStateAsUpdate(doc);
  const documentSnapshot = extractCanonicalDocument(doc);

  try {
    await persistence.store(roomName, {
      yjsSnapshot: Buffer.from(state),
      documentSnapshot,
    });
    console.log(`[Sync] Persisted state for room: ${roomName}`);
  } catch (err) {
    console.error(`[Sync] Failed to persist room ${roomName}:`, err);
  }
}

function extractCanonicalDocument(doc: Y.Doc): string | null {
  const diagramMap = doc.getMap<string>("diagram");
  return diagramMap.get("document") ?? null;
}

function restoreCanonicalDocument(
  doc: Y.Doc,
  persisted: PersistedRoomState,
): void {
  if (!persisted.documentSnapshot) {
    return;
  }

  const diagramMap = doc.getMap<string>("diagram");
  if (!diagramMap.get("document")) {
    diagramMap.set("document", persisted.documentSnapshot);
  }
}
