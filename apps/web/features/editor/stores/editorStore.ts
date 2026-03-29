import { create } from "zustand";
import type { FlowGraph, FlowNode } from "@createflowchart/core";
import { createEmptyFlowGraph, validateFlowGraph } from "@createflowchart/core";
import type { EngineState } from "@createflowchart/engine";
import type { DiagramDocument } from "@createflowchart/schema";
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
  applyReactFlowProjection,
  createEditorProjection,
  deleteSelectedEntities,
  projectEngineState,
  redoEditor,
  selectEdgeInEngine,
  selectNodeInEngine,
  setEditorTitle,
  undoEditor,
  updateDocumentNodeTitle,
} from "../lib/document-engine";
import { createBlankFlowchartDocument, toDiagramDocument } from "../lib/document-compat";

type EditorMode = "sandbox" | "cloud";

interface EditorState {
  engineState: EngineState;
  document: DiagramDocument;
  flowGraph: FlowGraph;
  rfNodes: Node[];
  rfEdges: Edge[];
  flowId: string | null;
  mode: EditorMode;
  isDirty: boolean;
  title: string;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  setFlowGraph: (fg: FlowGraph) => void;
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
  addNode: (node: FlowNode) => void;
  deleteSelected: () => void;
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  updateNodeLabel: (id: string, label: string) => void;
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
  selectedNodeId: null,
  selectedEdgeId: null,

  setFlowGraph: (fg) => {
    set((s) => syncFromFlowGraph(fg, s.title));
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
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },

  setTitle: (title) =>
    set((s) => ({
      title,
      ...syncFromProjection(setEditorTitle(s.engineState, title)),
    })),

  setInitialData: (flow: any) => {
    const data = typeof flow.data === "string" ? JSON.parse(flow.data) : flow.data;
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
      selectedNodeId: null,
      selectedEdgeId: null,
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

  addNode: (node) => {
    set((s) => syncFromProjection(addLegacyNode(s.engineState, node)));
  },

  deleteSelected: () => {
    const { selectedNodeId, selectedEdgeId } = get();
    if (!selectedNodeId && !selectedEdgeId) return;

    set((s) => ({
      ...syncFromProjection(
        deleteSelectedEntities(s.engineState, selectedNodeId, selectedEdgeId),
      ),
      selectedNodeId: null,
      selectedEdgeId: null,
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
    })),

  setSelectedEdge: (id) =>
    set((s) => ({
      engineState: {
        ...s.engineState,
        selection: selectEdgeInEngine(s.engineState, id),
      },
      selectedEdgeId: id,
      selectedNodeId: null,
    })),

  updateNodeLabel: (id, label) => {
    set((s) =>
      syncFromProjection(updateDocumentNodeTitle(s.engineState, id, label)),
    );
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
export const useSelectedNode = () => {
  const id = useEditorStore((s) => s.selectedNodeId);
  const fg = useEditorStore((s) => s.flowGraph);
  return id ? fg.nodes.find((n) => n.id === id) ?? null : null;
};
export const useEditorMode = () => useEditorStore((s) => s.mode);
export const useIsDirty = () => useEditorStore((s) => s.isDirty);
