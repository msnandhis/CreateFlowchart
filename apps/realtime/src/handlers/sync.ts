import type { WebSocket } from "ws";
import type { IncomingMessage } from "node:http";
import * as Y from "yjs";
import {
  getPersistence,
  type PersistedRoomState,
  type RoomPersistence,
  ROOM_PROTOCOL_VERSION,
} from "../persistence";
import { createAwareness, clearAwareness } from "./awareness";

interface SyncConnection {
  ws: WebSocket;
  userId: string;
  roomName: string;
  isAlive: boolean;
}

interface RoomSession {
  roomName: string;
  doc: Y.Doc;
  protocolVersion: number;
  updatedAt: string;
}

const connections = new Map<string, SyncConnection[]>();
const roomSessions = new Map<string, RoomSession>();

export function getRoomConnections(roomName: string): SyncConnection[] {
  return connections.get(roomName) || [];
}

export function getActiveRoomNames(): string[] {
  return Array.from(roomSessions.keys());
}

export function getRoomSession(roomName: string): RoomSession | null {
  return roomSessions.get(roomName) ?? null;
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
      const session = roomSessions.get(roomName);
      session?.doc.destroy();
      roomSessions.delete(roomName);
      clearAwareness(roomName);
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

export async function handleSyncConnection(
  ws: WebSocket,
  _req: IncomingMessage,
  roomName: string,
): Promise<{ success: boolean; error?: string; userId?: string }> {
  const persistence = getPersistence();
  const session = await getOrCreateRoomSession(roomName, persistence);
  const { doc } = session;
  createAwareness(roomName, doc);

  const conn: SyncConnection = {
    ws,
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
      session.updatedAt = new Date().toISOString();

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

  console.log(
    `[Sync] New connection for room: ${roomName}, user: guest`,
  );
  return { success: true, userId: "guest" };
}

async function getOrCreateRoomSession(
  roomName: string,
  persistence: RoomPersistence | null,
): Promise<RoomSession> {
  const existing = roomSessions.get(roomName);
  if (existing) {
    return existing;
  }

  const doc = new Y.Doc();
  const session: RoomSession = {
    roomName,
    doc,
    protocolVersion: ROOM_PROTOCOL_VERSION,
    updatedAt: new Date().toISOString(),
  };

  await loadPersistedDoc(doc, roomName, persistence, session);
  roomSessions.set(roomName, session);
  return session;
}

async function loadPersistedDoc(
  doc: Y.Doc,
  roomName: string,
  persistence: RoomPersistence | null,
  session?: RoomSession,
): Promise<void> {
  if (!persistence) return;

  try {
    const persisted = await persistence.load(roomName);
    if (persisted) {
      const update = new Uint8Array(persisted.yjsSnapshot);
      Y.applyUpdate(doc, update, "persisted");
      restoreCanonicalDocument(doc, persisted);
      if (session) {
        session.protocolVersion = persisted.protocolVersion;
        session.updatedAt = persisted.updatedAt;
      }
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

  const session = roomSessions.get(roomName);
  if (!session) return;

  const doc = session.doc;
  const state = Y.encodeStateAsUpdate(doc);
  const documentSnapshot = extractCanonicalDocument(doc);

  try {
    await persistence.store(roomName, {
      roomId: roomName,
      protocolVersion: session.protocolVersion,
      updatedAt: session.updatedAt,
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
