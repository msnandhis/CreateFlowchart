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
  const nextState = addDocumentNode(engineState, {
    id: node.id,
    family: "flowchart",
    kind:
      node.type === "start"
        ? "start-event"
        : node.type === "end"
          ? "end-event"
          : node.type === "decision"
            ? "decision-gateway"
            : node.type === "action"
              ? "automation-task"
              : "process-step",
    shape:
      node.type === "decision"
        ? "decision"
        : node.type === "action"
          ? "action-task"
          : node.type === "process"
            ? "process"
            : "terminator",
    position: node.position,
    size: { width: 180, height: node.type === "decision" ? 120 : 64 },
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
  engineState: EngineState,
  id: string | null,
): EngineSelection {
  return id ? selectNode(id) : clearSelection();
}

export function selectEdgeInEngine(
  engineState: EngineState,
  id: string | null,
): EngineSelection {
  return id ? selectEdge(id) : clearSelection();
}
