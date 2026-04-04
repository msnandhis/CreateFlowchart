// ═══════════════════════════════════════════════════════════════════
// v3 API — Unified DiagramModel + Engine
// This is the primary API surface going forward.
// ═══════════════════════════════════════════════════════════════════

export {
  // Enumerations
  DiagramFamilyV3,
  PortSide,
  EdgeRouting,
  MarkerType,
  ResizePolicy,
  LayoutAlgorithm,
  LayoutDirection,
  GroupType,

  // Schemas
  PointSchema,
  SizeSchema,
  StyleOverridesSchema,
  PortSchema,
  AutomationConfigSchema,
  AIProvenanceSchema,
  DiagramNodeV3Schema,
  DiagramEdgeV3Schema,
  DiagramGroupV3Schema,
  DiagramAnnotationV3Schema,
  DiagramModelSchema,

  // Factories
  generateId,
  createDiagramModel,
  createNode,
  createEdge,
  createGroup,

  // Types
  type DiagramFamily,
  type Point,
  type Size,
  type StyleOverrides,
  type Port,
  type AutomationConfig,
  type AIProvenance,
  type DiagramNode,
  type DiagramEdge,
  type DiagramGroup,
  type DiagramAnnotation,
  type DiagramModel,
} from "./model";

export {
  DiagramEngine,
  createEngine,
  defaultValidator,
  type EngineEventType,
  type EngineEvent,
  type ValidationIssue,
  type Validator,
  type DiagramEngineOptions,
} from "./engine";

export {
  ShapeLabelZoneSchema,
  ShapePortAnchorSchema,
  ShapeDefinitionSchema,
  EdgeDefinitionSchema,
  ContainerDefinitionSchema,
  DiagramKitSchema,
  createEmptyRegistry,
  type ShapeLabelZone,
  type ShapePortAnchor,
  type ShapeDefinition,
  type EdgeDefinition,
  type ContainerDefinition,
  type DiagramKit,
  type PlatformRegistry,
} from "./registry";

export { migrateLegacyFlowGraph } from "./migrate";
export { flowchartShapes, flowchartKit } from "./presets/flowchart";
export { bpmnLiteShapes, bpmnLiteKit } from "./presets/bpmn";
export { containerPresets } from "./presets/containers";
export { flowchartEdges, bpmnEdges, edgeKits } from "./presets/edges";

// ═══════════════════════════════════════════════════════════════════
// v2 API — Legacy (backward-compatible)
// These exports support existing document.ts and registry.ts consumers.
// Will be deprecated once all consumers migrate to v3.
// ═══════════════════════════════════════════════════════════════════

export {
  DiagramFamilyEnum,
  PortSideEnum,
  EdgeRoutingEnum,
  MarkerEnum,
  ResizePolicyEnum,
  PointSchema as PointSchemaV2,
  SizeSchema as SizeSchemaV2,
  StyleSchema,
  LabelSchema,
  PortSchema as PortSchemaV2,
  NodeContentSchema,
  AutomationSchema,
  AIProvenanceSchema as AIProvenanceSchemaV2,
  DiagramNodeSchema,
  DiagramEdgeSchema,
  ContainerTypeEnum,
  DiagramContainerSchema,
  DiagramAnnotationSchema,
  LayoutHintsSchema,
  DiagramMetadataSchema,
  DiagramDocumentSchema,
  createDiagramDocument,
  type PortSide as PortSideV2,
  type EdgeRouting as EdgeRoutingV2,
  type Marker,
  type ResizePolicy as ResizePolicyV2,
  type Style,
  type Label,
  type Port as PortV2,
  type NodeContent,
  type Automation,
  type AIProvenance as AIProvenanceV2,
  type DiagramNode as DiagramNodeV2,
  type DiagramEdge as DiagramEdgeV2,
  type ContainerType,
  type DiagramContainer,
  type DiagramAnnotation as DiagramAnnotationV2,
  type LayoutHints,
  type DiagramMetadata,
  type DiagramDocument,
} from "./document";

