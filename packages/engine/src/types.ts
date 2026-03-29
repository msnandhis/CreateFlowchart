import type {
  DiagramAnnotation,
  DiagramContainer,
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
} from "@createflowchart/schema";

export interface EngineSelection {
  nodeIds: string[];
  edgeIds: string[];
  containerIds: string[];
  annotationIds: string[];
}

export interface EngineSnapshot {
  document: DiagramDocument;
  selection: EngineSelection;
}

export interface EngineHistory {
  past: EngineSnapshot[];
  future: EngineSnapshot[];
  limit: number;
}

export interface EngineState extends EngineSnapshot {
  history: EngineHistory;
}

export type EngineEntity =
  | DiagramNode
  | DiagramEdge
  | DiagramContainer
  | DiagramAnnotation;

export interface EngineValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning" | "info";
  entityId?: string;
}

export type EngineValidator = (document: DiagramDocument) => EngineValidationIssue[];

export interface EngineResult {
  state: EngineState;
  issues: EngineValidationIssue[];
  changed: boolean;
}
