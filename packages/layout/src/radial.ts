/**
 * Radial Layout
 *
 * Positions nodes in concentric rings based on distance from root.
 * Ring 0 = root(s), Ring 1 = direct children, Ring 2 = grandchildren, etc.
 *
 * Good for: stakeholder maps, influence diagrams, dependency networks.
 */

import type {
  LayoutAlgorithmPlugin,
  LayoutGraph,
  LayoutOptions,
  LayoutResult,
  LayoutNodeResult,
} from "./types";

export interface RadialLayoutOptions extends LayoutOptions {
  /** Base ring radius. Default: 160 */
  ringSpacing?: number;
}

export function createRadialLayout(): LayoutAlgorithmPlugin {
  return {
    name: "radial",
    displayName: "Radial",
    apply(graph: LayoutGraph, options: LayoutOptions): LayoutResult {
      const opts = options as RadialLayoutOptions;

      if (graph.nodes.length === 0) {
        return { nodes: [], groups: [], bounds: { x: 0, y: 0, width: 0, height: 0 } };
      }

      const ringSpacing = opts.ringSpacing ?? 160;
      const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

      // BFS to assign levels
      const children = new Map<string, string[]>();
      const hasParent = new Set<string>();
      for (const n of graph.nodes) children.set(n.id, []);
      for (const e of graph.edges) {
        if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
          children.get(e.source)!.push(e.target);
          hasParent.add(e.target);
        }
      }

      const roots = graph.nodes.filter((n) => !hasParent.has(n.id));
      if (roots.length === 0 && graph.nodes.length > 0) roots.push(graph.nodes[0]);

      // BFS
      const levels = new Map<string, number>();
      const queue: string[] = [];
      for (const r of roots) {
        levels.set(r.id, 0);
        queue.push(r.id);
      }

      while (queue.length > 0) {
        const current = queue.shift()!;
        const level = levels.get(current)!;
        for (const child of children.get(current) ?? []) {
          if (!levels.has(child)) {
            levels.set(child, level + 1);
            queue.push(child);
          }
        }
      }

      // Handle disconnected
      for (const n of graph.nodes) {
        if (!levels.has(n.id)) levels.set(n.id, 0);
      }

      // Group by level
      const maxLevel = Math.max(0, ...levels.values());
      const rings: string[][] = Array.from({ length: maxLevel + 1 }, () => []);
      for (const n of graph.nodes) {
        rings[levels.get(n.id)!].push(n.id);
      }

      // Center position
      const totalRadius = (maxLevel + 1) * ringSpacing;
      const cx = totalRadius + 80;
      const cy = totalRadius + 80;

      const results: LayoutNodeResult[] = [];

      for (let level = 0; level <= maxLevel; level++) {
        const ring = rings[level];
        if (ring.length === 0) continue;

        if (level === 0 && ring.length === 1) {
          // Center the root
          const node = nodeMap.get(ring[0])!;
          results.push({
            id: ring[0],
            x: cx - node.width / 2,
            y: cy - node.height / 2,
          });
          continue;
        }

        const radius = level * ringSpacing;
        const startAngle = -Math.PI / 2;

        for (let i = 0; i < ring.length; i++) {
          const node = nodeMap.get(ring[i])!;
          const angle = startAngle + (2 * Math.PI * i) / ring.length;
          results.push({
            id: ring[i],
            x: cx + radius * Math.cos(angle) - node.width / 2,
            y: cy + radius * Math.sin(angle) - node.height / 2,
          });
        }
      }

      // Bounds
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const pos of results) {
        const node = nodeMap.get(pos.id)!;
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + node.width);
        maxY = Math.max(maxY, pos.y + node.height);
      }

      return {
        nodes: results,
        groups: [],
        bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
      };
    },
  };
}
