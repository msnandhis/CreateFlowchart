import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { useEditorStore } from "../stores/editorStore";
import type { DiagramDocument } from "@createflowchart/schema";
import { useSession } from "@/shared/lib/auth-client";

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

export function useYjs(flowId: string | null) {
  const { data: session, isPending } = useSession();
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");
  const [authToken, setAuthToken] = useState<string | null>(null);
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

  const userName =
    session?.user.name ?? session?.user.email ?? "Collaborator";

  useEffect(() => {
    if (session?.user.id) {
      userIdRef.current = session.user.id;
    }
  }, [session?.user.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadToken() {
      if (!flowId) {
        setAuthToken(null);
        return;
      }

      if (isPending) {
        setConnectionStatus("connecting");
        return;
      }

      if (!session) {
        setAuthToken(null);
        setConnectionStatus("disconnected");
        return;
      }

      try {
        const response = await fetch("/api/realtime/token", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to create realtime token");
        }

        const payload = (await response.json()) as { token: string };
        if (!cancelled) {
          setAuthToken(payload.token);
        }
      } catch {
        if (!cancelled) {
          setAuthToken(null);
          setConnectionStatus("disconnected");
        }
      }
    }

    void loadToken();

    return () => {
      cancelled = true;
    };
  }, [flowId, isPending, session]);

  useEffect(() => {
    if (!flowId || !authToken || !session) return;

    const doc = new Y.Doc();
    const provider = new WebsocketProvider(
      REALTIME_URL,
      `flow-${flowId}`,
      doc,
      {
        connect: true,
        params: {
          token: authToken,
          userId: userIdRef.current,
          name: userName,
          color: userColorRef.current,
        },
      },
    );
    setConnectionStatus("connecting");

    ydocRef.current = doc;
    providerRef.current = provider;

    const yDiagram = doc.getMap<string>("diagram");

    provider.on("status", ({ status }: { status: string }) => {
      setConnectionStatus(status as "disconnected" | "connecting" | "connected");
    });

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
      setConnectionStatus("disconnected");
    };
  }, [authToken, flowId, session, setDocument, userName]);

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

  return {
    provider: providerRef.current,
    connectionStatus,
    reconnect: () => providerRef.current?.connect(),
    disconnect: () => providerRef.current?.disconnect(),
    presenceIdentity: {
      userId: userIdRef.current,
      userName,
      userColor: userColorRef.current,
    },
  };
}
