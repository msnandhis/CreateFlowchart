import type { FlowGraph } from "@createflowchart/core";
import {
  createDiagramDocument,
  migrateLegacyFlowGraph,
  type DiagramFamily,
  type DiagramNode,
  type DiagramDocument,
  type EdgeRouting,
} from "@createflowchart/schema";
import type { Node, Edge } from "@xyflow/react";
import { getShapeDefinition } from "./flowchart-shapes";

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
    const type = mapDocumentNodeToLegacyType(node);

    const legacyMethod: "GET" | "POST" | "PUT" | "DELETE" =
      node.automation?.method === "GET" ||
      node.automation?.method === "PUT" ||
      node.automation?.method === "DELETE"
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

function mapDocumentNodeToLegacyType(
  node: DiagramDocument["nodes"][number],
): FlowGraph["nodes"][number]["type"] {
  if (
    node.kind === "start-event" ||
    node.shape === "terminator-start" ||
    node.shape === "bpmn-start-event"
  ) {
    return "start";
  }

  if (
    node.kind === "end-event" ||
    node.shape === "terminator-end" ||
    node.shape === "bpmn-end-event"
  ) {
    return "end";
  }

  if (
    node.kind === "decision-gateway" ||
    node.kind === "exclusive-gateway" ||
    node.kind === "parallel-gateway" ||
    node.shape === "decision" ||
    node.shape === "bpmn-exclusive-gateway" ||
    node.shape === "bpmn-parallel-gateway"
  ) {
    return "decision";
  }

  if (
    node.kind === "automation-task" ||
    node.kind === "service-task" ||
    node.shape === "action-task" ||
    node.shape === "bpmn-service-task"
  ) {
    return "action";
  }

  return "process";
}

export function documentToReactFlow(document: DiagramDocument) {
  return {
    nodes: document.nodes.map((node) => ({
      id: node.id,
      type: "diagramNode",
      position: node.position,
      data: {
        label: node.content.title,
        confidence: node.ai?.confidence,
        family: node.family,
        kind: node.kind,
        shapeId: node.shape,
        size: node.size,
        automation: node.automation,
        meta: {
          ...node.metadata,
          family: node.family,
          semanticKind: node.kind,
          shapeId: node.shape,
        },
      },
      style: {
        width: node.size.width,
        height: node.size.height,
      },
    })),
    edges: document.edges.map((edge) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      sourceHandle: edge.sourcePortId,
      targetHandle: edge.targetPortId,
      label: edge.labels[0]?.text,
      animated: false,
      data: {
        confidence: edge.ai?.confidence,
        family: edge.family,
        kind: edge.kind,
        routing: edge.routing,
      },
      ...(edge.ai?.confidence !== undefined && edge.ai.confidence < 0.7
        ? {
            style: {
              stroke: "var(--color-node-low-confidence, #FFD60A)",
              strokeWidth: 2,
            },
          }
        : {}),
    })),
  };
}

export function reactFlowToDocument(
  nodes: Node[],
  edges: Edge[],
  baseDocument?: DiagramDocument,
): DiagramDocument {
  const baseNodeMap = new Map(
    (baseDocument?.nodes ?? []).map((node) => [node.id, node]),
  );

  return createDiagramDocument({
    id: baseDocument?.id,
    family: baseDocument?.family ?? "flowchart",
    kit: baseDocument?.kit ?? "core-flowchart",
    metadata: {
      title: baseDocument?.metadata.title ?? "Untitled Diagram",
      authorId: baseDocument?.metadata.authorId,
      source: baseDocument?.metadata.source ?? "native",
      tags: baseDocument?.metadata.tags ?? [],
      description: baseDocument?.metadata.description,
      createdAt: baseDocument?.metadata.createdAt,
      updatedAt: baseDocument?.metadata.updatedAt,
    },
    layout: baseDocument?.layout,
    theme: baseDocument?.theme,
    containers: baseDocument?.containers ?? [],
    annotations: baseDocument?.annotations ?? [],
    nodes: nodes.map((node) => {
      const baseNode = baseNodeMap.get(node.id);
      const meta = (node.data?.meta as Record<string, unknown> | undefined) ?? {};
      const shapeId =
        (typeof node.data?.shapeId === "string" ? node.data.shapeId : undefined) ??
        (typeof meta.shapeId === "string" ? meta.shapeId : undefined) ??
        baseNode?.shape ??
        "process";
      const shapeDefinition = getShapeDefinition(shapeId);
      const family =
        asDiagramFamily(
          typeof node.data?.family === "string" ? node.data.family : undefined,
        ) ??
        asDiagramFamily(
          typeof meta.family === "string" ? meta.family : undefined,
        ) ??
        shapeDefinition?.family ??
        baseNode?.family ??
        baseDocument?.family ??
        "flowchart";
      const kind =
        (typeof node.data?.kind === "string" ? node.data.kind : undefined) ??
        (typeof meta.semanticKind === "string" ? meta.semanticKind : undefined) ??
        shapeDefinition?.kind ??
        baseNode?.kind ??
        "process-step";
      const width = extractNodeDimension(node, "width") ??
        baseNode?.size.width ??
        shapeDefinition?.defaultWidth ??
        180;
      const height = extractNodeDimension(node, "height") ??
        baseNode?.size.height ??
        shapeDefinition?.defaultHeight ??
        64;

      const nextNode: DiagramNode = {
        id: node.id,
        family,
        kind,
        shape: shapeId,
        position: node.position,
        size: { width, height },
        ports:
          shapeDefinition?.portAnchors.map((anchor) => ({
            id: anchor.id,
            side: anchor.side,
            accepts: [],
            metadata: {
              anchor,
            },
          })) ??
          baseNode?.ports ??
          [],
        content: {
          title:
            (typeof node.data?.label === "string" ? node.data.label : undefined) ??
            baseNode?.content.title ??
            "Untitled",
          subtitle: baseNode?.content.subtitle,
          body: baseNode?.content.body,
          labels: baseNode?.content.labels ?? [],
        },
        style: baseNode?.style ?? { tokens: {} },
        resizePolicy:
          shapeDefinition?.resizePolicy ?? baseNode?.resizePolicy ?? "content",
        metadata: {
          ...baseNode?.metadata,
          ...meta,
          family,
          semanticKind: kind,
          shapeId,
        },
        automation:
          (node.data?.automation as DiagramNode["automation"] | undefined) ??
          baseNode?.automation,
        ai:
          node.data?.confidence !== undefined
            ? {
                ...(baseNode?.ai ?? { notes: [] }),
                confidence: Number(node.data.confidence),
              }
            : baseNode?.ai,
      };

      return nextNode;
    }),
    edges: edges.map((edge) => {
      const baseEdge =
        baseDocument?.edges.find((base) => base.id === edge.id) ?? undefined;

      return {
        id: edge.id,
        family:
          asDiagramFamily(
            typeof edge.data?.family === "string" ? edge.data.family : undefined,
          ) ??
          baseEdge?.family ??
          baseDocument?.family ??
          "flowchart",
        kind:
          (typeof edge.data?.kind === "string" ? edge.data.kind : undefined) ??
          baseEdge?.kind ??
          (edge.label ? "conditional-flow" : "flow"),
        sourceNodeId: edge.source,
        sourcePortId: edge.sourceHandle ?? baseEdge?.sourcePortId,
        targetNodeId: edge.target,
        targetPortId: edge.targetHandle ?? baseEdge?.targetPortId,
        routing:
          asEdgeRouting(
            typeof edge.data?.routing === "string" ? edge.data.routing : undefined,
          ) ??
          baseEdge?.routing ??
          "orthogonal",
        waypoints: baseEdge?.waypoints ?? [],
        labels: edge.label
          ? [{ text: String(edge.label), position: "center" }]
          : baseEdge?.labels ?? [],
        startMarker: baseEdge?.startMarker ?? "none",
        endMarker: baseEdge?.endMarker ?? "arrow",
        style: baseEdge?.style ?? { tokens: {} },
        metadata: baseEdge?.metadata ?? {},
        ai:
          edge.data?.confidence !== undefined
            ? {
                ...(baseEdge?.ai ?? { notes: [] }),
                confidence: Number(edge.data.confidence),
              }
            : baseEdge?.ai,
      };
    }),
  });
}

function extractNodeDimension(
  node: Node,
  dimension: "width" | "height",
): number | undefined {
  const styleValue = node.style?.[dimension];

  if (typeof styleValue === "number") {
    return styleValue;
  }

  if (typeof styleValue === "string") {
    const parsed = Number.parseFloat(styleValue);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  const dataSize =
    typeof node.data?.size === "object" && node.data.size !== null
      ? (node.data.size as { width?: number; height?: number })
      : undefined;

  return dataSize?.[dimension];
}

const DIAGRAM_FAMILIES: DiagramFamily[] = [
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
];

const EDGE_ROUTINGS: EdgeRouting[] = [
  "straight",
  "orthogonal",
  "smooth",
  "bezier",
  "manual",
];

function asDiagramFamily(value: string | undefined): DiagramFamily | undefined {
  return value && DIAGRAM_FAMILIES.includes(value as DiagramFamily)
    ? (value as DiagramFamily)
    : undefined;
}

function asEdgeRouting(value: string | undefined): EdgeRouting | undefined {
  return value && EDGE_ROUTINGS.includes(value as EdgeRouting)
    ? (value as EdgeRouting)
    : undefined;
}
