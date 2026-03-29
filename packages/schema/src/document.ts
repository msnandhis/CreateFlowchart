import { z } from "zod";

export const DiagramFamilyEnum = z.enum([
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
  "custom",
]);
export type DiagramFamily = z.infer<typeof DiagramFamilyEnum>;

export const PortSideEnum = z.enum(["top", "right", "bottom", "left", "free"]);
export type PortSide = z.infer<typeof PortSideEnum>;

export const EdgeRoutingEnum = z.enum([
  "straight",
  "orthogonal",
  "smooth",
  "bezier",
  "manual",
]);
export type EdgeRouting = z.infer<typeof EdgeRoutingEnum>;

export const MarkerEnum = z.enum([
  "none",
  "arrow",
  "diamond",
  "circle",
  "triangle",
]);
export type Marker = z.infer<typeof MarkerEnum>;

export const ResizePolicyEnum = z.enum(["fixed", "free", "aspect", "content"]);
export type ResizePolicy = z.infer<typeof ResizePolicyEnum>;

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

export const ThemeTokenOverridesSchema = z.record(z.string()).default({});
export type ThemeTokenOverrides = z.infer<typeof ThemeTokenOverridesSchema>;

export const StyleSchema = z.object({
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().nonnegative().optional(),
  radius: z.number().nonnegative().optional(),
  textColor: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().positive().optional(),
  icon: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
  tokens: ThemeTokenOverridesSchema,
});
export type Style = z.infer<typeof StyleSchema>;

export const LabelSchema = z.object({
  text: z.string().min(1),
  position: z.enum(["center", "top", "right", "bottom", "left", "free"]).default("center"),
  point: PointSchema.optional(),
});
export type Label = z.infer<typeof LabelSchema>;

export const PortSchema = z.object({
  id: z.string().min(1),
  side: PortSideEnum.default("free"),
  offset: PointSchema.optional(),
  maxConnections: z.number().int().positive().optional(),
  accepts: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
});
export type Port = z.infer<typeof PortSchema>;

export const NodeContentSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  body: z.string().optional(),
  labels: z.array(LabelSchema).default([]),
});
export type NodeContent = z.infer<typeof NodeContentSchema>;

export const AutomationSchema = z.object({
  actionType: z.string().optional(),
  endpoint: z.string().url().optional(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  headers: z.record(z.string()).default({}),
  payloadTemplate: z.string().optional(),
  authRef: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
});
export type Automation = z.infer<typeof AutomationSchema>;

export const AIProvenanceSchema = z.object({
  generatedBy: z.string().optional(),
  promptRef: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.array(z.string()).default([]),
});
export type AIProvenance = z.infer<typeof AIProvenanceSchema>;

export const DiagramNodeSchema = z.object({
  id: z.string().min(1),
  family: DiagramFamilyEnum,
  kind: z.string().min(1),
  shape: z.string().min(1),
  position: PointSchema,
  size: SizeSchema,
  ports: z.array(PortSchema).default([]),
  content: NodeContentSchema,
  style: StyleSchema.default({ tokens: {} }),
  resizePolicy: ResizePolicyEnum.default("content"),
  metadata: z.record(z.unknown()).default({}),
  automation: AutomationSchema.optional(),
  ai: AIProvenanceSchema.optional(),
});
export type DiagramNode = z.infer<typeof DiagramNodeSchema>;

export const DiagramEdgeSchema = z.object({
  id: z.string().min(1),
  family: DiagramFamilyEnum,
  kind: z.string().min(1),
  sourceNodeId: z.string().min(1),
  sourcePortId: z.string().optional(),
  targetNodeId: z.string().min(1),
  targetPortId: z.string().optional(),
  routing: EdgeRoutingEnum.default("orthogonal"),
  waypoints: z.array(PointSchema).default([]),
  labels: z.array(LabelSchema).default([]),
  startMarker: MarkerEnum.default("none"),
  endMarker: MarkerEnum.default("arrow"),
  style: StyleSchema.default({ tokens: {} }),
  metadata: z.record(z.unknown()).default({}),
  ai: AIProvenanceSchema.optional(),
});
export type DiagramEdge = z.infer<typeof DiagramEdgeSchema>;

export const ContainerTypeEnum = z.enum([
  "group",
  "frame",
  "section",
  "lane",
  "pool",
  "phase",
  "legend",
]);
export type ContainerType = z.infer<typeof ContainerTypeEnum>;

export const DiagramContainerSchema = z.object({
  id: z.string().min(1),
  family: DiagramFamilyEnum,
  type: ContainerTypeEnum,
  label: z.string().min(1),
  position: PointSchema,
  size: SizeSchema,
  childNodeIds: z.array(z.string()).default([]),
  childContainerIds: z.array(z.string()).default([]),
  style: StyleSchema.default({ tokens: {} }),
  metadata: z.record(z.unknown()).default({}),
});
export type DiagramContainer = z.infer<typeof DiagramContainerSchema>;

export const DiagramAnnotationSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["note", "comment", "callout", "warning", "info"]),
  text: z.string().min(1),
  anchorNodeId: z.string().optional(),
  position: PointSchema.optional(),
  metadata: z.record(z.unknown()).default({}),
});
export type DiagramAnnotation = z.infer<typeof DiagramAnnotationSchema>;

export const LayoutHintsSchema = z.object({
  algorithm: z.string().default("manual"),
  direction: z.enum(["TB", "BT", "LR", "RL", "RADIAL", "FREE"]).default("FREE"),
  preserveManualPositions: z.boolean().default(true),
  metadata: z.record(z.unknown()).default({}),
});
export type LayoutHints = z.infer<typeof LayoutHintsSchema>;

export const DiagramMetadataSchema = z.object({
  title: z.string().min(1).default("Untitled Diagram"),
  description: z.string().optional(),
  authorId: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  tags: z.array(z.string()).default([]),
  source: z.enum(["native", "legacy-flowgraph", "mermaid", "image", "api"]).default("native"),
});
export type DiagramMetadata = z.infer<typeof DiagramMetadataSchema>;

export const DiagramDocumentSchema = z.object({
  id: z.string().min(1),
  version: z.literal(2),
  family: DiagramFamilyEnum,
  kit: z.string().min(1),
  metadata: DiagramMetadataSchema,
  layout: LayoutHintsSchema,
  theme: z.object({
    id: z.string().min(1).default("createflow-default"),
    tokens: ThemeTokenOverridesSchema,
  }),
  nodes: z.array(DiagramNodeSchema),
  edges: z.array(DiagramEdgeSchema),
  containers: z.array(DiagramContainerSchema).default([]),
  annotations: z.array(DiagramAnnotationSchema).default([]),
});
export type DiagramDocument = z.infer<typeof DiagramDocumentSchema>;

export function createDiagramDocument(input?: Partial<DiagramDocument>): DiagramDocument {
  return DiagramDocumentSchema.parse({
    id: input?.id ?? `diagram_${Date.now()}`,
    version: 2,
    family: input?.family ?? "flowchart",
    kit: input?.kit ?? "core-flowchart",
    metadata: {
      title: input?.metadata?.title ?? "Untitled Diagram",
      description: input?.metadata?.description,
      authorId: input?.metadata?.authorId,
      createdAt: input?.metadata?.createdAt,
      updatedAt: input?.metadata?.updatedAt,
      tags: input?.metadata?.tags ?? [],
      source: input?.metadata?.source ?? "native",
    },
    layout: {
      algorithm: input?.layout?.algorithm ?? "manual",
      direction: input?.layout?.direction ?? "FREE",
      preserveManualPositions: input?.layout?.preserveManualPositions ?? true,
      metadata: input?.layout?.metadata ?? {},
    },
    theme: {
      id: input?.theme?.id ?? "createflow-default",
      tokens: input?.theme?.tokens ?? {},
    },
    nodes: input?.nodes ?? [],
    edges: input?.edges ?? [],
    containers: input?.containers ?? [],
    annotations: input?.annotations ?? [],
  });
}
