import type { FlowGraph, FlowNode, FlowEdge } from "./schema";

// ─── React Flow compatible types ───────────────────────────────────
export interface RFNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface RFEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  style?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

// ─── FlowGraph → React Flow format ────────────────────────────────
export function toReactFlowFormat(fg: FlowGraph): {
  nodes: RFNode[];
  edges: RFEdge[];
} {
  const nodes: RFNode[] = fg.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: { x: node.position.x, y: node.position.y },
    data: {
      label: node.data.label,
      confidence: node.data.confidence,
      meta: { ...node.data.meta },
      ...(node.data.action ? { action: { ...node.data.action } } : {}),
    },
  }));

  const edges: RFEdge[] = fg.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    ...(edge.label ? { label: edge.label } : {}),
    animated: true,
    data: {
      confidence: edge.confidence,
    },
    // Low-confidence edges get a warning style
    ...(edge.confidence !== undefined && edge.confidence < 0.7
      ? { style: { stroke: "var(--color-node-low-confidence, #FFD60A)", strokeWidth: 2 } }
      : {}),
  }));

  return { nodes, edges };
}

// ─── React Flow format → FlowGraph ────────────────────────────────
export function fromReactFlowFormat(
  nodes: RFNode[],
  edges: RFEdge[],
  meta?: FlowGraph["meta"]
): FlowGraph {
  const flowNodes: FlowNode[] = nodes.map((node) => ({
    id: node.id,
    type: node.type as FlowNode["type"],
    position: { x: node.position.x, y: node.position.y },
    data: {
      label: (node.data.label as string) || "Untitled",
      confidence: (node.data.confidence as number) ?? 1.0,
      meta: (node.data.meta as Record<string, unknown>) ?? {},
      ...(node.data.action
        ? {
            action: node.data.action as FlowNode["data"]["action"],
          }
        : {}),
    },
  }));

  const flowEdges: FlowEdge[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    ...(edge.label ? { label: String(edge.label) } : {}),
    ...(edge.data?.confidence !== undefined
      ? { confidence: edge.data.confidence as number }
      : {}),
  }));

  return {
    nodes: flowNodes,
    edges: flowEdges,
    meta: meta ?? { version: 1, isSandbox: false },
  };
}

// ─── FlowGraph → Mermaid syntax ───────────────────────────────────
export function toMermaid(fg: FlowGraph): string {
  const lines: string[] = ["graph TD"];

  for (const node of fg.nodes) {
    const label = node.data.label.replace(/"/g, "'");
    switch (node.type) {
      case "start":
        lines.push(`    ${node.id}([${label}])`);
        break;
      case "end":
        lines.push(`    ${node.id}([${label}])`);
        break;
      case "decision":
        lines.push(`    ${node.id}{${label}}`);
        break;
      case "action":
        lines.push(`    ${node.id}[/${label}/]`);
        break;
      default: // process
        lines.push(`    ${node.id}[${label}]`);
        break;
    }
  }

  for (const edge of fg.edges) {
    if (edge.label) {
      lines.push(`    ${edge.source} -->|${edge.label}| ${edge.target}`);
    } else {
      lines.push(`    ${edge.source} --> ${edge.target}`);
    }
  }

  return lines.join("\n");
}

// ─── FlowGraph → Pretty JSON string ──────────────────────────────
export function toJSON(fg: FlowGraph): string {
  return JSON.stringify(fg, null, 2);
}
