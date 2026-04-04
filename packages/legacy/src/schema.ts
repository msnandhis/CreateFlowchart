import { z } from "zod";

// ─── Node Types ────────────────────────────────────────────────────
export const NodeTypeEnum = z.enum([
  "start",
  "process",
  "decision",
  "action",
  "end",
]);
export type NodeType = z.infer<typeof NodeTypeEnum>;

// ─── Action Config (for Action Nodes — webhook/API triggers) ──────
export const ActionConfigSchema = z.object({
  webhook_url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"),
  headers: z.record(z.string()).default({}),
  payload_template: z.string().optional(),
});
export type ActionConfig = z.infer<typeof ActionConfigSchema>;

// ─── Position ──────────────────────────────────────────────────────
export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Position = z.infer<typeof PositionSchema>;

// ─── Node Data ─────────────────────────────────────────────────────
export const NodeDataSchema = z.object({
  label: z.string().min(1).max(200),
  confidence: z.number().min(0).max(1).default(1.0),
  meta: z.record(z.unknown()).default({}),
  action: ActionConfigSchema.optional(),
});
export type NodeData = z.infer<typeof NodeDataSchema>;

// ─── Node ──────────────────────────────────────────────────────────
export const NodeSchema = z.object({
  id: z.string().min(1),
  type: NodeTypeEnum,
  position: PositionSchema,
  data: NodeDataSchema,
});
export type FlowNode = z.infer<typeof NodeSchema>;

// ─── Edge ──────────────────────────────────────────────────────────
export const EdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().max(100).optional(),
  confidence: z.number().min(0).max(1).optional(),
});
export type FlowEdge = z.infer<typeof EdgeSchema>;

// ─── Flow Metadata ────────────────────────────────────────────────
export const FlowMetaSchema = z.object({
  version: z.number().int().positive().default(1),
  createdBy: z.string().optional(),
  isSandbox: z.boolean().default(false),
});
export type FlowMeta = z.infer<typeof FlowMetaSchema>;

// ─── FlowGraph (THE source of truth) ──────────────────────────────
export const FlowGraphSchema = z.object({
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
  meta: FlowMetaSchema,
});
export type FlowGraph = z.infer<typeof FlowGraphSchema>;

// ─── Partial schema for incremental updates ───────────────────────
export const PartialFlowGraphSchema = FlowGraphSchema.partial();
export type PartialFlowGraph = z.infer<typeof PartialFlowGraphSchema>;
