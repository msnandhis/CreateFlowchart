import { create } from "zustand";
import type { ActionConfig, FlowGraph, FlowNode } from "@createflowchart/legacy";
import { createEmptyFlowGraph, validateFlowGraph } from "@createflowchart/legacy";
import {
  DiagramEngine,
  createEngine,
  DiagramModel,
  DiagramNode,
  DiagramEdge,
  DiagramGroup,
  EdgeRouting,
  Marker,
} from "@createflowchart/schema";
import { createBlankFlowchartDocument, toDiagramDocument } from "../lib/document-compat";

type EditorMode = "sandbox" | "cloud";

interface EditorCheckpoint {
  id: string;
  label: string;
  createdAt: string;
  document: DiagramModel;
}

interface EditorState {
  engine: DiagramEngine;
  model: DiagramModel;
  flowId: string | null;
  mode: EditorMode;
  isDirty: boolean;
  title: string;
  checkpoints: EditorCheckpoint[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  
  // Actions
  setDocument: (document: DiagramModel) => void;
  loadFlow: (
    fg: FlowGraph,
    id: string | null,
    mode: EditorMode,
    title?: string,
  ) => void;
  setTitle: (title: string) => void;
  setInitialData: (flow: any) => void;
  
  // Node Operations
  addNode: (node: FlowNode) => void;
  updateNodeLabel: (id: string, label: string) => void;
  updateNodeShape: (id: string, shapeId: string) => void;
  moveNode: (id: string, position: { x: number; y: number }) => void;
  
  // Edge Operations
  updateEdgeLabel: (id: string, label: string) => void;
  
  // Selection
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  deleteSelected: () => void;
  
  // History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  markClean: () => void;
  getFlowGraph: () => FlowGraph;
}

const initialDocument = createBlankFlowchartDocument("Untitled Flow");
const initialEngine = createEngine({ model: initialDocument });

function createCheckpointRecord(
  document: DiagramModel,
  label?: string,
): EditorCheckpoint {
  const createdAt = new Date().toISOString();
  return {
    id: crypto.randomUUID?.() ?? `checkpoint-${Date.now()}`,
    label: label?.trim() || `Checkpoint ${new Date(createdAt).toLocaleString()}`,
    createdAt,
    document: JSON.parse(JSON.stringify(document)), // Deep clone
  };
}

export const useEditorStore = create<EditorState>((set, get) => {
  // Initialize internal engine state
  const engine = initialEngine;

  // Sync engine changes to Zustand state
  engine.on("model:changed", () => {
    set({ model: engine.getModel(), isDirty: true });
  });

  return {
    engine,
    model: engine.getModel(),
    flowId: null,
    mode: "sandbox",
    isDirty: false,
    title: "Untitled Flow",
    checkpoints: [],
    selectedNodeId: null,
    selectedEdgeId: null,

    setDocument: (document) => {
      get().engine.replaceModel(document);
      set({ title: document.metadata.title });
    },

    loadFlow: (fg, id, mode, title) => {
      const doc = toDiagramDocument({ id: id ?? undefined, title, data: fg });
      get().engine.replaceModel(doc);
      set({
        flowId: id,
        mode,
        isDirty: false,
        title: title ?? "Untitled Flow",
        checkpoints: [],
        selectedNodeId: null,
        selectedEdgeId: null,
      });
    },

    setTitle: (title) => {
      set({ title });
      const model = get().engine.getModel();
      get().engine.replaceModel({
        ...model,
        metadata: { ...model.metadata, title },
      });
    },

    setInitialData: (flow: any) => {
      const data = flow.document ?? (typeof flow.data === "string" ? JSON.parse(flow.data) : flow.data);
      const doc = toDiagramDocument({
        id: flow.id,
        title: flow.title || "Untitled Flow",
        data,
      });
      get().engine.replaceModel(doc);
      set({
        title: flow.title || "Untitled Flow",
        isDirty: false,
        flowId: flow.id,
        mode: "cloud",
      });
    },

    addNode: (node) => {
      // Basic bridging from legacy FlowNode to v3 DiagramNode
      get().engine.addNode({
        id: node.id,
        shape: "process", // Default
        position: node.position,
        label: node.data.label,
        data: { ...node.data.meta }
      });
    },

    updateNodeLabel: (id, label) => {
      get().engine.updateNode(id, { label });
    },

    updateNodeShape: (id, shapeId) => {
      get().engine.updateNode(id, { shape: shapeId });
    },

    moveNode: (id, position) => {
      get().engine.moveNode(id, position);
    },

    updateEdgeLabel: (id, label) => {
      get().engine.updateEdge(id, { label });
    },

    setSelectedNode: (id) => {
      get().engine.select(id ? [id] : []);
      set({ selectedNodeId: id, selectedEdgeId: null });
    },

    setSelectedEdge: (id) => {
      get().engine.select(id ? [id] : []);
      set({ selectedEdgeId: id, selectedNodeId: null });
    },

    deleteSelected: () => {
      const { selectedNodeId, selectedEdgeId } = get();
      if (selectedNodeId) get().engine.removeNode(selectedNodeId);
      if (selectedEdgeId) get().engine.removeEdge(selectedEdgeId);
      set({ selectedNodeId: null, selectedEdgeId: null });
    },

    undo: () => get().engine.undo(),
    redo: () => get().engine.redo(),
    canUndo: () => get().engine.canUndo(),
    canRedo: () => get().engine.canRedo(),
    
    markClean: () => set({ isDirty: false }),

    getFlowGraph: () => {
      // This is a legacy helper for AI/Export, we keep it for now but bridge it
      // In reality, we should move everything to DiagramModel
      return createEmptyFlowGraph(); 
    },
  };
});

// Selectors
export const useDocument = () => useEditorStore((s) => s.model);
export const useSelectedNodeId = () => useEditorStore((s) => s.selectedNodeId);
export const useSelectedEdgeId = () => useEditorStore((s) => s.selectedEdgeId);
export const useEditorMode = () => useEditorStore((s) => s.mode);
export const useIsDirty = () => useEditorStore((s) => s.isDirty);
export const useCheckpoints = () => useEditorStore((s) => s.checkpoints);
export const useEngine = () => useEditorStore((s) => s.engine);

