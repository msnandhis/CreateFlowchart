import type { FlowGraph, FlowNode } from "@createflowchart/legacy";
import type { Node, Edge } from "@xyflow/react";

export interface ELKNode {
  id: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  children?: ELKNode[];
  parent?: string;
}

export interface ELKEdge {
  id: string;
  sources: string[];
  targets: string[];
}

export interface ELKOptions {
  algorithm?: "layered" | "stress" | "force";
  spacing?: number;
  "elk.layered.crossingMinimization.forceNodeModelOrder"?: boolean;
  "elk.direction"?: "DOWN" | "UP" | "LEFT" | "RIGHT";
}

const DEFAULT_OPTIONS: ELKOptions = {
  algorithm: "layered",
  spacing: 80,
  "elk.layered.crossingMinimization.forceNodeModelOrder": true,
  "elk.direction": "DOWN",
};

export async function layoutGraph(
  nodes: Node[],
  edges: Edge[],
  options: ELKOptions = DEFAULT_OPTIONS,
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  try {
    const ELK = await import("elkjs/lib/elk.bundled.js");

    const elk = new ELK.default();

    const elkNodes: ELKNode[] = nodes.map((node) => ({
      id: node.id,
      width: (node.measured?.width as number) || 180,
      height: (node.measured?.height as number) || 80,
    }));

    const nodeMap = new Map<string, ELKNode>();
    elkNodes.forEach((n) => nodeMap.set(n.id, n));

    const existingSourceTargets = new Set(
      edges.map((e) => `${e.source}-${e.target}`),
    );

    edges.forEach((edge) => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      if (sourceNode && targetNode) {
        if (!sourceNode.children) sourceNode.children = [];
        if (!sourceNode.parent) {
          sourceNode.children.push(targetNode);
          targetNode.parent = sourceNode.id;
        }
      }
    });

    const rootNodes = elkNodes.filter((n) => !n.parent);

    const elkEdges: ELKEdge[] = edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    }));

    const graph: ELKNode = {
      id: "root",
      children: rootNodes.length > 0 ? rootNodes : elkNodes,
      x: 0,
      y: 0,
    };

    const layoutedGraph = await elk.layout(graph, {
      layoutOptions: {
        "elk.algorithm": options.algorithm === "layered" ? "layered" : "force",
        "elk.spacing.nodeNode": String(options.spacing || 80),
        "elk.direction": options["elk.direction"] || "DOWN",
        "elk.layered.crossingMinimization.forceNodeModelOrder": String(
          options["elk.layered.crossingMinimization.forceNodeModelOrder"] ||
            true,
        ),
      },
    });

    const updatePositions = (
      nodes: ELKNode[],
      offsetX = 0,
      offsetY = 0,
    ): void => {
      nodes.forEach((node) => {
        if (node.x !== undefined && node.y !== undefined) {
          const elkNode = nodeMap.get(node.id);
          if (elkNode) {
            elkNode.x = node.x + offsetX;
            elkNode.y = node.y + offsetY;
          }
        }
        if (node.children) {
          updatePositions(node.children, offsetX, offsetY);
        }
      });
    };

    if (layoutedGraph.children) {
      let minX = Infinity;
      let minY = Infinity;
      (layoutedGraph.children || []).forEach((child: ELKNode) => {
        if (child.x !== undefined && child.y !== undefined) {
          minX = Math.min(minX, child.x);
          minY = Math.min(minY, child.y);
        }
      });
      const padding = 60;
      updatePositions(layoutedGraph.children, -minX + padding, -minY + padding);
    }

    const layoutedNodes = nodes.map((node) => {
      const elkNode = nodeMap.get(node.id);
      return {
        ...node,
        position: {
          x: elkNode?.x ?? node.position.x,
          y: elkNode?.y ?? node.position.y,
        },
      };
    });

    return { nodes: layoutedNodes, edges };
  } catch (error) {
    console.error("[ELK Worker] Layout failed:", error);
    return { nodes, edges };
  }
}

export function isLayouting(nodes: Node[], edges: Edge[]): boolean {
  return nodes.length > 0 && edges.length > 0;
}
