/**
 * DiagramEngine v3 — Command-based, event-driven diagram engine
 *
 * Architecture inspired by GoJS's model/view separation:
 *   - Pure data operations (no DOM, no React)
 *   - Full undo/redo via command transactions
 *   - Event bus for reactive UI binding
 *   - Validation pipeline
 *   - Works in Node.js (headless) and browser
 */

import type {
  DiagramModel,
  DiagramNode,
  DiagramEdge,
  DiagramGroup,
  Point,
  Size,
} from "./model";
import {
  DiagramModelSchema,
  createDiagramModel,
  createNode,
  createEdge,
  createGroup,
} from "./model";

// ═══════════════════════════════════════════════════════════════════
// Events
// ═══════════════════════════════════════════════════════════════════

export type EngineEventType =
  | "model:changed"
  | "node:added"
  | "node:removed"
  | "node:moved"
  | "node:resized"
  | "node:updated"
  | "edge:added"
  | "edge:removed"
  | "edge:updated"
  | "group:added"
  | "group:removed"
  | "group:updated"
  | "selection:changed"
  | "history:changed"
  | "validation:changed";

export interface EngineEvent {
  type: EngineEventType;
  payload: unknown;
  timestamp: number;
}

type EventHandler = (event: EngineEvent) => void;
type Unsubscribe = () => void;

// ═══════════════════════════════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════════════════════════════

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export type Validator = (model: DiagramModel) => ValidationIssue[];

// ═══════════════════════════════════════════════════════════════════
// History (Undo/Redo)
// ═══════════════════════════════════════════════════════════════════

interface HistoryEntry {
  label: string;
  snapshot: string; // JSON of DiagramModel
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════
// Engine
// ═══════════════════════════════════════════════════════════════════

export interface DiagramEngineOptions {
  model?: DiagramModel;
  validators?: Validator[];
  maxHistory?: number;
}

export class DiagramEngine {
  private _model: DiagramModel;
  private _selection: Set<string> = new Set();
  private _listeners: Map<string, Set<EventHandler>> = new Map();
  private _validators: Validator[];
  private _issues: ValidationIssue[] = [];

  // History
  private _undoStack: HistoryEntry[] = [];
  private _redoStack: HistoryEntry[] = [];
  private _maxHistory: number;
  private _batchDepth = 0;

  constructor(options: DiagramEngineOptions = {}) {
    this._model = options.model ?? createDiagramModel();
    this._validators = options.validators ?? [defaultValidator];
    this._maxHistory = options.maxHistory ?? 100;
    this._validate();
  }

  // ─── Model Access ──────────────────────────────────────────────

  getModel(): Readonly<DiagramModel> {
    return this._model;
  }

  getNode(id: string): DiagramNode | undefined {
    return this._model.nodes.find((n) => n.id === id);
  }

  getEdge(id: string): DiagramEdge | undefined {
    return this._model.edges.find((e) => e.id === id);
  }

  getGroup(id: string): DiagramGroup | undefined {
    return this._model.groups.find((g) => g.id === id);
  }

  getNodesInGroup(groupId: string): DiagramNode[] {
    return this._model.nodes.filter((n) => n.groupId === groupId);
  }

  getConnectedEdges(nodeId: string): DiagramEdge[] {
    return this._model.edges.filter(
      (e) => e.source === nodeId || e.target === nodeId,
    );
  }

  getIssues(): readonly ValidationIssue[] {
    return this._issues;
  }

  // ─── Node Operations ──────────────────────────────────────────

  addNode(input: Partial<DiagramNode> & { shape: string }): DiagramNode {
    const node = createNode(input);
    this._snapshot("Add node");
    this._model = {
      ...this._model,
      nodes: [...this._model.nodes, node],
    };
    this._emit("node:added", node);
    this._afterChange();
    return node;
  }

  removeNode(nodeId: string): void {
    const node = this.getNode(nodeId);
    if (!node) return;

    this._snapshot("Remove node");

    // Remove connected edges
    const connectedEdgeIds = this.getConnectedEdges(nodeId).map((e) => e.id);

    this._model = {
      ...this._model,
      nodes: this._model.nodes.filter((n) => n.id !== nodeId),
      edges: this._model.edges.filter((e) => !connectedEdgeIds.includes(e.id)),
    };

    this._selection.delete(nodeId);
    this._emit("node:removed", { nodeId, removedEdgeIds: connectedEdgeIds });
    this._afterChange();
  }

  moveNode(nodeId: string, position: Point): void {
    this._snapshot("Move node");
    this._model = {
      ...this._model,
      nodes: this._model.nodes.map((n) =>
        n.id === nodeId ? { ...n, position } : n,
      ),
    };
    this._emit("node:moved", { nodeId, position });
    this._afterChange();
  }

  resizeNode(nodeId: string, size: Size): void {
    this._snapshot("Resize node");
    this._model = {
      ...this._model,
      nodes: this._model.nodes.map((n) =>
        n.id === nodeId ? { ...n, size } : n,
      ),
    };
    this._emit("node:resized", { nodeId, size });
    this._afterChange();
  }

  updateNode(nodeId: string, updates: Partial<DiagramNode>): void {
    this._snapshot("Update node");
    this._model = {
      ...this._model,
      nodes: this._model.nodes.map((n) =>
        n.id === nodeId ? { ...n, ...updates, id: nodeId } : n,
      ),
    };
    this._emit("node:updated", { nodeId, updates });
    this._afterChange();
  }

  // ─── Edge Operations ──────────────────────────────────────────

  addEdge(input: Partial<DiagramEdge> & { source: string; target: string }): DiagramEdge {
    const edge = createEdge(input);
    this._snapshot("Add edge");
    this._model = {
      ...this._model,
      edges: [...this._model.edges, edge],
    };
    this._emit("edge:added", edge);
    this._afterChange();
    return edge;
  }

  removeEdge(edgeId: string): void {
    this._snapshot("Remove edge");
    this._model = {
      ...this._model,
      edges: this._model.edges.filter((e) => e.id !== edgeId),
    };
    this._selection.delete(edgeId);
    this._emit("edge:removed", { edgeId });
    this._afterChange();
  }

  updateEdge(edgeId: string, updates: Partial<DiagramEdge>): void {
    this._snapshot("Update edge");
    this._model = {
      ...this._model,
      edges: this._model.edges.map((e) =>
        e.id === edgeId ? { ...e, ...updates, id: edgeId } : e,
      ),
    };
    this._emit("edge:updated", { edgeId, updates });
    this._afterChange();
  }

  // ─── Group Operations ─────────────────────────────────────────

  addGroup(input?: Partial<DiagramGroup>): DiagramGroup {
    const group = createGroup(input);
    this._snapshot("Add group");
    this._model = {
      ...this._model,
      groups: [...this._model.groups, group],
    };
    this._emit("group:added", group);
    this._afterChange();
    return group;
  }

  removeGroup(groupId: string): void {
    this._snapshot("Remove group");
    // Unparent all nodes in this group
    this._model = {
      ...this._model,
      nodes: this._model.nodes.map((n) =>
        n.groupId === groupId ? { ...n, groupId: undefined } : n,
      ),
      groups: this._model.groups.filter((g) => g.id !== groupId),
    };
    this._emit("group:removed", { groupId });
    this._afterChange();
  }

  assignNodeToGroup(nodeId: string, groupId: string | undefined): void {
    this._snapshot("Assign node to group");
    this._model = {
      ...this._model,
      nodes: this._model.nodes.map((n) =>
        n.id === nodeId ? { ...n, groupId } : n,
      ),
    };
    this._emit("node:updated", { nodeId, updates: { groupId } });
    this._afterChange();
  }

  // ─── Batch Operations ─────────────────────────────────────────

  batch(label: string, fn: (engine: DiagramEngine) => void): void {
    this._batchDepth++;
    if (this._batchDepth === 1) {
      this._snapshot(label);
    }
    try {
      fn(this);
    } finally {
      this._batchDepth--;
      if (this._batchDepth === 0) {
        this._afterChange();
      }
    }
  }

  // ─── Replace Entire Model ─────────────────────────────────────

  replaceModel(model: DiagramModel): void {
    this._snapshot("Replace model");
    this._model = DiagramModelSchema.parse(model);
    this._selection.clear();
    this._emit("model:changed", null);
    this._afterChange();
  }

  // ─── Selection ────────────────────────────────────────────────

  select(ids: string[]): void {
    this._selection = new Set(ids);
    this._emit("selection:changed", { ids });
  }

  clearSelection(): void {
    this._selection.clear();
    this._emit("selection:changed", { ids: [] });
  }

  toggleSelection(id: string): void {
    if (this._selection.has(id)) {
      this._selection.delete(id);
    } else {
      this._selection.add(id);
    }
    this._emit("selection:changed", { ids: Array.from(this._selection) });
  }

  getSelection(): string[] {
    return Array.from(this._selection);
  }

  // ─── History ──────────────────────────────────────────────────

  undo(): boolean {
    const entry = this._undoStack.pop();
    if (!entry) return false;

    // Save current state to redo
    this._redoStack.push({
      label: "Redo",
      snapshot: JSON.stringify(this._model),
      timestamp: Date.now(),
    });

    this._model = JSON.parse(entry.snapshot);
    this._validate();
    this._emit("model:changed", null);
    this._emit("history:changed", {
      canUndo: this._undoStack.length > 0,
      canRedo: this._redoStack.length > 0,
    });
    return true;
  }

  redo(): boolean {
    const entry = this._redoStack.pop();
    if (!entry) return false;

    this._undoStack.push({
      label: "Undo",
      snapshot: JSON.stringify(this._model),
      timestamp: Date.now(),
    });

    this._model = JSON.parse(entry.snapshot);
    this._validate();
    this._emit("model:changed", null);
    this._emit("history:changed", {
      canUndo: this._undoStack.length > 0,
      canRedo: this._redoStack.length > 0,
    });
    return true;
  }

  canUndo(): boolean {
    return this._undoStack.length > 0;
  }

  canRedo(): boolean {
    return this._redoStack.length > 0;
  }

  // ─── Events ───────────────────────────────────────────────────

  on(type: EngineEventType | "*", handler: EventHandler): Unsubscribe {
    const key = type;
    if (!this._listeners.has(key)) {
      this._listeners.set(key, new Set());
    }
    this._listeners.get(key)!.add(handler);
    return () => {
      this._listeners.get(key)?.delete(handler);
    };
  }

  // ─── Serialization ────────────────────────────────────────────

  toJSON(): DiagramModel {
    return structuredClone(this._model);
  }

  static fromJSON(json: unknown): DiagramEngine {
    const model = DiagramModelSchema.parse(json);
    return new DiagramEngine({ model });
  }

  // ─── Internals ────────────────────────────────────────────────

  private _snapshot(label: string): void {
    if (this._batchDepth > 0) return;

    this._undoStack.push({
      label,
      snapshot: JSON.stringify(this._model),
      timestamp: Date.now(),
    });
    this._redoStack = [];

    if (this._undoStack.length > this._maxHistory) {
      this._undoStack.shift();
    }
  }

  private _afterChange(): void {
    if (this._batchDepth > 0) return;
    this._validate();
    this._emit("model:changed", null);
    this._emit("history:changed", {
      canUndo: this._undoStack.length > 0,
      canRedo: this._redoStack.length > 0,
    });
  }

  private _validate(): void {
    this._issues = this._validators.flatMap((v) => v(this._model));
    this._emit("validation:changed", { issues: this._issues });
  }

  private _emit(type: EngineEventType, payload: unknown): void {
    const event: EngineEvent = { type, payload, timestamp: Date.now() };

    this._listeners.get(type)?.forEach((h) => h(event));
    this._listeners.get("*")?.forEach((h) => h(event));
  }
}

// ═══════════════════════════════════════════════════════════════════
// Built-in Validators
// ═══════════════════════════════════════════════════════════════════

export function defaultValidator(model: DiagramModel): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodeIds = new Set(model.nodes.map((n) => n.id));

  // Check for duplicate node IDs
  const seenNodeIds = new Set<string>();
  for (const node of model.nodes) {
    if (seenNodeIds.has(node.id)) {
      issues.push({
        severity: "error",
        code: "duplicate-node-id",
        message: `Duplicate node ID: "${node.id}"`,
        nodeId: node.id,
      });
    }
    seenNodeIds.add(node.id);
  }

  // Check for duplicate edge IDs
  const seenEdgeIds = new Set<string>();
  for (const edge of model.edges) {
    if (seenEdgeIds.has(edge.id)) {
      issues.push({
        severity: "error",
        code: "duplicate-edge-id",
        message: `Duplicate edge ID: "${edge.id}"`,
        edgeId: edge.id,
      });
    }
    seenEdgeIds.add(edge.id);
  }

  // Check edges reference valid nodes
  for (const edge of model.edges) {
    if (!nodeIds.has(edge.source)) {
      issues.push({
        severity: "error",
        code: "dangling-edge-source",
        message: `Edge "${edge.id}" references non-existent source node "${edge.source}"`,
        edgeId: edge.id,
      });
    }
    if (!nodeIds.has(edge.target)) {
      issues.push({
        severity: "error",
        code: "dangling-edge-target",
        message: `Edge "${edge.id}" references non-existent target node "${edge.target}"`,
        edgeId: edge.id,
      });
    }
  }

  // Check group references
  const groupIds = new Set(model.groups.map((g) => g.id));
  for (const node of model.nodes) {
    if (node.groupId && !groupIds.has(node.groupId)) {
      issues.push({
        severity: "warning",
        code: "dangling-group-ref",
        message: `Node "${node.id}" references non-existent group "${node.groupId}"`,
        nodeId: node.id,
      });
    }
  }

  // Check for orphan nodes (no connections) — info only
  for (const node of model.nodes) {
    const hasConnection = model.edges.some(
      (e) => e.source === node.id || e.target === node.id,
    );
    if (!hasConnection && model.nodes.length > 1) {
      issues.push({
        severity: "info",
        code: "orphan-node",
        message: `Node "${node.label || node.id}" has no connections`,
        nodeId: node.id,
      });
    }
  }

  // Port connection validation
  for (const edge of model.edges) {
    if (edge.sourcePort) {
      const sourceNode = model.nodes.find((n) => n.id === edge.source);
      if (sourceNode && !sourceNode.ports.some((p) => p.id === edge.sourcePort)) {
        issues.push({
          severity: "warning",
          code: "invalid-source-port",
          message: `Edge "${edge.id}" references non-existent source port "${edge.sourcePort}"`,
          edgeId: edge.id,
        });
      }
    }
    if (edge.targetPort) {
      const targetNode = model.nodes.find((n) => n.id === edge.target);
      if (targetNode && !targetNode.ports.some((p) => p.id === edge.targetPort)) {
        issues.push({
          severity: "warning",
          code: "invalid-target-port",
          message: `Edge "${edge.id}" references non-existent target port "${edge.targetPort}"`,
          edgeId: edge.id,
        });
      }
    }
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════════

export function createEngine(options?: DiagramEngineOptions): DiagramEngine {
  return new DiagramEngine(options);
}
