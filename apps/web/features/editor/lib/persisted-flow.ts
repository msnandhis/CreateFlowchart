import type { FlowGraph } from "@createflowchart/legacy";
import type { DiagramDocument } from "@createflowchart/schema";
import { documentToFlowGraph, isDiagramDocument, toDiagramDocument } from "./document-compat";

export interface PersistedFlowEnvelope {
  formatVersion: "flowgraph-v1" | "document-v2" | "flowgraph-v1+document-v2";
  legacy: FlowGraph;
  document: DiagramDocument;
}

export function createPersistedFlowEnvelope(input: {
  data?: unknown;
  document?: unknown;
  id?: string;
  title?: string;
  authorId?: string;
}): PersistedFlowEnvelope {
  const document = isDiagramDocument(input.document)
    ? input.document
    : toDiagramDocument({
        id: input.id,
        title: input.title,
        authorId: input.authorId,
        data: input.data as FlowGraph,
      });

  return {
    formatVersion: "flowgraph-v1+document-v2",
    legacy: input.data
      ? (input.data as FlowGraph)
      : documentToFlowGraph(document),
    document,
  };
}

export function isPersistedFlowEnvelope(value: unknown): value is PersistedFlowEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "formatVersion" in value &&
    "legacy" in value &&
    "document" in value
  );
}

export function normalizePersistedFlow(input: {
  data: unknown;
  document?: unknown;
  id?: string;
  title?: string;
  authorId?: string;
}): PersistedFlowEnvelope {
  if (isPersistedFlowEnvelope(input.data)) {
    return input.data;
  }

  return createPersistedFlowEnvelope({
    data: input.data,
    document: input.document,
    id: input.id,
    title: input.title,
    authorId: input.authorId,
  });
}
