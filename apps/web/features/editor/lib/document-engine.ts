import type { FlowNode } from "@createflowchart/core";
import {
  addNode as addDocumentNode,
  clearSelection,
  createEngineState,
  redo as redoDocumentHistory,
  removeEdge as removeDocumentEdge,
  removeNode as removeDocumentNode,
  selectEdge,
  selectNode,
  setDocumentTitle,
  undo as undoDocumentHistory,
  updateNode as updateDocumentNode,
  type EngineSelection,
  type EngineState,
} from "@createflowchart/engine";
import type { DiagramDocument, DiagramFamily } from "@createflowchart/schema";
import type { Edge, Node } from "@xyflow/react";
import {
  documentToFlowGraph,
  documentToReactFlow,
  reactFlowToDocument,
} from "./document-compat";
import { getPaletteItemByShapeId, getShapeDefinition } from "./flowchart-shapes";
import type { ActionConfig } from "@createflowchart/core";

export interface EditorProjection {
  engineState: EngineState;
  document: DiagramDocument;
  flowGraph: ReturnType<typeof documentToFlowGraph>;
  rfNodes: ReturnType<typeof documentToReactFlow>["nodes"];
  rfEdges: ReturnType<typeof documentToReactFlow>["edges"];
}

export function createEditorProjection(document: DiagramDocument): EditorProjection {
  const engineState = createEngineState(document);
  return projectEngineState(engineState);
}

export function projectEngineState(engineState: EngineState): EditorProjection {
  const document = engineState.document;
  const flowGraph = documentToFlowGraph(document);
  const { nodes, edges } = documentToReactFlow(document);

  return {
    engineState,
    document,
    flowGraph,
    rfNodes: nodes,
    rfEdges: edges,
  };
}

export function setEditorTitle(
  engineState: EngineState,
  title: string,
): EditorProjection {
  return projectEngineState(setDocumentTitle(engineState, title));
}

export function applyReactFlowProjection(
  engineState: EngineState,
  nodes: Node[],
  edges: Edge[],
): EditorProjection {
  const nextDocument = reactFlowToDocument(nodes, edges, engineState.document);
  return projectEngineState(createEngineState(nextDocument, engineState.history.limit));
}

export function addLegacyNode(
  engineState: EngineState,
  node: FlowNode,
): EditorProjection {
  const shapeId =
    typeof node.data.meta.shapeId === "string"
      ? node.data.meta.shapeId
      : undefined;
  const paletteItem = shapeId ? getPaletteItemByShapeId(shapeId) : null;
  const shapeDefinition = shapeId ? getShapeDefinition(shapeId) : null;

  const nextState = addDocumentNode(engineState, {
    id: node.id,
    family:
      asDiagramFamily(
        typeof node.data.meta.family === "string" ? node.data.meta.family : undefined,
      ) ??
      paletteItem?.family ??
      "flowchart",
    kind:
      (typeof node.data.meta.semanticKind === "string"
        ? node.data.meta.semanticKind
        : paletteItem?.kind) ??
      (node.type === "start"
        ? "start-event"
        : node.type === "end"
          ? "end-event"
          : node.type === "decision"
            ? "decision-gateway"
            : node.type === "action"
              ? "automation-task"
              : "process-step"),
    shape:
      shapeId ??
      (node.type === "decision"
        ? "decision"
        : node.type === "action"
          ? "action-task"
          : node.type === "process"
            ? "process"
            : node.type === "start"
              ? "terminator-start"
              : "terminator-end"),
    position: node.position,
    size: {
      width: shapeDefinition?.defaultWidth ?? paletteItem?.defaultSize.width ?? 180,
      height:
        shapeDefinition?.defaultHeight ??
        paletteItem?.defaultSize.height ??
        (node.type === "decision" ? 120 : 64),
    },
    ports:
      shapeDefinition?.portAnchors.map((anchor) => ({
        id: anchor.id,
        side: anchor.side,
        metadata: {
          anchor,
        },
        accepts: [],
      })) ?? [],
    content: {
      title: node.data.label,
      labels: [],
    },
    style: { tokens: {} },
    resizePolicy: shapeDefinition?.resizePolicy ?? "content",
    metadata: {
      ...node.data.meta,
      shapeId:
        shapeId ??
        (node.type === "decision"
          ? "decision"
          : node.type === "action"
            ? "action-task"
            : node.type === "process"
              ? "process"
              : node.type === "start"
                ? "terminator-start"
                : "terminator-end"),
      semanticKind:
        (typeof node.data.meta.semanticKind === "string"
          ? node.data.meta.semanticKind
          : paletteItem?.kind) ??
        (node.type === "start"
          ? "start-event"
          : node.type === "end"
            ? "end-event"
            : node.type === "decision"
              ? "decision-gateway"
              : node.type === "action"
                ? "automation-task"
                : "process-step"),
      family:
        (typeof node.data.meta.family === "string" ? node.data.meta.family : undefined) ??
        paletteItem?.family ??
        "flowchart",
    },
    automation: node.data.action
      ? {
          actionType: "http",
          endpoint: node.data.action.webhook_url,
          method:
            node.data.action.method === "DELETE"
              ? "DELETE"
              : node.data.action.method,
          headers: node.data.action.headers,
          payloadTemplate: node.data.action.payload_template,
          metadata: {},
        }
      : undefined,
    ai: {
      confidence: node.data.confidence,
      notes: [],
    },
  });

  return projectEngineState(nextState);
}

export function updateDocumentNodeTitle(
  engineState: EngineState,
  nodeId: string,
  title: string,
): EditorProjection {
  return projectEngineState(
    updateDocumentNode(engineState, nodeId, (node) => ({
      ...node,
      content: {
        ...node.content,
        title,
      },
    })),
  );
}

export function updateDocumentNodeShape(
  engineState: EngineState,
  nodeId: string,
  shapeId: string,
): EditorProjection {
  const paletteItem = getPaletteItemByShapeId(shapeId);
  const shapeDefinition = getShapeDefinition(shapeId);

  return projectEngineState(
    updateDocumentNode(engineState, nodeId, (node) => ({
      ...node,
      family: paletteItem?.family ?? node.family,
      shape: shapeId,
      kind: paletteItem?.kind ?? node.kind,
      size: paletteItem
        ? {
            width: paletteItem.defaultSize.width,
            height: paletteItem.defaultSize.height,
          }
        : node.size,
      ports:
        shapeDefinition?.portAnchors.map((anchor) => ({
          id: anchor.id,
          side: anchor.side,
          metadata: {
            anchor,
          },
          accepts: [],
        })) ?? node.ports,
      resizePolicy: shapeDefinition?.resizePolicy ?? node.resizePolicy,
      metadata: {
        ...node.metadata,
        shapeId,
        semanticKind: paletteItem?.kind ?? node.kind,
        family: paletteItem?.family ?? node.family,
      },
    })),
  );
}

export function updateDocumentNodeSize(
  engineState: EngineState,
  nodeId: string,
  size: { width: number; height: number },
): EditorProjection {
  return projectEngineState(
    updateDocumentNode(engineState, nodeId, (node) => ({
      ...node,
      size,
    })),
  );
}

export function updateDocumentNodeAutomation(
  engineState: EngineState,
  nodeId: string,
  config: ActionConfig | undefined,
): EditorProjection {
  return projectEngineState(
    updateDocumentNode(engineState, nodeId, (node) => ({
      ...node,
      automation: config
        ? {
            actionType: "http",
            endpoint: config.webhook_url,
            method: config.method,
            headers: config.headers,
            payloadTemplate: config.payload_template,
            metadata: {},
          }
        : undefined,
    })),
  );
}

export function deleteSelectedEntities(
  engineState: EngineState,
  selectedNodeId: string | null,
  selectedEdgeId: string | null,
): EditorProjection {
  let nextState = engineState;

  if (selectedNodeId) {
    nextState = removeDocumentNode(nextState, selectedNodeId);
  }

  if (selectedEdgeId) {
    nextState = removeDocumentEdge(nextState, selectedEdgeId);
  }

  return projectEngineState(nextState);
}

export function undoEditor(engineState: EngineState): EditorProjection {
  return projectEngineState(undoDocumentHistory(engineState));
}

export function redoEditor(engineState: EngineState): EditorProjection {
  return projectEngineState(redoDocumentHistory(engineState));
}

export function selectNodeInEngine(
  _engineState: EngineState,
  id: string | null,
): EngineSelection {
  return id ? selectNode(id) : clearSelection();
}

export function selectEdgeInEngine(
  _engineState: EngineState,
  id: string | null,
): EngineSelection {
  return id ? selectEdge(id) : clearSelection();
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

function asDiagramFamily(value: string | undefined): DiagramFamily | undefined {
  return value && DIAGRAM_FAMILIES.includes(value as DiagramFamily)
    ? (value as DiagramFamily)
    : undefined;
}
