"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { useEditorStore } from "../stores/editorStore";

const REALTIME_URL =
  process.env.NEXT_PUBLIC_REALTIME_URL || "ws://localhost:4000";

interface UseYjsSyncOptions {
  flowId: string | null;
  userId?: string;
  userName?: string;
  userColor?: string;
}

interface SyncState {
  isConnected: boolean;
  isSynced: boolean;
  connectionStatus: "disconnected" | "connecting" | "connected";
}

export function useYjsSync({
  flowId,
  userId,
  userName = "Anonymous",
  userColor = "#3b82f6",
}: UseYjsSyncOptions) {
  const [syncState, setSyncState] = useState<SyncState>({
    isConnected: false,
    isSynced: false,
    connectionStatus: "disconnected",
  });

  const { rfNodes, rfEdges, setFlowGraph } = useEditorStore();
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const isLocalChangeRef = useRef(false);

  useEffect(() => {
    if (!flowId) return;

    setSyncState((prev) => ({ ...prev, connectionStatus: "connecting" }));

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

    provider.on("status", ({ status }: { status: string }) => {
      setSyncState((prev) => ({
        ...prev,
        connectionStatus: status as "disconnected" | "connecting" | "connected",
        isConnected: status === "connected",
      }));
    });

    provider.on("sync", (synced: boolean) => {
      setSyncState((prev) => ({ ...prev, isSynced: synced }));
    });

    const handleYDocumentUpdate = () => {
      if (isLocalChangeRef.current) return;

      const nodes = Array.from(yNodes.values()) as any[];
      const edges = Array.from(yEdges.values()) as any[];

      if (nodes.length === 0 && edges.length === 0) return;

      const currentNodes = useEditorStore.getState().rfNodes;
      const currentEdges = useEditorStore.getState().rfEdges;

      if (
        JSON.stringify(nodes) !== JSON.stringify(currentNodes) ||
        JSON.stringify(edges) !== JSON.stringify(currentEdges)
      ) {
        useEditorStore.setState({
          rfNodes: nodes,
          rfEdges: edges,
        });
      }
    };

    yNodes.observeDeep(handleYDocumentUpdate);
    yEdges.observeDeep(handleYDocumentUpdate);

    return () => {
      provider.disconnect();
      doc.destroy();
      isLocalChangeRef.current = false;
      setSyncState({
        isConnected: false,
        isSynced: false,
        connectionStatus: "disconnected",
      });
    };
  }, [flowId]);

  useEffect(() => {
    const doc = ydocRef.current;
    if (!doc || !syncState.isConnected) return;

    const yNodes = doc.getMap("nodes");
    const yEdges = doc.getMap("edges");

    isLocalChangeRef.current = true;

    doc.transact(() => {
      rfNodes.forEach((node) => {
        const existing = yNodes.get(node.id);
        if (JSON.stringify(existing) !== JSON.stringify(node)) {
          yNodes.set(node.id, node);
        }
      });

      const nodeIds = new Set(rfNodes.map((n) => n.id));
      yNodes.forEach((_, key) => {
        if (!nodeIds.has(key)) yNodes.delete(key);
      });

      rfEdges.forEach((edge) => {
        const existing = yEdges.get(edge.id);
        if (JSON.stringify(existing) !== JSON.stringify(edge)) {
          yEdges.set(edge.id, edge);
        }
      });

      const edgeIds = new Set(rfEdges.map((e) => e.id));
      yEdges.forEach((_, key) => {
        if (!edgeIds.has(key)) yEdges.delete(key);
      });
    }, "local");

    isLocalChangeRef.current = false;
  }, [rfNodes, rfEdges, syncState.isConnected]);

  const disconnect = useCallback(() => {
    providerRef.current?.disconnect();
  }, []);

  const reconnect = useCallback(() => {
    providerRef.current?.connect();
  }, []);

  return {
    provider: providerRef.current,
    doc: ydocRef.current,
    isConnected: syncState.isConnected,
    isSynced: syncState.isSynced,
    connectionStatus: syncState.connectionStatus,
    disconnect,
    reconnect,
  };
}
