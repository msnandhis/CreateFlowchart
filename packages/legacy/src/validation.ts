import { ZodError } from "zod";
import {
  FlowGraphSchema,
  PartialFlowGraphSchema,
  type FlowGraph,
} from "./schema";

// ─── Result type for validation ────────────────────────────────────
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: ZodError };

// ─── Full validation ───────────────────────────────────────────────
export function validateFlowGraph(data: unknown): ValidationResult<FlowGraph> {
  const result = FlowGraphSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// ─── Type guard ────────────────────────────────────────────────────
export function isValidFlowGraph(data: unknown): data is FlowGraph {
  return FlowGraphSchema.safeParse(data).success;
}

// ─── Partial validation (for incremental updates) ──────────────────
export function validatePartial(data: unknown): ValidationResult<Partial<FlowGraph>> {
  const result = PartialFlowGraphSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// ─── Create empty FlowGraph ────────────────────────────────────────
export function createEmptyFlowGraph(createdBy?: string, isSandbox = false): FlowGraph {
  return {
    nodes: [],
    edges: [],
    meta: {
      version: 1,
      createdBy,
      isSandbox,
    },
  };
}

// ─── Create a default starter FlowGraph (start → process → end) ───
export function createStarterFlowGraph(createdBy?: string, isSandbox = false): FlowGraph {
  return {
    nodes: [
      {
        id: "node_start",
        type: "start",
        position: { x: 250, y: 0 },
        data: { label: "Start", confidence: 1.0, meta: {} },
      },
      {
        id: "node_process",
        type: "process",
        position: { x: 250, y: 150 },
        data: { label: "Process", confidence: 1.0, meta: {} },
      },
      {
        id: "node_end",
        type: "end",
        position: { x: 250, y: 300 },
        data: { label: "End", confidence: 1.0, meta: {} },
      },
    ],
    edges: [
      { id: "edge_1", source: "node_start", target: "node_process" },
      { id: "edge_2", source: "node_process", target: "node_end" },
    ],
    meta: {
      version: 1,
      createdBy,
      isSandbox,
    },
  };
}
