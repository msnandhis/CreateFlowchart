/**
 * DiagramModel v3 — Unified Schema
 *
 * This is THE canonical data model for the entire platform.
 * Every surface — editor, AI pipeline, API, npm library, DSL,
 * Mermaid import, collaboration, and persistence — reads and writes
 * this single schema.
 *
 * Design principles:
 *   1. One schema for everything (no dual-schema migration)
 *   2. Framework-agnostic (no React, DOM, or browser deps)
 *   3. Extensible via `data` bags (avoid schema changes for custom fields)
 *   4. Zod-validated at boundaries, plain TS types internally
 *   5. Port system for typed connections (GoJS-class)
 *   6. Group/container model for swimlanes, BPMN pools, etc.
 */

import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════
// Enumerations
// ═══════════════════════════════════════════════════════════════════

export const DiagramFamilyV3 = z.enum([
  "flowchart",
  "bpmn",
  "swimlane",
  "sequence",
  "state",
  "er",
  "class",
  "c4",
  "architecture",
  "dataflow",
  "mindmap",
  "orgchart",
  "timeline",
  "journey",
  "sankey",
  "network",
  "uml",
  "custom",
]);
export type DiagramFamily = z.infer<typeof DiagramFamilyV3>;

export const PortSide = z.enum(["top", "right", "bottom", "left"]);
export type PortSide = z.infer<typeof PortSide>;

export const EdgeRouting = z.enum([
  "straight",
  "orthogonal",
  "bezier",
  "step",
  "smooth",
]);
export type EdgeRouting = z.infer<typeof EdgeRouting>;

export const MarkerType = z.enum([
  "none",
  "arrow",
  "arrow-filled",
  "diamond",
  "diamond-filled",
  "circle",
  "circle-filled",
]);
export type MarkerType = z.infer<typeof MarkerType>;

export const ResizePolicy = z.enum(["fixed", "free", "aspect", "content"]);
export type ResizePolicy = z.infer<typeof ResizePolicy>;

export const LayoutAlgorithm = z.enum([
  "manual",
  "layered-digraph",
  "tree",
  "force-directed",
  "circular",
  "grid",
  "radial",
  "swimlane",
  "timeline",
]);
export type LayoutAlgorithm = z.infer<typeof LayoutAlgorithm>;

export const LayoutDirection = z.enum([
  "TB",
  "BT",
  "LR",
  "RL",
]);
export type LayoutDirection = z.infer<typeof LayoutDirection>;

export const GroupType = z.enum([
  "group",
  "frame",
  "section",
  "lane",
  "pool",
  "phase",
  "legend",
  "subprocess",
]);
export type GroupType = z.infer<typeof GroupType>;

// ═══════════════════════════════════════════════════════════════════
// Primitives
// ═══════════════════════════════════════════════════════════════════

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Point = z.infer<typeof PointSchema>;

export const SizeSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
});
export type Size = z.infer<typeof SizeSchema>;

// ═══════════════════════════════════════════════════════════════════
// Style
// ═══════════════════════════════════════════════════════════════════

export const StyleOverridesSchema = z.object({
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().nonnegative().optional(),
  strokeDash: z.string().optional(),
  radius: z.number().nonnegative().optional(),
  textColor: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().positive().optional(),
  fontWeight: z.union([z.string(), z.number()]).optional(),
  opacity: z.number().min(0).max(1).optional(),
  shadow: z.string().optional(),
}).default({});
export type StyleOverrides = z.infer<typeof StyleOverridesSchema>;

// ═══════════════════════════════════════════════════════════════════
// Port — Typed connection point on a node
// ═══════════════════════════════════════════════════════════════════

export const PortSchema = z.object({
  /** Unique within the parent node */
  id: z.string().min(1),
  /** Which side of the node this port sits on */
  side: PortSide,
  /** Position along the side (0 = start, 1 = end) */
  offset: z.number().min(0).max(1).default(0.5),
  /** Optional label shown near the port */
  label: z.string().optional(),
  /** Max number of connections allowed (undefined = unlimited) */
  maxConnections: z.number().int().positive().optional(),
  /** Port type for connection validation (e.g., "data-in", "flow-out") */
  type: z.string().optional(),
  /** Which port types this port can connect to */
  accepts: z.array(z.string()).default([]),
});
export type Port = z.infer<typeof PortSchema>;

// ═══════════════════════════════════════════════════════════════════
// Automation — Webhook/API trigger configuration
// ═══════════════════════════════════════════════════════════════════

export const AutomationConfigSchema = z.object({
  actionType: z.string().default("http"),
  endpoint: z.string().url().optional(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"),
  headers: z.record(z.string()).default({}),
  payloadTemplate: z.string().optional(),
  authRef: z.string().optional(),
});
export type AutomationConfig = z.infer<typeof AutomationConfigSchema>;

// ═══════════════════════════════════════════════════════════════════
// AI Provenance — Tracks AI-generated content
// ═══════════════════════════════════════════════════════════════════

export const AIProvenanceSchema = z.object({
  generatedBy: z.string().optional(),
  model: z.string().optional(),
  promptRef: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.array(z.string()).default([]),
});
export type AIProvenance = z.infer<typeof AIProvenanceSchema>;

// ═══════════════════════════════════════════════════════════════════
// DiagramNode — A single node in the diagram
// ═══════════════════════════════════════════════════════════════════

export const DiagramNodeV3Schema = z.object({
  id: z.string().min(1),

  // Visual identity
  shape: z.string().min(1),
  position: PointSchema,
  size: SizeSchema,

  // Content
  label: z.string().default(""),
  subtitle: z.string().optional(),
  body: z.string().optional(),
  icon: z.string().optional(),

  // Ports
  ports: z.array(PortSchema).default([]),

  // Style
  style: StyleOverridesSchema,

  // Grouping
  groupId: z.string().optional(),

  // Behavior
  isExpanded: z.boolean().default(true),
  isLocked: z.boolean().default(false),
  resizePolicy: ResizePolicy.default("content"),

  // AI
  ai: AIProvenanceSchema.optional(),

  // Automation
  automation: AutomationConfigSchema.optional(),

  // Extensible data bag — store any domain-specific data here
  data: z.record(z.unknown()).default({}),
});
export type DiagramNode = z.infer<typeof DiagramNodeV3Schema>;

// ═══════════════════════════════════════════════════════════════════
// DiagramEdge — A connection between two nodes
// ═══════════════════════════════════════════════════════════════════

export const DiagramEdgeV3Schema = z.object({
  id: z.string().min(1),

  // Connection
  source: z.string().min(1),
  sourcePort: z.string().optional(),
  target: z.string().min(1),
  targetPort: z.string().optional(),

  // Label
  label: z.string().optional(),
  labels: z.array(z.object({
    text: z.string(),
    position: z.number().min(0).max(1).default(0.5),
  })).default([]),

  // Routing
  routing: EdgeRouting.default("orthogonal"),
  waypoints: z.array(PointSchema).default([]),

  // Markers
  sourceMarker: MarkerType.default("none"),
  targetMarker: MarkerType.default("arrow"),

  // Style
  style: StyleOverridesSchema,

  // AI
  ai: AIProvenanceSchema.optional(),

  // Extensible
  data: z.record(z.unknown()).default({}),
});
export type DiagramEdge = z.infer<typeof DiagramEdgeV3Schema>;

// ═══════════════════════════════════════════════════════════════════
// DiagramGroup — Container for nodes (swimlanes, pools, etc.)
// ═══════════════════════════════════════════════════════════════════

export const DiagramGroupV3Schema = z.object({
  id: z.string().min(1),

  type: GroupType.default("group"),
  label: z.string().default(""),
  position: PointSchema,
  size: SizeSchema,

  // Nesting
  parentGroupId: z.string().optional(),

  // Style
  style: StyleOverridesSchema,

  // Behavior
  isExpanded: z.boolean().default(true),
  isLocked: z.boolean().default(false),

  // Extensible
  data: z.record(z.unknown()).default({}),
});
export type DiagramGroup = z.infer<typeof DiagramGroupV3Schema>;

// ═══════════════════════════════════════════════════════════════════
// DiagramAnnotation — Notes, comments, callouts
// ═══════════════════════════════════════════════════════════════════

export const DiagramAnnotationV3Schema = z.object({
  id: z.string().min(1),
  kind: z.enum(["note", "comment", "callout", "warning", "info"]),
  text: z.string().min(1),
  anchorNodeId: z.string().optional(),
  position: PointSchema.optional(),
  style: StyleOverridesSchema,
  data: z.record(z.unknown()).default({}),
});
export type DiagramAnnotation = z.infer<typeof DiagramAnnotationV3Schema>;

// ═══════════════════════════════════════════════════════════════════
// DiagramModel — THE root document
// ═══════════════════════════════════════════════════════════════════

export const DiagramModelSchema = z.object({
  id: z.string().min(1),
  version: z.literal(3),

  // Metadata
  meta: z.object({
    title: z.string().default("Untitled Diagram"),
    description: z.string().optional(),
    family: DiagramFamilyV3.default("flowchart"),
    kit: z.string().default("core-flowchart"),
    tags: z.array(z.string()).default([]),
    source: z.enum(["manual", "ai", "import", "template", "api"]).default("manual"),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    authorId: z.string().optional(),
  }),

  // Layout
  layout: z.object({
    algorithm: LayoutAlgorithm.default("manual"),
    direction: LayoutDirection.default("TB"),
    nodeSpacing: z.number().positive().default(60),
    layerSpacing: z.number().positive().default(80),
  }).default({}),

  // Theme
  theme: z.object({
    id: z.string().default("default-dark"),
    tokens: z.record(z.string()).default({}),
  }).default({}),

  // Graph
  nodes: z.array(DiagramNodeV3Schema),
  edges: z.array(DiagramEdgeV3Schema),
  groups: z.array(DiagramGroupV3Schema).default([]),
  annotations: z.array(DiagramAnnotationV3Schema).default([]),

  // Extensible
  data: z.record(z.unknown()).default({}),
});
export type DiagramModel = z.infer<typeof DiagramModelSchema>;

// ═══════════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════════

let _idCounter = 0;

export function generateId(prefix = "cf"): string {
  return `${prefix}_${Date.now().toString(36)}_${(++_idCounter).toString(36)}`;
}

export function createDiagramModel(
  overrides?: Partial<DiagramModel>,
): DiagramModel {
  return DiagramModelSchema.parse({
    id: overrides?.id ?? generateId("diagram"),
    version: 3,
    meta: {
      title: "Untitled Diagram",
      family: "flowchart",
      kit: "core-flowchart",
      source: "manual",
      tags: [],
      ...overrides?.meta,
    },
    layout: {
      algorithm: "manual",
      direction: "TB",
      nodeSpacing: 60,
      layerSpacing: 80,
      ...overrides?.layout,
    },
    theme: {
      id: "default-dark",
      tokens: {},
      ...overrides?.theme,
    },
    nodes: overrides?.nodes ?? [],
    edges: overrides?.edges ?? [],
    groups: overrides?.groups ?? [],
    annotations: overrides?.annotations ?? [],
    data: overrides?.data ?? {},
  });
}

export function createNode(
  overrides: Partial<DiagramNode> & { shape: string },
): DiagramNode {
  const { shape, ...rest } = overrides;
  return DiagramNodeV3Schema.parse({
    id: generateId("node"),
    position: { x: 0, y: 0 },
    size: { width: 180, height: 64 },
    label: "",
    ports: [],
    style: {},
    resizePolicy: "content",
    data: {},
    ...rest,
    shape,
  });
}

export function createEdge(
  overrides: Partial<DiagramEdge> & { source: string; target: string },
): DiagramEdge {
  const { source, target, ...rest } = overrides;
  return DiagramEdgeV3Schema.parse({
    id: generateId("edge"),
    routing: "orthogonal",
    sourceMarker: "none",
    targetMarker: "arrow",
    style: {},
    data: {},
    ...rest,
    source,
    target,
  });
}

export function createGroup(
  overrides?: Partial<DiagramGroup>,
): DiagramGroup {
  return DiagramGroupV3Schema.parse({
    id: generateId("group"),
    type: "group",
    label: "Group",
    position: { x: 0, y: 0 },
    size: { width: 400, height: 300 },
    style: {},
    data: {},
    ...overrides,
  });
}
