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
import type { DiagramDocument } from "@createflowchart/schema";
import type { Edge, Node } from "@xyflow/react";
import {
  documentToFlowGraph,
  documentToReactFlow,
  reactFlowToDocument,
} from "./document-compat";
import { getPaletteItemByShapeId } from "./flowchart-shapes";
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

  const nextState = addDocumentNode(engineState, {
    id: node.id,
    family: "flowchart",
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
            : "terminator"),
    position: node.position,
    size: {
      width: paletteItem?.defaultSize.width ?? 180,
      height: paletteItem?.defaultSize.height ?? (node.type === "decision" ? 120 : 64),
    },
    ports: [],
    content: {
      title: node.data.label,
      labels: [],
    },
    style: { tokens: {} },
    resizePolicy: "content",
    metadata: node.data.meta,
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

  return projectEngineState(
    updateDocumentNode(engineState, nodeId, (node) => ({
      ...node,
      shape: shapeId,
      kind: paletteItem?.kind ?? node.kind,
      size: paletteItem
        ? {
            width: paletteItem.defaultSize.width,
            height: paletteItem.defaultSize.height,
          }
        : node.size,
      metadata: {
        ...node.metadata,
        shapeId,
        semanticKind: paletteItem?.kind ?? node.kind,
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
