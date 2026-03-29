import ELK from "elkjs/lib/elk.bundled.js";
import { useEditorStore } from "../stores/editorStore";
import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";

const elk = new ELK();

/**
 * Hook to perform automatic layout of the flowchart using ELK.js.
 * Consistent with the 'clean and non-cluttered' user requirement.
 */
export function useLayout() {
  const { rfNodes, rfEdges, setFlowGraph, flowGraph } = useEditorStore();
  const { fitView } = useReactFlow();

  const performLayout = useCallback(async () => {
    if (rfNodes.length === 0) return;

    const elkGraph = {
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": "DOWN",
        "elk.spacing.nodeNode": "80",
        "elk.layered.spacing.nodeNodeBetweenLayers": "100",
      },
      children: rfNodes.map((node) => ({
        id: node.id,
        width: 180, // Approximate width
        height: 60,  // Approximate height
      })),
      edges: rfEdges.map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
      })),
    };

    try {
      const layoutedGraph = await elk.layout(elkGraph);
      
      const newNodes = flowGraph.nodes.map((node) => {
        const elkNode = layoutedGraph.children?.find((c) => c.id === node.id);
        if (elkNode) {
          return {
            ...node,
            position: { x: elkNode.x || 0, y: elkNode.y || 0 },
          };
        }
        return node;
      });

      setFlowGraph({ ...flowGraph, nodes: newNodes });
      
      // Allow React Flow to update before fitting view
      setTimeout(() => fitView({ duration: 800 }), 100);
    } catch (e) {
      console.error("[Layout] ELK error:", e);
    }
  }, [rfNodes, rfEdges, flowGraph, setFlowGraph, fitView]);

  return { performLayout };
}
