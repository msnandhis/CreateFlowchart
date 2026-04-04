/**
 * Tree Layout
 *
 * For hierarchical structures: org charts, file trees, mindmaps.
 * Uses a modified Reingold-Tilford algorithm:
 *   1. Find root(s) — nodes with no incoming edges
 *   2. Build tree structure
 *   3. Recursive bottom-up sizing
 *   4. Top-down positioning with subtree centering
 *
 * Handles forests (multiple roots) by laying them side-by-side.
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

interface TreeNode {
  id: string;
  width: number;
  height: number;
  children: TreeNode[];
  /** Subtree width (cross-axis) */
  subtreeSpan: number;
}

export function createTreeLayout(): LayoutAlgorithmPlugin {
  return {
    name: "tree",
    displayName: "Tree",
    apply(graph: LayoutGraph, options: LayoutOptions): LayoutResult {
      if (graph.nodes.length === 0) {
        return { nodes: [], groups: [], bounds: { x: 0, y: 0, width: 0, height: 0 } };
      }

      const direction = options.direction ?? "TB";
      const nodeSpacing = options.nodeSpacing ?? 40;
      const layerSpacing = options.layerSpacing ?? 80;
      const offsetX = options.offsetX ?? 40;
      const offsetY = options.offsetY ?? 40;

      const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

      // Build children map
      const children = new Map<string, string[]>();
      const hasParent = new Set<string>();

      for (const node of graph.nodes) {
        children.set(node.id, []);
      }
      for (const edge of graph.edges) {
        if (nodeMap.has(edge.source) && nodeMap.has(edge.target)) {
          children.get(edge.source)!.push(edge.target);
          hasParent.add(edge.target);
        }
      }

      // Find roots
      const roots = graph.nodes.filter((n) => !hasParent.has(n.id));
      if (roots.length === 0 && graph.nodes.length > 0) {
        roots.push(graph.nodes[0]);
      }

      // Build tree structures (handle visited to avoid cycles)
      const visited = new Set<string>();
      function buildTree(nodeId: string): TreeNode | null {
        if (visited.has(nodeId)) return null;
        visited.add(nodeId);

        const node = nodeMap.get(nodeId)!;
        const childNodes: TreeNode[] = [];
        for (const childId of children.get(nodeId) ?? []) {
          const child = buildTree(childId);
          if (child) childNodes.push(child);
        }

        return {
          id: nodeId,
          width: node.width,
          height: node.height,
          children: childNodes,
          subtreeSpan: 0, // computed below
        };
      }

      const trees: TreeNode[] = [];
      for (const root of roots) {
        const tree = buildTree(root.id);
        if (tree) trees.push(tree);
      }

      // Add disconnected nodes
      for (const node of graph.nodes) {
        if (!visited.has(node.id)) {
          trees.push({
            id: node.id,
            width: node.width,
            height: node.height,
            children: [],
            subtreeSpan: 0,
          });
        }
      }

      const isHorizontal = direction === "LR" || direction === "RL";

      // Compute subtree spans (bottom-up)
      function computeSpan(tree: TreeNode): number {
        const selfSpan = isHorizontal ? tree.height : tree.width;

        if (tree.children.length === 0) {
          tree.subtreeSpan = selfSpan;
          return selfSpan;
        }

        let totalChildSpan = 0;
        for (let i = 0; i < tree.children.length; i++) {
          totalChildSpan += computeSpan(tree.children[i]);
          if (i < tree.children.length - 1) totalChildSpan += nodeSpacing;
        }

        tree.subtreeSpan = Math.max(selfSpan, totalChildSpan);
        return tree.subtreeSpan;
      }

      // Position nodes (top-down)
      const positions: LayoutNodeResult[] = [];

      function positionTree(
        tree: TreeNode,
        mainStart: number,
        crossStart: number,
      ): void {
        const selfSpan = isHorizontal ? tree.height : tree.width;
        const selfMain = isHorizontal ? tree.width : tree.height;

        // Center self within subtree span
        const selfCross = crossStart + (tree.subtreeSpan - selfSpan) / 2;

        const x = isHorizontal ? mainStart : selfCross;
        const y = isHorizontal ? selfCross : mainStart;
        positions.push({ id: tree.id, x, y });

        // Position children
        const childMainStart = mainStart + selfMain + layerSpacing;
        let childCrossStart = crossStart;

        for (const child of tree.children) {
          positionTree(child, childMainStart, childCrossStart);
          childCrossStart += child.subtreeSpan + nodeSpacing;
        }
      }

      // Layout each tree (forest support)
      let forestCross = isHorizontal ? offsetY : offsetX;
      const forestMain = isHorizontal ? offsetX : offsetY;

      for (const tree of trees) {
        computeSpan(tree);
        positionTree(tree, forestMain, forestCross);
        forestCross += tree.subtreeSpan + nodeSpacing * 2;
      }

      // Apply direction reversal
      if (direction === "BT" || direction === "RL") {
        reversePositions(positions, nodeMap, direction);
      }

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

function reversePositions(
  positions: LayoutNodeResult[],
  nodeMap: Map<string, LayoutNode>,
  direction: LayoutDirectionType,
): void {
  // Find total extent in the main axis
  let maxMain = -Infinity;
  const isHorizontal = direction === "LR" || direction === "RL";

  for (const pos of positions) {
    const node = nodeMap.get(pos.id)!;
    const mainEnd = isHorizontal ? pos.x + node.width : pos.y + node.height;
    maxMain = Math.max(maxMain, mainEnd);
  }

  for (const pos of positions) {
    const node = nodeMap.get(pos.id)!;
    if (isHorizontal) {
      pos.x = maxMain - pos.x - node.width;
    } else {
      pos.y = maxMain - pos.y - node.height;
    }
  }
}
