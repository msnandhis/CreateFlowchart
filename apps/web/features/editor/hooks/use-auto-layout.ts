"use client";

import { useCallback, useState } from "react";
import type { Node, Edge } from "@xyflow/react";
import { useEditorStore } from "../stores/editorStore";
import { layoutGraph } from "../workers/elk-worker";

export function useAutoLayout() {
  const [isLayouting, setIsLayouting] = useState(false);
  const rfNodes = useEditorStore((s) => s.rfNodes);
  const rfEdges = useEditorStore((s) => s.rfEdges);
  const setFlowGraph = useEditorStore((s) => s.setFlowGraph);
  const flowGraph = useEditorStore((s) => s.flowGraph);

  const runLayout = useCallback(async () => {
    if (rfNodes.length === 0) return;

    setIsLayouting(true);
    try {
      const { nodes: layoutedNodes } = await layoutGraph(rfNodes, rfEdges);

      const newFlowGraph: typeof flowGraph = {
        ...flowGraph,
        nodes: flowGraph.nodes.map((node) => {
          const layouted = layoutedNodes.find((n) => n.id === node.id);
          return layouted ? { ...node, position: layouted.position } : node;
        }),
      };

      setFlowGraph(newFlowGraph);
    } catch (error) {
      console.error("[AutoLayout] Failed:", error);
    } finally {
      setIsLayouting(false);
    }
  }, [rfNodes, rfEdges, flowGraph, setFlowGraph]);

  return { runLayout, isLayouting };
}
