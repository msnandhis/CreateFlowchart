import { create } from "zustand";
import type { FlowGraph, FlowNode, FlowEdge } from "@createflowchart/core";
import { createEmptyFlowGraph, createStarterFlowGraph, validateFlowGraph, toReactFlowFormat, fromReactFlowFormat } from "@createflowchart/core";
import type { Node, Edge, OnNodesChange, OnEdgesChange, OnConnect, Connection } from "@xyflow/react";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";
import type { DiagramDocument } from "@createflowchart/schema";
import { createBlankFlowchartDocument, toDiagramDocument } from "../lib/document-compat";

type EditorMode = "sandbox" | "cloud";

interface EditorState {
  // ─── Core Data ────────────────────────────────────────────────
  document: DiagramDocument;
  flowGraph: FlowGraph;
  rfNodes: Node[];
  rfEdges: Edge[];
  flowId: string | null;
  mode: EditorMode;
  isDirty: boolean;
  title: string;

  // ─── Selection ────────────────────────────────────────────────
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // ─── Undo/Redo ────────────────────────────────────────────────
  undoStack: FlowGraph[];
  redoStack: FlowGraph[];

  // ─── Actions ──────────────────────────────────────────────────
  setFlowGraph: (fg: FlowGraph) => void;
  loadFlow: (fg: FlowGraph, id: string | null, mode: EditorMode, title?: string) => void;
  setTitle: (title: string) => void;

  // React Flow handlers
  setInitialData: (flow: any) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Node operations
  addNode: (node: FlowNode) => void;
  deleteSelected: () => void;
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  updateNodeLabel: (id: string, label: string) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Utils
  markClean: () => void;
  getFlowGraph: () => FlowGraph;
}

function pushUndo(state: EditorState): Partial<EditorState> {
  return {
    undoStack: [...state.undoStack.slice(-49), state.flowGraph],
    redoStack: [],
  };
}

function syncFromFlowGraph(
  fg: FlowGraph,
  title?: string,
): Pick<EditorState, "document" | "flowGraph" | "rfNodes" | "rfEdges" | "isDirty"> {
  const { nodes, edges } = toReactFlowFormat(fg);
  return {
    document: toDiagramDocument({ data: fg, title }),
    flowGraph: fg,
    rfNodes: nodes,
    rfEdges: edges,
    isDirty: true,
  };
}

function syncFromReactFlow(
  nodes: Node[],
  edges: Edge[],
  title?: string,
): Pick<EditorState, "document" | "flowGraph" | "rfNodes" | "rfEdges" | "isDirty"> {
  const fg = fromReactFlowFormat(nodes as any, edges as any);
  return {
    document: toDiagramDocument({ data: fg, title }),
    flowGraph: fg,
    rfNodes: nodes,
    rfEdges: edges,
    isDirty: true,
  };
}

const initialFg = createEmptyFlowGraph();
const initial = toReactFlowFormat(initialFg);

export const useEditorStore = create<EditorState>((set, get) => ({
  document: createBlankFlowchartDocument("Untitled Flow"),
  flowGraph: initialFg,
  rfNodes: initial.nodes,
  rfEdges: initial.edges,
  flowId: null,
  mode: "sandbox",
  isDirty: false,
  title: "Untitled Flow",
  selectedNodeId: null,
  selectedEdgeId: null,
  undoStack: [],
  redoStack: [],

  setFlowGraph: (fg) => {
    set((s) => ({ ...pushUndo(s), ...syncFromFlowGraph(fg, s.title) }));
  },

  loadFlow: (fg, id, mode, title) => {
    const { nodes, edges } = toReactFlowFormat(fg);
    set({
      document: toDiagramDocument({ id: id ?? undefined, title, data: fg }),
      flowGraph: fg,
      rfNodes: nodes,
      rfEdges: edges,
      flowId: id,
      mode,
      isDirty: false,
      title: title ?? "Untitled Flow",
      undoStack: [],
      redoStack: [],
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },

  setTitle: (title) =>
    set((s) => ({
      title,
      document: {
        ...s.document,
        metadata: {
          ...s.document.metadata,
          title,
        },
      },
      isDirty: true,
    })),

  setInitialData: (flow: any) => {
    const data = typeof flow.data === "string" ? JSON.parse(flow.data) : flow.data;
    const { nodes, edges } = toReactFlowFormat(data);
    set({
      document: toDiagramDocument({
        id: flow.id,
        title: flow.title || "Untitled Flow",
        data,
      }),
      flowGraph: data,
      rfNodes: nodes,
      rfEdges: edges,
      title: flow.title || "Untitled Flow",
      isDirty: false,
      undoStack: [],
      redoStack: [],
    });
  },

  onNodesChange: (changes) => {
    set((s) => {
      const updated = applyNodeChanges(changes, s.rfNodes);
      return syncFromReactFlow(updated, s.rfEdges, s.title);
    });
  },

  onEdgesChange: (changes) => {
    set((s) => {
      const updated = applyEdgeChanges(changes, s.rfEdges);
      return syncFromReactFlow(s.rfNodes, updated, s.title);
    });
  },

  onConnect: (connection: Connection) => {
    set((s) => {
      const updated = addEdge(
        { ...connection, id: `e-${connection.source}-${connection.target}` },
        s.rfEdges
      );
      return { ...pushUndo(s), ...syncFromReactFlow(s.rfNodes, updated, s.title) };
    });
  },

  addNode: (node) => {
    set((s) => {
      const newFg: FlowGraph = {
        ...s.flowGraph,
        nodes: [...s.flowGraph.nodes, node],
      };
      return { ...pushUndo(s), ...syncFromFlowGraph(newFg, s.title) };
    });
  },

  deleteSelected: () => {
    const { selectedNodeId, selectedEdgeId } = get();
    if (!selectedNodeId && !selectedEdgeId) return;

    set((s) => {
      let newFg = { ...s.flowGraph };
      if (selectedNodeId) {
        newFg = {
          ...newFg,
          nodes: newFg.nodes.filter((n) => n.id !== selectedNodeId),
          edges: newFg.edges.filter(
            (e) => e.source !== selectedNodeId && e.target !== selectedNodeId
          ),
        };
      }
      if (selectedEdgeId) {
        newFg = {
          ...newFg,
          edges: newFg.edges.filter((e) => e.id !== selectedEdgeId),
        };
      }
      return {
        ...pushUndo(s),
        ...syncFromFlowGraph(newFg, s.title),
        selectedNodeId: null,
        selectedEdgeId: null,
      };
    });
  },

  setSelectedNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  updateNodeLabel: (id, label) => {
    set((s) => {
      const newFg: FlowGraph = {
        ...s.flowGraph,
        nodes: s.flowGraph.nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, label } } : n
        ),
      };
      return { ...pushUndo(s), ...syncFromFlowGraph(newFg, s.title) };
    });
  },

  undo: () => {
    set((s) => {
      if (s.undoStack.length === 0) return s;
      const prev = s.undoStack[s.undoStack.length - 1];
      return {
        undoStack: s.undoStack.slice(0, -1),
        redoStack: [...s.redoStack, s.flowGraph],
        ...syncFromFlowGraph(prev, s.title),
      };
    });
  },

  redo: () => {
    set((s) => {
      if (s.redoStack.length === 0) return s;
      const next = s.redoStack[s.redoStack.length - 1];
      return {
        redoStack: s.redoStack.slice(0, -1),
        undoStack: [...s.undoStack, s.flowGraph],
        ...syncFromFlowGraph(next, s.title),
      };
    });
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,
  markClean: () => set({ isDirty: false }),

  getFlowGraph: () => {
    const result = validateFlowGraph(get().flowGraph);
    return result.success ? result.data : get().flowGraph;
  },
}));

// ─── Atomic selectors ──────────────────────────────────────────────
export const useNodes = () => useEditorStore((s) => s.rfNodes);
export const useEdges = () => useEditorStore((s) => s.rfEdges);
export const useSelectedNode = () => {
  const id = useEditorStore((s) => s.selectedNodeId);
  const fg = useEditorStore((s) => s.flowGraph);
  return id ? fg.nodes.find((n) => n.id === id) ?? null : null;
};
export const useEditorMode = () => useEditorStore((s) => s.mode);
export const useIsDirty = () => useEditorStore((s) => s.isDirty);
