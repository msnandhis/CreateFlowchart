import type { DiagramDocument } from "@createflowchart/schema";

export interface AIArtifactProvenance {
  provider: string;
  model: string;
  confidence: number;
  prompt: string;
  mode: "generate" | "image-convert" | "improve" | "analyze" | "explain";
  createdAt: string;
}

export interface AIChangePatch {
  summary: string;
  nodeAdds: string[];
  nodeRemovals: string[];
  nodeUpdates: string[];
  edgeAdds: string[];
  edgeRemovals: string[];
  edgeUpdates: string[];
  containerAdds: string[];
  containerRemovals: string[];
  containerUpdates: string[];
}

export interface AIDocumentGenerateResult {
  document: DiagramDocument;
  dsl: string;
  provenance: AIArtifactProvenance;
  nodeConfidences: Record<string, number>;
  edgeConfidences: Record<string, number>;
  repairAttempts: number;
  mode: "prompt" | "image";
}

export interface AIDocumentImproveResult {
  originalDocument: DiagramDocument;
  document: DiagramDocument;
  originalDsl: string;
  dsl: string;
  provenance: AIArtifactProvenance;
  patch: AIChangePatch;
  confidence: number;
}

export interface AIDocumentAnalyzeResult {
  overallHealth: number;
  suggestions: string[];
  provenance: AIArtifactProvenance;
  issues: Array<{
    type: string;
    nodeId?: string;
    message: string;
    severity: "error" | "warning" | "info";
  }>;
}

export interface AIDocumentExplainResult {
  markdown: string;
  dsl: string;
  provenance: AIArtifactProvenance;
  nodeWalkthrough: Array<{
    nodeId: string;
    label: string;
    explanation: string;
  }>;
}
