/**
 * Layered Digraph Layout (Sugiyama-style)
 *
 * Classic algorithm for DAGs (flowcharts, BPMN, state machines):
 *   1. Topological sort → assign layers
 *   2. Minimize crossings (barycenter heuristic)
 *   3. Assign coordinates (center-aligned within layers)
 *
 * Time complexity: O(V + E) for layering, O(V * E) for crossing reduction.
 * No external dependencies — pure TypeScript.
 */

import type {
  LayoutAlgorithmPlugin,
  LayoutGraph,
  LayoutOptions,
  LayoutResult,
  LayoutNodeResult,
  LayoutNode,
  LayoutDirectionType,
} from "./types";

export function createLayeredDigraphLayout(): LayoutAlgorithmPlugin {
  return {
    name: "layered-digraph",
    displayName: "Layered Digraph",
    apply(graph: LayoutGraph, options: LayoutOptions): LayoutResult {
      if (graph.nodes.length === 0) {
        return { nodes: [], groups: [], bounds: { x: 0, y: 0, width: 0, height: 0 } };
      }

      const direction = options.direction ?? "TB";
      const nodeSpacing = options.nodeSpacing ?? 60;
      const layerSpacing = options.layerSpacing ?? 80;
      const offsetX = options.offsetX ?? 40;
      const offsetY = options.offsetY ?? 40;

      // Build adjacency
      const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
      const outEdges = new Map<string, string[]>();
      const inEdges = new Map<string, string[]>();
      for (const node of graph.nodes) {
        outEdges.set(node.id, []);
        inEdges.set(node.id, []);
      }
      for (const edge of graph.edges) {
        if (nodeMap.has(edge.source) && nodeMap.has(edge.target)) {
          outEdges.get(edge.source)!.push(edge.target);
          inEdges.get(edge.target)!.push(edge.source);
        }
      }

      // Step 1: Assign layers via longest-path
      const layers = assignLayers(graph.nodes, outEdges, inEdges);

      // Step 2: Order nodes within layers (crossing minimization)
      const orderedLayers = minimizeCrossings(layers, outEdges, inEdges);

      // Step 3: Assign coordinates
      const positions = assignCoordinates(
        orderedLayers,
        nodeMap,
        direction,
        nodeSpacing,
        layerSpacing,
        offsetX,
        offsetY,
      );

      // Compute bounds
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const pos of positions) {
        const node = nodeMap.get(pos.id)!;
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + node.width);
        maxY = Math.max(maxY, pos.y + node.height);
      }

      return {
        nodes: positions,
        groups: [],
        bounds: {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        },
      };
    },
  };
}

// ─── Layer Assignment (Longest Path) ────────────────────────────

function assignLayers(
  nodes: LayoutNode[],
  outEdges: Map<string, string[]>,
  inEdges: Map<string, string[]>,
): string[][] {
  const layerOf = new Map<string, number>();

  // Find roots (no incoming edges)
  const roots = nodes.filter((n) => (inEdges.get(n.id)?.length ?? 0) === 0);

  // If no root (cycle), pick first node
  if (roots.length === 0 && nodes.length > 0) {
    roots.push(nodes[0]);
  }

  // Top-down layer assignment from roots

  function topDownDfs(nodeId: string, depth: number): void {
    const current = layerOf.get(nodeId);
    if (current !== undefined && current >= depth) return;
    layerOf.set(nodeId, depth);

    for (const child of outEdges.get(nodeId) ?? []) {
      topDownDfs(child, depth + 1);
    }
  }

  for (const root of roots) {
    topDownDfs(root.id, 0);
  }

  // Handle disconnected nodes
  for (const node of nodes) {
    if (!layerOf.has(node.id)) {
      layerOf.set(node.id, 0);
    }
  }

  // Group into layers
  const maxLayer = Math.max(0, ...layerOf.values());
  const layers: string[][] = Array.from({ length: maxLayer + 1 }, () => []);
  for (const node of nodes) {
    const layer = layerOf.get(node.id) ?? 0;
    layers[layer].push(node.id);
  }

  return layers;
}

// ─── Crossing Minimization (Barycenter) ─────────────────────────

function minimizeCrossings(
  layers: string[][],
  outEdges: Map<string, string[]>,
  inEdges: Map<string, string[]>,
): string[][] {
  const result = layers.map((layer) => [...layer]);

  // Two-layer sweep (top-down then bottom-up), repeat
  for (let iteration = 0; iteration < 4; iteration++) {
    // Top-down sweep
    for (let i = 1; i < result.length; i++) {
      const prevPositions = new Map(result[i - 1].map((id, idx) => [id, idx]));
      result[i].sort((a, b) => {
        const aParents = inEdges.get(a) ?? [];
        const bParents = inEdges.get(b) ?? [];
        const aBary = barycenter(aParents, prevPositions);
        const bBary = barycenter(bParents, prevPositions);
        return aBary - bBary;
      });
    }

    // Bottom-up sweep
    for (let i = result.length - 2; i >= 0; i--) {
      const nextPositions = new Map(result[i + 1].map((id, idx) => [id, idx]));
      result[i].sort((a, b) => {
        const aChildren = outEdges.get(a) ?? [];
        const bChildren = outEdges.get(b) ?? [];
        const aBary = barycenter(aChildren, nextPositions);
        const bBary = barycenter(bChildren, nextPositions);
        return aBary - bBary;
      });
    }
  }

  return result;
}

function barycenter(neighbors: string[], positions: Map<string, number>): number {
  if (neighbors.length === 0) return 0;
  let sum = 0;
  let count = 0;
  for (const id of neighbors) {
    const pos = positions.get(id);
    if (pos !== undefined) {
      sum += pos;
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

// ─── Coordinate Assignment ──────────────────────────────────────

function assignCoordinates(
  layers: string[][],
  nodeMap: Map<string, LayoutNode>,
  direction: LayoutDirectionType,
  nodeSpacing: number,
  layerSpacing: number,
  offsetX: number,
  offsetY: number,
): LayoutNodeResult[] {
  const results: LayoutNodeResult[] = [];
  const isHorizontal = direction === "LR" || direction === "RL";
  const isReversed = direction === "BT" || direction === "RL";

  // Calculate max layer widths for centering
  const layerSizes: number[] = [];
  for (const layer of layers) {
    let totalSize = 0;
    for (let i = 0; i < layer.length; i++) {
      const node = nodeMap.get(layer[i])!;
      totalSize += isHorizontal ? node.height : node.width;
      if (i < layer.length - 1) totalSize += nodeSpacing;
    }
    layerSizes.push(totalSize);
  }

  const maxCrossSize = Math.max(1, ...layerSizes);

  let mainAxisPos = isReversed
    ? offsetY + (layers.length - 1) * layerSpacing + maxNodeMainSize(layers[layers.length - 1], nodeMap, isHorizontal)
    : isHorizontal ? offsetX : offsetY;

  for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
    const actualIdx = isReversed ? layers.length - 1 - layerIdx : layerIdx;
    const layer = layers[actualIdx];
    const layerCrossSize = layerSizes[actualIdx];

    // Center layer
    let crossPos = (isHorizontal ? offsetY : offsetX) + (maxCrossSize - layerCrossSize) / 2;

    // Max main-axis size in this layer (for spacing)
    let maxMainSize = 0;

    for (const nodeId of layer) {
      const node = nodeMap.get(nodeId)!;
      const mainSize = isHorizontal ? node.width : node.height;
      const crossSize = isHorizontal ? node.height : node.width;

      maxMainSize = Math.max(maxMainSize, mainSize);

      const x = isHorizontal ? mainAxisPos : crossPos;
      const y = isHorizontal ? crossPos : mainAxisPos;

      results.push({ id: nodeId, x, y });
      crossPos += crossSize + nodeSpacing;
    }

    if (isReversed) {
      mainAxisPos -= layerSpacing + maxMainSize;
    } else {
      mainAxisPos += maxMainSize + layerSpacing;
    }
  }

  return results;
}

function maxNodeMainSize(
  layer: string[] | undefined,
  nodeMap: Map<string, LayoutNode>,
  isHorizontal: boolean,
): number {
  if (!layer || layer.length === 0) return 64;
  return Math.max(...layer.map((id) => {
    const n = nodeMap.get(id);
    return n ? (isHorizontal ? n.width : n.height) : 64;
  }));
}
