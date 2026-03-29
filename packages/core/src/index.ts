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
} from "./schema";

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
} from "./schema";

// ─── Validation ────────────────────────────────────────────────────
export {
  validateFlowGraph,
  isValidFlowGraph,
  validatePartial,
  createEmptyFlowGraph,
  createStarterFlowGraph,
} from "./validation";

export type { ValidationResult } from "./validation";

// ─── Transforms ────────────────────────────────────────────────────
export {
  toReactFlowFormat,
  fromReactFlowFormat,
  toMermaid,
  toJSON,
} from "./transforms";

export type { RFNode, RFEdge } from "./transforms";

// ─── Rules Engine ──────────────────────────────────────────────────
export {
  detectDeadEnds,
  detectLoops,
  validateDecisionNodes,
  validateStartNode,
  validateMaxDepth,
  runAllRules,
} from "./rules-engine";

export type { RuleViolation } from "./rules-engine.js";
