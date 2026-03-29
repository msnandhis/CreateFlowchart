import { createDiagramDocument, type DiagramDocument } from "./document";

export interface LegacyFlowGraph {
  nodes: Array<{
    id: string;
    type: "start" | "process" | "decision" | "action" | "end";
    position: { x: number; y: number };
    data: {
      label: string;
      confidence?: number;
      meta: Record<string, unknown>;
      action?: {
        webhook_url: string;
        method: "GET" | "POST" | "PUT" | "DELETE";
        headers: Record<string, string>;
        payload_template?: string;
      };
    };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    confidence?: number;
  }>;
  meta: {
    version: number;
    createdBy?: string;
    isSandbox: boolean;
  };
}

function inferShape(type: LegacyFlowGraph["nodes"][number]["type"]): string {
  switch (type) {
    case "start":
      return "terminator";
    case "process":
      return "process";
    case "decision":
      return "decision";
    case "action":
      return "action-task";
    case "end":
      return "terminator";
    default:
      return "process";
  }
}

function inferKind(type: LegacyFlowGraph["nodes"][number]["type"]): string {
  switch (type) {
    case "start":
      return "start-event";
    case "process":
      return "process-step";
    case "decision":
      return "decision-gateway";
    case "action":
      return "automation-task";
    case "end":
      return "end-event";
    default:
      return "process-step";
  }
}

export function migrateLegacyFlowGraph(
  flowGraph: LegacyFlowGraph,
  options?: {
    id?: string;
    title?: string;
    authorId?: string;
  },
): DiagramDocument {
  return createDiagramDocument({
    id: options?.id,
    family: "flowchart",
    kit: "legacy-flowchart",
    metadata: {
      title: options?.title ?? "Imported FlowGraph",
      authorId: options?.authorId ?? flowGraph.meta.createdBy,
      source: "legacy-flowgraph",
      tags: [],
    },
    nodes: flowGraph.nodes.map((node) => ({
      id: node.id,
      family: "flowchart",
      kind: inferKind(node.type),
      shape: inferShape(node.type),
      position: node.position,
      size: { width: 180, height: node.type === "decision" ? 120 : 64 },
      ports: [],
      content: {
        title: node.data.label,
        labels: [],
      },
      style: {
        tokens: {},
      },
      resizePolicy: "content",
      metadata: node.data.meta,
      automation: node.data.action
        ? {
            actionType: "http",
            endpoint: node.data.action.webhook_url,
            method: node.data.action.method,
            headers: node.data.action.headers,
            payloadTemplate: node.data.action.payload_template,
            metadata: {},
          }
        : undefined,
      ai: node.data.confidence !== undefined
        ? {
            confidence: node.data.confidence,
            notes: [],
          }
        : undefined,
    })),
    edges: flowGraph.edges.map((edge) => ({
      id: edge.id,
      family: "flowchart",
      kind: edge.label ? "conditional-flow" : "flow",
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      routing: "orthogonal",
      waypoints: [],
      labels: edge.label
        ? [
            {
              text: edge.label,
              position: "center",
            },
          ]
        : [],
      startMarker: "none",
      endMarker: "arrow",
      style: {
        tokens: {},
      },
      metadata: {},
      ai: edge.confidence !== undefined
        ? {
            confidence: edge.confidence,
            notes: [],
          }
        : undefined,
    })),
  });
}
