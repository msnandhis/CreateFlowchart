import {
  createDiagramModel,
  migrateLegacyFlowGraph,
  type DiagramModel,
  type DiagramFamily,
} from "@createflowchart/schema";
import type { FlowGraph } from "@createflowchart/legacy";

/**
 * Ensures the input data is a valid DiagramModel (v3).
 * If it's a legacy FlowGraph (v1), it migrates it.
 */
export function toDiagramDocument(input: {
  id?: string;
  title?: string;
  data: FlowGraph | DiagramModel;
  authorId?: string;
}): DiagramModel {
  if (isDiagramModel(input.data)) {
    return input.data;
  }

  // Migrate legacy FlowGraph (v1) to DiagramModel (v3)
  return migrateLegacyFlowGraph(input.data as FlowGraph, {
    id: input.id,
    title: input.title,
    authorId: input.authorId,
  });
}

/**
 * Type guard for DiagramModel (v3)
 */
export function isDiagramModel(value: unknown): value is DiagramModel {
  return (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    (value as { version?: unknown }).version === 3 &&
    "meta" in value &&
    "nodes" in value &&
    "edges" in value
  );
}

/**
 * Creates a new blank diagram using the v3 factory.
 */
export function createBlankFlowchartDocument(title = "Untitled Diagram"): DiagramModel {
  return createDiagramModel({
    meta: {
      title,
      family: "flowchart",
      kit: "core-flowchart",
      source: "manual",
    },
  });
}

/**
 * Helper to get a family type safely
 */
export function asDiagramFamily(value: string | undefined): DiagramFamily {
  const families: DiagramFamily[] = [
    "flowchart", "bpmn", "swimlane", "sequence", "state", "er", "class", 
    "c4", "architecture", "dataflow", "mindmap", "orgchart", "timeline", 
    "journey", "sankey", "custom"
  ];
  return (value && families.includes(value as DiagramFamily))
    ? (value as DiagramFamily)
    : "flowchart";
}
