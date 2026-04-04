/**
 * Grid Layout
 *
 * Arranges nodes in a regular grid. Useful for:
 *   - Icon/shape galleries
 *   - Thumbnail grids
 *   - Simple node arrangements
 *
 * Auto-computes column count to approximate a square aspect ratio.
 */

import type {
  LayoutAlgorithmPlugin,
  LayoutGraph,
  LayoutOptions,
  LayoutResult,
  LayoutNodeResult,
} from "./types";

export interface GridLayoutOptions extends LayoutOptions {
  /** Fixed number of columns (auto-computed if not specified) */
  columns?: number;
}

export function createGridLayout(): LayoutAlgorithmPlugin {
  return {
    name: "grid",
    displayName: "Grid",
    apply(graph: LayoutGraph, options: LayoutOptions): LayoutResult {
      const opts = options as GridLayoutOptions;

      if (graph.nodes.length === 0) {
        return { nodes: [], groups: [], bounds: { x: 0, y: 0, width: 0, height: 0 } };
      }

      const nodeSpacing = opts.nodeSpacing ?? 40;
      const offsetX = opts.offsetX ?? 40;
      const offsetY = opts.offsetY ?? 40;

      // Auto columns: approximate square
      const columns = opts.columns ?? Math.ceil(Math.sqrt(graph.nodes.length));

      // Find max cell size (uniform grid)
      let maxW = 0, maxH = 0;
      for (const node of graph.nodes) {
        maxW = Math.max(maxW, node.width);
        maxH = Math.max(maxH, node.height);
      }

      const cellW = maxW + nodeSpacing;
      const cellH = maxH + nodeSpacing;

      const results: LayoutNodeResult[] = [];
      let maxX = 0, maxY = 0;

      for (let i = 0; i < graph.nodes.length; i++) {
        const node = graph.nodes[i];
        const col = i % columns;
        const row = Math.floor(i / columns);

        // Center node within cell
        const x = offsetX + col * cellW + (maxW - node.width) / 2;
        const y = offsetY + row * cellH + (maxH - node.height) / 2;

        results.push({ id: node.id, x, y });
        maxX = Math.max(maxX, x + node.width);
        maxY = Math.max(maxY, y + node.height);
      }

      return {
        nodes: results,
        groups: [],
        bounds: {
          x: offsetX,
          y: offsetY,
          width: maxX - offsetX,
          height: maxY - offsetY,
        },
      };
    },
  };
}
