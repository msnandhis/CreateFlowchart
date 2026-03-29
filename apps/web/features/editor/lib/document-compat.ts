import type { FlowGraph } from "@createflowchart/core";
import {
  createDiagramDocument,
  migrateLegacyFlowGraph,
  type DiagramDocument,
} from "@createflowchart/schema";
import type { Node, Edge } from "@xyflow/react";
import { fromReactFlowFormat, toReactFlowFormat } from "@createflowchart/core";

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

export function documentToFlowGraph(document: DiagramDocument): FlowGraph {
  const nodes: FlowGraph["nodes"] = document.nodes.map((node) => {
    const kind = node.kind;
    let type: FlowGraph["nodes"][number]["type"] = "process";

    if (kind === "start-event") type = "start";
    else if (kind === "end-event") type = "end";
    else if (kind === "decision-gateway") type = "decision";
    else if (kind === "automation-task") type = "action";

    const legacyMethod =
      node.automation?.method && node.automation.method !== "PATCH"
        ? node.automation.method
        : "POST";

    return {
      id: node.id,
      type,
      position: node.position,
      data: {
        label: node.content.title,
        confidence: node.ai?.confidence ?? 1,
        meta: node.metadata,
        action: node.automation?.endpoint
          ? {
              webhook_url: node.automation.endpoint,
              method: legacyMethod,
              headers: node.automation.headers,
              payload_template: node.automation.payloadTemplate,
            }
          : undefined,
      },
    };
  });

  const edges: FlowGraph["edges"] = document.edges.map((edge) => ({
    id: edge.id,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    label: edge.labels[0]?.text,
    confidence: edge.ai?.confidence,
  }));

  return {
    nodes,
    edges,
    meta: {
      version: 1,
      createdBy: document.metadata.authorId,
      isSandbox: false,
    },
  };
}

export function documentToReactFlow(document: DiagramDocument) {
  return toReactFlowFormat(documentToFlowGraph(document));
}

export function reactFlowToDocument(
  nodes: Node[],
  edges: Edge[],
  baseDocument?: DiagramDocument,
): DiagramDocument {
  const flowGraph = fromReactFlowFormat(nodes as any, edges as any, {
    version: 1,
    createdBy: baseDocument?.metadata.authorId,
    isSandbox: false,
  });

  return toDiagramDocument({
    id: baseDocument?.id,
    title: baseDocument?.metadata.title,
    authorId: baseDocument?.metadata.authorId,
    data: flowGraph,
  });
}
