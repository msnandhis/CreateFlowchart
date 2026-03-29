import { useEffect, useRef, useCallback } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { useEditorStore } from "../stores/editorStore";

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
  const { rfNodes, rfEdges, loadFlow } = useEditorStore();
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const isLocalUpdateRef = useRef(false);
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

    const yNodes = doc.getMap("nodes");
    const yEdges = doc.getMap("edges");

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
        const nodes = Array.from(yNodes.values()) as any[];
        const edges = Array.from(yEdges.values()) as any[];

        if (nodes.length === 0 && edges.length === 0) return;

        useEditorStore.setState({
          rfNodes: nodes,
          rfEdges: edges,
        });
      } finally {
        isLocalUpdateRef.current = false;
      }
    };

    yNodes.observeDeep(handleYDocumentUpdate);
    yEdges.observeDeep(handleYDocumentUpdate);

    const handleProviderSync = (isSynced: boolean) => {
      if (isSynced) {
        const nodes = Array.from(yNodes.values()) as any[];
        const edges = Array.from(yEdges.values()) as any[];

        if (nodes.length > 0 || edges.length > 0) {
          useEditorStore.setState({
            rfNodes: nodes,
            rfEdges: edges,
          });
        }
      }
    };

    provider.on("sync", handleProviderSync);

    return () => {
      provider.off("sync", handleProviderSync);
      provider.disconnect();
      doc.destroy();
    };
  }, [flowId]);

  useEffect(() => {
    const doc = ydocRef.current;
    if (!doc || isLocalUpdateRef.current) return;

    const yNodes = doc.getMap("nodes");
    const yEdges = doc.getMap("edges");

    doc.transact(() => {
      const currentNodes = new Map(rfNodes.map((n) => [n.id, n]));
      const currentEdges = new Map(rfEdges.map((e) => [e.id, e]));

      yNodes.forEach((_, key) => {
        if (!currentNodes.has(key)) yNodes.delete(key);
      });

      yEdges.forEach((_, key) => {
        if (!currentEdges.has(key)) yEdges.delete(key);
      });

      rfNodes.forEach((node) => {
        yNodes.set(node.id, node);
      });

      rfEdges.forEach((edge) => {
        yEdges.set(edge.id, edge);
      });
    }, "local");
  }, [rfNodes, rfEdges]);

  return { provider: providerRef.current, updateLocalCursor };
}
