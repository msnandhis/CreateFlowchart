import { useEffect, useRef } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { useEditorStore } from "../stores/editorStore";
import { toReactFlowFormat } from "@createflowchart/core";

const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL || "ws://localhost:4000";

/**
 * Hook to synchronize the EditorStore with a Yjs document via WebSockets.
 * Handles nodes, edges, and presence (cursors).
 */
export function useYjs(flowId: string | null) {
  const { rfNodes, rfEdges, loadFlow, flowGraph } = useEditorStore();
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  useEffect(() => {
    if (!flowId) return;

    const doc = new Y.Doc();
    const provider = new WebsocketProvider(
      REALTIME_URL,
      `flow-${flowId}`,
      doc,
      { connect: true }
    );

    ydocRef.current = doc;
    providerRef.current = provider;

    const yNodes = doc.getMap("nodes");
    const yEdges = doc.getMap("edges");

    // ─── Sync from Yjs to Zustand ──────────────────────────────────
    const handleYDocumentUpdate = () => {
      // Get the full state from Yjs
      const nodes = Array.from(yNodes.values()) as any[];
      const edges = Array.from(yEdges.values()) as any[];

      if (nodes.length === 0 && edges.length === 0) return;

      // Sync to store if different (shallow check or just overwrite for now)
      // Note: In a production app, we'd use Y.Array or Y.Map observers for performance
      const currentNodes = useEditorStore.getState().rfNodes;
      const currentEdges = useEditorStore.getState().rfEdges;

      if (JSON.stringify(nodes) !== JSON.stringify(currentNodes) ||
          JSON.stringify(edges) !== JSON.stringify(currentEdges)) {
        useEditorStore.setState({ 
          rfNodes: nodes, 
          rfEdges: edges,
          // We derive flowGraph from these in a real sync scenario or store both
        });
      }
    };

    yNodes.observeDeep(handleYDocumentUpdate);
    yEdges.observeDeep(handleYDocumentUpdate);

    return () => {
      provider.disconnect();
      doc.destroy();
    };
  }, [flowId]);

  // ─── Sync from Zustand to Yjs ────────────────────────────────────
  useEffect(() => {
    const doc = ydocRef.current;
    if (!doc) return;

    const yNodes = doc.getMap("nodes");
    const yEdges = doc.getMap("edges");

    // We use a transaction to avoid multiple update events
    doc.transact(() => {
      // Simple sync: Update Yjs if Zustand state changed
      rfNodes.forEach((node) => {
        const existing = yNodes.get(node.id);
        if (JSON.stringify(existing) !== JSON.stringify(node)) {
          yNodes.set(node.id, node);
        }
      });

      // Cleanup nodes that no longer exist
      const nodeIds = new Set(rfNodes.map(n => n.id));
      yNodes.forEach((_, key) => {
        if (!nodeIds.has(key)) yNodes.delete(key);
      });

      rfEdges.forEach((edge) => {
        const existing = yEdges.get(edge.id);
        if (JSON.stringify(existing) !== JSON.stringify(edge)) {
          yEdges.set(edge.id, edge);
        }
      });

      // Cleanup edges that no longer exist
      const edgeIds = new Set(rfEdges.map(e => e.id));
      yEdges.forEach((_, key) => {
        if (!edgeIds.has(key)) yEdges.delete(key);
      });
    }, "local"); // Mark the origin as local to avoid infinite loops if handled in observer
  }, [rfNodes, rfEdges]);


  return { provider: providerRef.current };
}
