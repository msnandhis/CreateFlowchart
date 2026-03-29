import type { FlowGraph } from "@createflowchart/core";
import {
  createDiagramDocument,
  migrateLegacyFlowGraph,
  type DiagramDocument,
} from "@createflowchart/schema";

export function toDiagramDocument(input: {
  id?: string;
  title?: string;
  data: FlowGraph | DiagramDocument;
  authorId?: string;
}): DiagramDocument {
  if (isDiagramDocument(input.data)) {
    return input.data;
  }

  return migrateLegacyFlowGraph(input.data, {
    id: input.id,
    title: input.title,
    authorId: input.authorId,
  });
}

export function isDiagramDocument(value: unknown): value is DiagramDocument {
  return (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    (value as { version?: unknown }).version === 2 &&
    "family" in value &&
    "nodes" in value &&
    "edges" in value
  );
}

export function createBlankFlowchartDocument(title = "Untitled Diagram"): DiagramDocument {
  return createDiagramDocument({
    family: "flowchart",
    kit: "core-flowchart",
    metadata: {
      title,
      source: "native",
      tags: [],
    },
  });
}
