import { create } from "zustand";
import type { ActionConfig, FlowGraph, FlowNode } from "@createflowchart/core";
import { createEmptyFlowGraph, validateFlowGraph } from "@createflowchart/core";
import type { EngineState } from "@createflowchart/engine";
import type {
  DiagramContainer,
  DiagramDocument,
  EdgeRouting,
  Marker,
} from "@createflowchart/schema";
import type {
  Connection,
  Edge,
  Node,
  OnEdgesChange,
  OnNodesChange,
} from "@xyflow/react";
import { addEdge, applyEdgeChanges, applyNodeChanges } from "@xyflow/react";
import {
  addLegacyNode,
  addDocumentContainerEntity,
  assignContainerToParent,
  assignNodeToContainer,
  detectContainerForNode,
  applyReactFlowProjection,
  createEditorProjection,
  deleteSelectedEntities,
  projectEngineState,
  redoEditor,
  replaceEditorDocument,
  selectContainerInEngine,
  selectEdgeInEngine,
  selectNodeInEngine,
  setEditorTitle,
  undoEditor,
  updateDocumentContainerLabel,
  updateDocumentContainerSize,
  updateDocumentContainerStyle,
  updateDocumentEdgeKind,
  updateDocumentEdgeLabel,
  updateDocumentEdgeMarkers,
  updateDocumentEdgeRouting,
  updateDocumentNodeAutomation,
  updateDocumentNodeShape,
  updateDocumentNodeSize,
  updateDocumentNodeStyle,
  updateDocumentNodeTitle,
} from "../lib/document-engine";
import { createBlankFlowchartDocument, toDiagramDocument } from "../lib/document-compat";

type EditorMode = "sandbox" | "cloud";

interface EditorCheckpoint {
  id: string;
  label: string;
  createdAt: string;
  document: DiagramDocument;
}

interface EditorState {
  engineState: EngineState;
  document: DiagramDocument;
  flowGraph: FlowGraph;
  rfNodes: Node[];
  rfEdges: Edge[];
  viewportFitRequest: number;
  flowId: string | null;
  mode: EditorMode;
  isDirty: boolean;
  title: string;
  checkpoints: EditorCheckpoint[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  selectedContainerId: string | null;
  setFlowGraph: (fg: FlowGraph) => void;
  setDocument: (document: DiagramDocument) => void;
  loadFlow: (
    fg: FlowGraph,
    id: string | null,
    mode: EditorMode,
    title?: string,
  ) => void;
  setTitle: (title: string) => void;
  setInitialData: (flow: any) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  onNodeDragStop: (event: unknown, node: Node) => void;
  addNode: (node: FlowNode) => void;
  addContainer: (container: DiagramContainer) => void;
  deleteSelected: () => void;
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  setSelectedContainer: (id: string | null) => void;
  updateNodeLabel: (id: string, label: string) => void;
  updateNodeShape: (id: string, shapeId: string) => void;
  updateNodeSize: (
    id: string,
    size: { width: number; height: number },
  ) => void;
  updateNodeStyle: (
    id: string,
    style: { fill?: string; stroke?: string; textColor?: string },
  ) => void;
  updateEdgeLabel: (id: string, label: string) => void;
  updateEdgeKind: (id: string, kind: string) => void;
  updateEdgeRouting: (id: string, routing: EdgeRouting) => void;
  updateEdgeMarkers: (
    id: string,
    markers: { startMarker?: Marker; endMarker?: Marker },
  ) => void;
  updateContainerLabel: (id: string, label: string) => void;
  updateContainerSize: (
    id: string,
    size: { width: number; height: number },
  ) => void;
  updateContainerStyle: (
    id: string,
    style: { fill?: string; stroke?: string },
  ) => void;
  assignNodeContainer: (nodeId: string, containerId: string | null) => void;
  assignContainerParent: (containerId: string, parentContainerId: string | null) => void;
  updateNodeAutomation: (id: string, config: ActionConfig | undefined) => void;
  createCheckpoint: (label?: string) => void;
  restoreCheckpoint: (id: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  markClean: () => void;
  getFlowGraph: () => FlowGraph;
}

function syncFromProjection(
  projection: ReturnType<typeof createEditorProjection>,
): Pick<
  EditorState,
  "engineState" | "document" | "flowGraph" | "rfNodes" | "rfEdges" | "isDirty"
> {
  return {
    engineState: projection.engineState,
    document: projection.document,
    flowGraph: projection.flowGraph,
    rfNodes: projection.rfNodes,
    rfEdges: projection.rfEdges,
    isDirty: true,
  };
}

function syncFromFlowGraph(
  fg: FlowGraph,
  title?: string,
): Pick<
  EditorState,
  "engineState" | "document" | "flowGraph" | "rfNodes" | "rfEdges" | "isDirty"
> {
  return syncFromProjection(
    createEditorProjection(toDiagramDocument({ data: fg, title })),
  );
}

const initialFg = createEmptyFlowGraph();
const initialDocument = createBlankFlowchartDocument("Untitled Flow");
const initial = createEditorProjection(initialDocument);

function createCheckpointRecord(
  document: DiagramDocument,
  label?: string,
): EditorCheckpoint {
  const createdAt = new Date().toISOString();
  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `checkpoint-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: label?.trim() || `Checkpoint ${new Date(createdAt).toLocaleString()}`,
    createdAt,
    document,
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  engineState: initial.engineState,
  document: initial.document,
  flowGraph: initial.flowGraph,
  rfNodes: initial.rfNodes,
  rfEdges: initial.rfEdges,
  flowId: null,
  mode: "sandbox",
  isDirty: false,
  title: "Untitled Flow",
  checkpoints: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  selectedContainerId: null,
  viewportFitRequest: 0,

  setFlowGraph: (fg) => {
    set((s) => ({
      ...syncFromFlowGraph(fg, s.title),
      viewportFitRequest: s.viewportFitRequest + 1,
    }));
  },

  setDocument: (document) => {
    set((s) => ({
      title: document.metadata.title,
      viewportFitRequest: s.viewportFitRequest + 1,
      ...syncFromProjection(replaceEditorDocument(s.engineState, document)),
    }));
  },

  loadFlow: (fg, id, mode, title) => {
    const projection = createEditorProjection(
      toDiagramDocument({ id: id ?? undefined, title, data: fg }),
    );

    set({
      engineState: projection.engineState,
      document: projection.document,
      flowGraph: projection.flowGraph,
      rfNodes: projection.rfNodes,
      rfEdges: projection.rfEdges,
      flowId: id,
      mode,
      isDirty: false,
      title: title ?? "Untitled Flow",
      checkpoints: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedContainerId: null,
      viewportFitRequest: projection.document.nodes.length > 0 ? 1 : 0,
    });
  },

  setTitle: (title) =>
    set((s) => ({
      title,
      ...syncFromProjection(setEditorTitle(s.engineState, title)),
    })),

  setInitialData: (flow: any) => {
    const data =
      flow.document ??
      (typeof flow.data === "string" ? JSON.parse(flow.data) : flow.data);
    const projection = createEditorProjection(
      toDiagramDocument({
        id: flow.id,
        title: flow.title || "Untitled Flow",
        data,
      }),
    );

    set({
      engineState: projection.engineState,
      document: projection.document,
      flowGraph: projection.flowGraph,
      rfNodes: projection.rfNodes,
      rfEdges: projection.rfEdges,
      title: flow.title || "Untitled Flow",
      isDirty: false,
      checkpoints: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedContainerId: null,
      viewportFitRequest: projection.document.nodes.length > 0 ? 1 : 0,
    });
  },

  onNodesChange: (changes) => {
    set((s) => {
      const updated = applyNodeChanges(changes, s.rfNodes);
      return syncFromProjection(
        applyReactFlowProjection(s.engineState, updated, s.rfEdges),
      );
    });
  },

  onEdgesChange: (changes) => {
    set((s) => {
      const updated = applyEdgeChanges(changes, s.rfEdges);
      return syncFromProjection(
        applyReactFlowProjection(s.engineState, s.rfNodes, updated),
      );
    });
  },

  onConnect: (connection: Connection) => {
    set((s) => {
      const updated = addEdge(
        { ...connection, id: `e-${connection.source}-${connection.target}` },
        s.rfEdges,
      );

      return syncFromProjection(
        applyReactFlowProjection(s.engineState, s.rfNodes, updated),
      );
    });
  },

  onNodeDragStop: (_event, node) => {
    set((s) => {
      const containerId = detectContainerForNode(s.document, node.id, node.position);
      return syncFromProjection(
        assignNodeToContainer(s.engineState, node.id, containerId),
      );
    });
  },

  addNode: (node) => {
    set((s) => syncFromProjection(addLegacyNode(s.engineState, node)));
  },

  addContainer: (container) => {
    set((s) => syncFromProjection(addDocumentContainerEntity(s.engineState, container)));
  },

  deleteSelected: () => {
    const { selectedNodeId, selectedEdgeId, selectedContainerId } = get();
    if (!selectedNodeId && !selectedEdgeId && !selectedContainerId) return;

    set((s) => ({
      ...syncFromProjection(
        deleteSelectedEntities(
          s.engineState,
          selectedNodeId,
          selectedEdgeId,
          selectedContainerId,
        ),
      ),
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedContainerId: null,
    }));
  },

  setSelectedNode: (id) =>
    set((s) => ({
      engineState: {
        ...s.engineState,
        selection: selectNodeInEngine(s.engineState, id),
      },
      selectedNodeId: id,
      selectedEdgeId: null,
      selectedContainerId: null,
    })),

  setSelectedEdge: (id) =>
    set((s) => ({
      engineState: {
        ...s.engineState,
        selection: selectEdgeInEngine(s.engineState, id),
      },
      selectedEdgeId: id,
      selectedNodeId: null,
      selectedContainerId: null,
    })),

  setSelectedContainer: (id) =>
    set((s) => ({
      engineState: {
        ...s.engineState,
        selection: selectContainerInEngine(s.engineState, id),
      },
      selectedContainerId: id,
      selectedNodeId: null,
      selectedEdgeId: null,
    })),

  updateNodeLabel: (id, label) => {
    set((s) =>
      syncFromProjection(updateDocumentNodeTitle(s.engineState, id, label)),
    );
  },

  updateNodeShape: (id, shapeId) => {
    set((s) =>
      syncFromProjection(updateDocumentNodeShape(s.engineState, id, shapeId)),
    );
  },

  updateNodeSize: (id, size) => {
    set((s) =>
      syncFromProjection(updateDocumentNodeSize(s.engineState, id, size)),
    );
  },

  updateNodeStyle: (id, style) => {
    set((s) =>
      syncFromProjection(updateDocumentNodeStyle(s.engineState, id, style)),
    );
  },

  updateEdgeLabel: (id, label) => {
    set((s) =>
      syncFromProjection(updateDocumentEdgeLabel(s.engineState, id, label)),
    );
  },

  updateEdgeKind: (id, kind) => {
    set((s) =>
      syncFromProjection(updateDocumentEdgeKind(s.engineState, id, kind)),
    );
  },

  updateEdgeRouting: (id, routing) => {
    set((s) =>
      syncFromProjection(updateDocumentEdgeRouting(s.engineState, id, routing)),
    );
  },

  updateEdgeMarkers: (id, markers) => {
    set((s) =>
      syncFromProjection(updateDocumentEdgeMarkers(s.engineState, id, markers)),
    );
  },

  updateContainerLabel: (id, label) => {
    set((s) =>
      syncFromProjection(updateDocumentContainerLabel(s.engineState, id, label)),
    );
  },

  updateContainerSize: (id, size) => {
    set((s) =>
      syncFromProjection(updateDocumentContainerSize(s.engineState, id, size)),
    );
  },

  updateContainerStyle: (id, style) => {
    set((s) =>
      syncFromProjection(updateDocumentContainerStyle(s.engineState, id, style)),
    );
  },

  assignNodeContainer: (nodeId, containerId) => {
    set((s) =>
      syncFromProjection(assignNodeToContainer(s.engineState, nodeId, containerId)),
    );
  },

  assignContainerParent: (containerId, parentContainerId) => {
    set((s) =>
      syncFromProjection(
        assignContainerToParent(s.engineState, containerId, parentContainerId),
      ),
    );
  },

  updateNodeAutomation: (id, config) => {
    set((s) =>
      syncFromProjection(
        updateDocumentNodeAutomation(s.engineState, id, config),
      ),
    );
  },

  createCheckpoint: (label) => {
    set((s) => ({
      checkpoints: [createCheckpointRecord(s.document, label), ...s.checkpoints].slice(
        0,
        12,
      ),
    }));
  },

  restoreCheckpoint: (id) => {
    set((s) => {
      const checkpoint = s.checkpoints.find((entry) => entry.id === id);
      if (!checkpoint) {
        return s;
      }

      return {
        title: checkpoint.document.metadata.title,
        viewportFitRequest: s.viewportFitRequest + 1,
        ...syncFromProjection(
          replaceEditorDocument(s.engineState, checkpoint.document),
        ),
      };
    });
  },

  undo: () => {
    set((s) => {
      if (s.engineState.history.past.length === 0) return s;
      return syncFromProjection(undoEditor(s.engineState));
    });
  },

  redo: () => {
    set((s) => {
      if (s.engineState.history.future.length === 0) return s;
      return syncFromProjection(redoEditor(s.engineState));
    });
  },

  canUndo: () => get().engineState.history.past.length > 0,
  canRedo: () => get().engineState.history.future.length > 0,
  markClean: () => set({ isDirty: false }),

  getFlowGraph: () => {
    const result = validateFlowGraph(get().flowGraph);
    return result.success ? result.data : get().flowGraph;
  },
}));

export const useNodes = () => useEditorStore((s) => s.rfNodes);
export const useEdges = () => useEditorStore((s) => s.rfEdges);
export const useSelectedDocumentNode = () => {
  const id = useEditorStore((s) => s.selectedNodeId);
  const document = useEditorStore((s) => s.document);
  return id ? document.nodes.find((node) => node.id === id) ?? null : null;
};
export const useSelectedDocumentContainer = () => {
  const id = useEditorStore((s) => s.selectedContainerId);
  const document = useEditorStore((s) => s.document);
  return id ? document.containers.find((container) => container.id === id) ?? null : null;
};
export const useSelectedDocumentEdge = () => {
  const id = useEditorStore((s) => s.selectedEdgeId);
  const document = useEditorStore((s) => s.document);
  return id ? document.edges.find((edge) => edge.id === id) ?? null : null;
};
export const useDocument = () => useEditorStore((s) => s.document);
export const useViewportFitRequest = () => useEditorStore((s) => s.viewportFitRequest);
export const useSelectedNode = () => {
  const id = useEditorStore((s) => s.selectedNodeId);
  const fg = useEditorStore((s) => s.flowGraph);
  return id ? fg.nodes.find((n) => n.id === id) ?? null : null;
};
export const useEditorMode = () => useEditorStore((s) => s.mode);
export const useIsDirty = () => useEditorStore((s) => s.isDirty);
export const useCheckpoints = () => useEditorStore((s) => s.checkpoints);
