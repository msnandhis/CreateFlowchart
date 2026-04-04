/**
 * Layout Engine — Types & Plugin Interface
 *
 * Every layout algorithm implements `LayoutAlgorithmPlugin`.
 * The engine applies the plugin to a graph, returning positioned nodes.
 * Algorithms are pure functions — no DOM, no side-effects.
 */

import type { DiagramModel, Point } from "@createflowchart/schema";

// ═══════════════════════════════════════════════════════════════════
// Graph Abstraction (internal, layout-friendly)
// ═══════════════════════════════════════════════════════════════════

export interface LayoutNode {
  id: string;
  width: number;
  height: number;
  /** Pre-existing position (used by "manual" to preserve, others may ignore) */
  position: Point;
  /** Group this node belongs to */
  groupId?: string;
}

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
}

export interface LayoutGroup {
  id: string;
  parentGroupId?: string;
}

export interface LayoutGraph {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  groups: LayoutGroup[];
}

// ═══════════════════════════════════════════════════════════════════
// Layout Result
// ═══════════════════════════════════════════════════════════════════

export interface LayoutNodeResult {
  id: string;
  x: number;
  y: number;
}

export interface LayoutGroupResult {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutResult {
  nodes: LayoutNodeResult[];
  groups: LayoutGroupResult[];
  /** Total bounds of the laid-out graph */
  bounds: { x: number; y: number; width: number; height: number };
}

// ═══════════════════════════════════════════════════════════════════
// Layout Options (shared across algorithms)
// ═══════════════════════════════════════════════════════════════════

export type LayoutDirectionType = "TB" | "BT" | "LR" | "RL";

export interface LayoutOptions {
  /** Flow direction */
  direction?: LayoutDirectionType;
  /** Space between sibling nodes */
  nodeSpacing?: number;
  /** Space between layers/ranks */
  layerSpacing?: number;
  /** Left/top offset for entire layout */
  offsetX?: number;
  offsetY?: number;
}

// ═══════════════════════════════════════════════════════════════════
// Plugin Interface
// ═══════════════════════════════════════════════════════════════════

export interface LayoutAlgorithmPlugin {
  /** Unique algorithm name */
  readonly name: string;
  /** Human-readable display name */
  readonly displayName: string;
  /** Run the layout on a graph */
  apply(graph: LayoutGraph, options: LayoutOptions): LayoutResult;
}

// ═══════════════════════════════════════════════════════════════════
// Helpers — Convert between DiagramModel and LayoutGraph
// ═══════════════════════════════════════════════════════════════════

export function modelToLayoutGraph(model: DiagramModel): LayoutGraph {
  return {
    nodes: model.nodes.map((n) => ({
      id: n.id,
      width: n.size.width,
      height: n.size.height,
      position: { ...n.position },
      groupId: n.groupId,
    })),
    edges: model.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    })),
    groups: model.groups.map((g) => ({
      id: g.id,
      parentGroupId: g.parentGroupId,
    })),
  };
}

export function applyLayoutResult(
  model: DiagramModel,
  result: LayoutResult,
): DiagramModel {
  const positionMap = new Map(result.nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
  const groupMap = new Map(
    result.groups.map((g) => [g.id, { x: g.x, y: g.y, width: g.width, height: g.height }]),
  );

  return {
    ...model,
    nodes: model.nodes.map((node) => {
      const pos = positionMap.get(node.id);
      if (!pos) return node;
      return { ...node, position: pos };
    }),
    groups: model.groups.map((group) => {
      const bounds = groupMap.get(group.id);
      if (!bounds) return group;
      return {
        ...group,
        position: { x: bounds.x, y: bounds.y },
        size: { width: bounds.width, height: bounds.height },
      };
    }),
  };
}
