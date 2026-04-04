/**
 * Circular Layout
 *
 * Arranges nodes in a circle. Useful for:
 *   - Dependency cycles
 *   - Network rings
 *   - Stakeholder maps
 *
 * Options:
 *   - startAngle: where to begin placing nodes (radians)
 *   - radius: explicit radius, or auto-computed from node count
 */

import type {
  LayoutAlgorithmPlugin,
  LayoutGraph,
  LayoutOptions,
  LayoutResult,
  LayoutNodeResult,
} from "./types";

export interface CircularLayoutOptions extends LayoutOptions {
  startAngle?: number;
  radius?: number;
}

export function createCircularLayout(): LayoutAlgorithmPlugin {
  return {
    name: "circular",
    displayName: "Circular",
    apply(graph: LayoutGraph, options: LayoutOptions): LayoutResult {
      const opts = options as CircularLayoutOptions;

      if (graph.nodes.length === 0) {
        return { nodes: [], groups: [], bounds: { x: 0, y: 0, width: 0, height: 0 } };
      }

      const startAngle = opts.startAngle ?? -Math.PI / 2; // top
      const offsetX = opts.offsetX ?? 40;
      const offsetY = opts.offsetY ?? 40;

      // Auto-compute radius based on node sizes
      const avgSize = graph.nodes.reduce(
        (sum, n) => sum + Math.max(n.width, n.height),
        0,
      ) / graph.nodes.length;

      const circumference = graph.nodes.length * (avgSize + (opts.nodeSpacing ?? 40));
      const autoRadius = Math.max(120, circumference / (2 * Math.PI));
      const radius = opts.radius ?? autoRadius;

      const centerX = offsetX + radius;
      const centerY = offsetY + radius;

      const results: LayoutNodeResult[] = [];
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      for (let i = 0; i < graph.nodes.length; i++) {
        const node = graph.nodes[i];
        const angle = startAngle + (2 * Math.PI * i) / graph.nodes.length;
        const x = centerX + radius * Math.cos(angle) - node.width / 2;
        const y = centerY + radius * Math.sin(angle) - node.height / 2;

        results.push({ id: node.id, x, y });
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + node.width);
        maxY = Math.max(maxY, y + node.height);
      }

      return {
        nodes: results,
        groups: [],
        bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
      };
    },
  };
}
