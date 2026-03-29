import { FlowGraphSchema } from "@createflowchart/core";
import type { FlowGraph } from "@createflowchart/core";

export interface GenerateResult {
  flow: FlowGraph;
  provider: string;
  model: string;
  confidence: number;
  nodeConfidences: Record<string, number>;
  edgeConfidences: Record<string, number>;
  repairAttempts: number;
}

export interface AnalyzeResult {
  issues: {
    type: "dead_end" | "loop" | "decision" | "depth" | "other";
    nodeId?: string;
    message: string;
    severity: "error" | "warning" | "info";
  }[];
  overallHealth: number;
  suggestions: string[];
}

export interface ImproveResult {
  original: FlowGraph;
  improved: FlowGraph;
  changes: {
    type: "add" | "remove" | "modify";
    description: string;
    nodeId?: string;
  }[];
  confidence: number;
}

export interface ExplainResult {
  markdown: string;
  nodeWalkthrough: {
    nodeId: string;
    label: string;
    explanation: string;
  }[];
}

export interface AIJobResult {
  success: boolean;
  data?: GenerateResult | AnalyzeResult | ImproveResult | ExplainResult;
  error?: string;
  jobId: string;
  action: "generate" | "analyze" | "improve" | "explain";
  startedAt: string;
  completedAt: string;
  duration: number;
}

export function sanitizePrompt(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .slice(0, 2000)
    .trim();
}

export function validateFlowGraphResponse(data: unknown): FlowGraph | null {
  const result = FlowGraphSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  return null;
}

export function attemptAutoRepair(data: unknown): FlowGraph | null {
  if (typeof data !== "object" || data === null) return null;

  const obj = data as Record<string, unknown>;

  if (typeof obj.nodes !== "object" || !Array.isArray(obj.nodes)) {
    obj.nodes = [];
  }

  if (typeof obj.edges !== "object" || !Array.isArray(obj.edges)) {
    obj.edges = [];
  }

  if (typeof obj.meta !== "object" || obj.meta === null) {
    obj.meta = { version: 1, isSandbox: false };
  }

  const meta = obj.meta as Record<string, unknown>;
  if (typeof meta.version === "undefined") meta.version = 1;
  if (typeof meta.isSandbox === "undefined") meta.isSandbox = false;

  const validNodes = (obj.nodes as unknown[])
    .filter((n) => {
      if (typeof n !== "object" || n === null) return false;
      const node = n as Record<string, unknown>;
      return (
        typeof node.id === "string" &&
        typeof node.type === "string" &&
        typeof node.position === "object"
      );
    })
    .map((n, i) => {
      const node = n as Record<string, unknown>;
      const pos = node.position as Record<string, unknown>;
      return {
        id: String(node.id || `node_${i}`),
        type: node.type || "process",
        position: {
          x: typeof pos?.x === "number" ? pos.x : 0,
          y: typeof pos?.y === "number" ? pos.y : 0,
        },
        data: {
          label: String(node.data?.label || node.label || "Untitled"),
          confidence: 0.5,
          meta: {},
        },
      };
    });

  const validEdges = (obj.edges as unknown[])
    .filter((e) => {
      if (typeof e !== "object" || e === null) return false;
      const edge = e as Record<string, unknown>;
      return typeof edge.source === "string" && typeof edge.target === "string";
    })
    .map((e, i) => {
      const edge = e as Record<string, unknown>;
      return {
        id: String(edge.id || `edge_${i}`),
        source: String(edge.source),
        target: String(edge.target),
        label: edge.label ? String(edge.label) : undefined,
        confidence: edge.confidence ? Number(edge.confidence) : undefined,
      };
    });

  const repaired = {
    nodes: validNodes,
    edges: validEdges,
    meta: obj.meta,
  };

  return validateFlowGraphResponse(repaired);
}
