// ─── Schema ────────────────────────────────────────────────────────
export {
  NodeTypeEnum,
  ActionConfigSchema,
  PositionSchema,
  NodeDataSchema,
  NodeSchema,
  EdgeSchema,
  FlowMetaSchema,
  FlowGraphSchema,
  PartialFlowGraphSchema,
} from "./schema.js";

export type {
  NodeType,
  ActionConfig,
  Position,
  NodeData,
  FlowNode,
  FlowEdge,
  FlowMeta,
  FlowGraph,
  PartialFlowGraph,
} from "./schema.js";

// ─── Validation ────────────────────────────────────────────────────
export {
  validateFlowGraph,
  isValidFlowGraph,
  validatePartial,
  createEmptyFlowGraph,
  createStarterFlowGraph,
} from "./validation.js";

export type { ValidationResult } from "./validation.js";

// ─── Transforms ────────────────────────────────────────────────────
export {
  toReactFlowFormat,
  fromReactFlowFormat,
  toMermaid,
  toJSON,
} from "./transforms.js";

export type { RFNode, RFEdge } from "./transforms.js";

// ─── Rules Engine ──────────────────────────────────────────────────
export {
  detectDeadEnds,
  detectLoops,
  validateDecisionNodes,
  validateStartNode,
  validateMaxDepth,
  runAllRules,
} from "./rules-engine.js";

export type { RuleViolation } from "./rules-engine.js";
