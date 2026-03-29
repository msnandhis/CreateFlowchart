"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { useEditorStore } from "../stores/editorStore";
import type { DiagramDocument } from "@createflowchart/schema";

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

  const document = useEditorStore((s) => s.document);
  const setDocument = useEditorStore((s) => s.setDocument);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const isLocalChangeRef = useRef(false);
  const lastSerializedDocumentRef = useRef<string | null>(null);

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

    const yDiagram = doc.getMap<string>("diagram");

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

      const serialized = yDiagram.get("document");
      if (!serialized || serialized === lastSerializedDocumentRef.current) return;

      const nextDocument = JSON.parse(serialized) as DiagramDocument;
      lastSerializedDocumentRef.current = serialized;
      setDocument(nextDocument);
    };

    yDiagram.observe(handleYDocumentUpdate);

    return () => {
      yDiagram.unobserve(handleYDocumentUpdate);
      provider.disconnect();
      doc.destroy();
      isLocalChangeRef.current = false;
      setSyncState({
        isConnected: false,
        isSynced: false,
        connectionStatus: "disconnected",
      });
    };
  }, [flowId, setDocument]);

  useEffect(() => {
    const doc = ydocRef.current;
    if (!doc || !syncState.isConnected) return;

    const yDiagram = doc.getMap<string>("diagram");
    const serialized = JSON.stringify(document);
    if (yDiagram.get("document") === serialized) return;

    isLocalChangeRef.current = true;

    doc.transact(() => {
      yDiagram.set("document", serialized);
    }, "local");

    lastSerializedDocumentRef.current = serialized;
    isLocalChangeRef.current = false;
  }, [document, syncState.isConnected]);

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
