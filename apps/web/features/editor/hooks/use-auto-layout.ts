"use client";

import { useCallback, useState } from "react";
import { useEditorStore } from "../stores/editorStore";
import { layoutGraph } from "../workers/elk-worker";

export function useAutoLayout() {
  const [isLayouting, setIsLayouting] = useState(false);
  const rfNodes = useEditorStore((s) => s.rfNodes);
  const rfEdges = useEditorStore((s) => s.rfEdges);
  const document = useEditorStore((s) => s.document);
  const setDocument = useEditorStore((s) => s.setDocument);

  const runLayout = useCallback(async () => {
    if (rfNodes.length === 0) return;

    setIsLayouting(true);
    try {
      const { nodes: layoutedNodes } = await layoutGraph(rfNodes, rfEdges);
      setDocument({
        ...document,
        nodes: document.nodes.map((node) => {
          const layouted = layoutedNodes.find((entry) => entry.id === node.id);
          return layouted ? { ...node, position: layouted.position } : node;
        }),
      });
    } catch (error) {
      console.error("[AutoLayout] Failed:", error);
    } finally {
      setIsLayouting(false);
    }
  }, [rfNodes, rfEdges, document, setDocument]);

  return { runLayout, isLayouting };
}
