import type { WebSocket } from "ws";
import type { IncomingMessage } from "node:http";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import { authWebSocket } from "../auth";

interface AwarenessUpdate {
  added: number[];
  updated: number[];
  removed: number[];
}

interface UserPresence {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number } | null;
  lastActive: number;
}

const awarenessByRoom = new Map<string, awarenessProtocol.Awareness>();

export function getAwareness(
  roomName: string,
): awarenessProtocol.Awareness | null {
  return awarenessByRoom.get(roomName) || null;
}

export function createAwareness(
  roomName: string,
  doc: Y.Doc,
): awarenessProtocol.Awareness {
  let awareness = awarenessByRoom.get(roomName);
  if (awareness) return awareness;

  awareness = new awarenessProtocol.Awareness(doc);
  awarenessByRoom.set(roomName, awareness);

  awareness.on("update", ({ added, updated, removed }: AwarenessUpdate) => {
    const changedClients = added.concat(updated, removed);
    if (changedClients.length === 0) return;
  });

  return awareness;
}

export function handleAwarenessConnection(
  ws: WebSocket,
  req: IncomingMessage,
  roomName: string,
  clientId: number,
): { success: boolean; error?: string } {
  const authResult = authWebSocket(req);
  if (!authResult.authorized) {
    ws.close(4001, authResult.error || "Unauthorized");
    return { success: false, error: authResult.error };
  }

  const awareness = awarenessByRoom.get(roomName);
  if (!awareness) {
    ws.close(4002, "Awareness not initialized");
    return { success: false, error: "Awareness not initialized" };
  }

  ws.on("message", (data: Uint8Array) => {
    try {
      awarenessProtocol.applyAwarenessUpdate(
        awareness!,
        new Uint8Array(data),
        "remote",
      );
    } catch (err) {
      console.error(
        `[Awareness] Error processing message in room ${roomName}:`,
        err,
      );
    }
  });

  ws.on("close", () => {
    awarenessProtocol.removeAwarenessStates(
      awareness!,
      [clientId],
      "connection-closed",
    );
    console.log(
      `[Awareness] Connection closed for room: ${roomName}, client: ${clientId}`,
    );
  });

  return { success: true };
}

export function setLocalUser(roomName: string, user: UserPresence): void {
  const awareness = awarenessByRoom.get(roomName);
  if (!awareness) return;

  awareness.setLocalStateField("user", user);
}

export function clearAwareness(roomName: string): void {
  const awareness = awarenessByRoom.get(roomName);
  if (!awareness) return;

  awareness.destroy();
  awarenessByRoom.delete(roomName);
}

export function getRoomPresence(roomName: string): Map<number, UserPresence> {
  const awareness = awarenessByRoom.get(roomName);
  if (!awareness) return new Map();

  const presence = new Map<number, UserPresence>();
  const states = awareness.getStates();

  states.forEach((state, clientId) => {
    if (state.user) {
      presence.set(clientId, state.user as UserPresence);
    }
  });

  return presence;
}
