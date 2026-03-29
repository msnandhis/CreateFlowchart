import { useEffect, useRef, useCallback } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { useEditorStore } from "../stores/editorStore";
import type { DiagramDocument } from "@createflowchart/schema";

const REALTIME_URL =
  process.env.NEXT_PUBLIC_REALTIME_URL || "ws://localhost:4000";

function generateUserColor(): string {
  const colors = [
    "#3b82f6",
    "#ef4444",
    "#22c55e",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#6366f1",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

interface UserPresence {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number } | null;
  lastActive: number;
}

/**
 * Hook to synchronize the EditorStore with a Yjs document via WebSockets.
 * Handles nodes, edges, and presence (cursors).
 */
export function useYjs(flowId: string | null) {
  const document = useEditorStore((s) => s.document);
  const setDocument = useEditorStore((s) => s.setDocument);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const isLocalUpdateRef = useRef(false);
  const lastSerializedDocumentRef = useRef<string | null>(null);
  const userIdRef = useRef<string>(
    `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const userColorRef = useRef(generateUserColor());

  const updateLocalCursor = useCallback((x: number, y: number) => {
    const provider = providerRef.current;
    if (!provider) return;

    const currentState = provider.awareness.getLocalState();
    const userPresence: UserPresence = {
      id: userIdRef.current,
      name: "User",
      color: userColorRef.current,
      cursor: { x, y },
      lastActive: Date.now(),
    };

    provider.awareness.setLocalStateField("user", userPresence);
  }, []);

  useEffect(() => {
    if (!flowId) return;

    const doc = new Y.Doc();
    const provider = new WebsocketProvider(
      REALTIME_URL,
      `flow-${flowId}`,
      doc,
      { connect: true },
    );

    ydocRef.current = doc;
    providerRef.current = provider;

    const yDiagram = doc.getMap<string>("diagram");

    provider.awareness.setLocalStateField("user", {
      id: userIdRef.current,
      name: "User",
      color: userColorRef.current,
      cursor: null,
      lastActive: Date.now(),
    } as UserPresence);

    const handleYDocumentUpdate = () => {
      isLocalUpdateRef.current = true;
      try {
        const serialized = yDiagram.get("document");
        if (!serialized || serialized === lastSerializedDocumentRef.current) {
          return;
        }

        const nextDocument = JSON.parse(serialized) as DiagramDocument;
        lastSerializedDocumentRef.current = serialized;
        setDocument(nextDocument);
      } finally {
        isLocalUpdateRef.current = false;
      }
    };

    yDiagram.observe(handleYDocumentUpdate);

    const handleProviderSync = (isSynced: boolean) => {
      if (isSynced) {
        const serialized = yDiagram.get("document");
        if (serialized) {
          const syncedDocument = JSON.parse(serialized) as DiagramDocument;
          lastSerializedDocumentRef.current = serialized;
          setDocument(syncedDocument);
        }
      }
    };

    provider.on("sync", handleProviderSync);

    return () => {
      provider.off("sync", handleProviderSync);
      yDiagram.unobserve(handleYDocumentUpdate);
      provider.disconnect();
      doc.destroy();
    };
  }, [flowId, setDocument]);

  useEffect(() => {
    const doc = ydocRef.current;
    if (!doc || isLocalUpdateRef.current) return;

    const yDiagram = doc.getMap<string>("diagram");
    const serialized = JSON.stringify(document);
    if (yDiagram.get("document") === serialized) {
      return;
    }

    doc.transact(() => {
      yDiagram.set("document", serialized);
    }, "local");
    lastSerializedDocumentRef.current = serialized;
  }, [document]);

  return { provider: providerRef.current, updateLocalCursor };
}
