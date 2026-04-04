/**
 * Force-Directed Layout (Fruchterman-Reingold)
 *
 * For undirected/cyclic graphs: network diagrams, concept maps.
 * Physics simulation:
 *   - Nodes repel each other (Coulomb's law)
 *   - Edges act as springs (Hooke's law)
 *   - Temperature-based cooling for convergence
 *
 * Pure TypeScript, no external deps.
 */

import type {
  LayoutAlgorithmPlugin,
  LayoutGraph,
  LayoutOptions,
  LayoutResult,
  LayoutNodeResult,
} from "./types";

export interface ForceDirectedOptions extends LayoutOptions {
  /** Repulsion strength (Coulomb constant). Higher = nodes push further apart. Default: 8000 */
  repulsion?: number;
  /** Spring strength (Hooke constant). Higher = connected nodes pull closer. Default: 0.04 */
  attraction?: number;
  /** Number of simulation iterations. Default: 300 */
  iterations?: number;
  /** Ideal edge length. Default: 200 */
  idealEdgeLength?: number;
  /** Damping factor per iteration. Default: 0.95 */
  cooling?: number;
}

export function createForceDirectedLayout(): LayoutAlgorithmPlugin {
  return {
    name: "force-directed",
    displayName: "Force-Directed",
    apply(graph: LayoutGraph, options: LayoutOptions): LayoutResult {
      const opts = options as ForceDirectedOptions;

      if (graph.nodes.length === 0) {
        return { nodes: [], groups: [], bounds: { x: 0, y: 0, width: 0, height: 0 } };
      }

      if (graph.nodes.length === 1) {
        const n = graph.nodes[0];
        const x = opts.offsetX ?? 40;
        const y = opts.offsetY ?? 40;
        return {
          nodes: [{ id: n.id, x, y }],
          groups: [],
          bounds: { x, y, width: n.width, height: n.height },
        };
      }

      const repulsion = opts.repulsion ?? 8000;
      const attraction = opts.attraction ?? 0.04;
      const iterations = opts.iterations ?? 300;
      const idealLength = opts.idealEdgeLength ?? 200;
      const cooling = opts.cooling ?? 0.95;
      const offsetX = opts.offsetX ?? 40;
      const offsetY = opts.offsetY ?? 40;

      // Initialize positions in a circle
      const positions = new Map<string, { x: number; y: number }>();
      const radius = Math.max(200, graph.nodes.length * 30);
      for (let i = 0; i < graph.nodes.length; i++) {
        const angle = (2 * Math.PI * i) / graph.nodes.length;
        positions.set(graph.nodes[i].id, {
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle),
        });
      }

      // Build adjacency set for fast lookup
      const adjacency = new Set<string>();
      for (const edge of graph.edges) {
        adjacency.add(`${edge.source}→${edge.target}`);
        adjacency.add(`${edge.target}→${edge.source}`);
      }

      // Simulation
      let temperature = idealLength * 2;

      for (let iter = 0; iter < iterations; iter++) {
        const forces = new Map<string, { fx: number; fy: number }>();
        for (const node of graph.nodes) {
          forces.set(node.id, { fx: 0, fy: 0 });
        }

        // Repulsive forces (every pair)
        for (let i = 0; i < graph.nodes.length; i++) {
          for (let j = i + 1; j < graph.nodes.length; j++) {
            const a = graph.nodes[i];
            const b = graph.nodes[j];
            const pa = positions.get(a.id)!;
            const pb = positions.get(b.id)!;

            let dx = pa.x - pb.x;
            let dy = pa.y - pb.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 1) { dx = 1; dy = 0; dist = 1; }

            const force = repulsion / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            const fa = forces.get(a.id)!;
            const fb = forces.get(b.id)!;
            fa.fx += fx;
            fa.fy += fy;
            fb.fx -= fx;
            fb.fy -= fy;
          }
        }

        // Attractive forces (edges)
        for (const edge of graph.edges) {
          const pa = positions.get(edge.source);
          const pb = positions.get(edge.target);
          if (!pa || !pb) continue;

          let dx = pa.x - pb.x;
          let dy = pa.y - pb.y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1) dist = 1;

          const force = attraction * (dist - idealLength);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          const fa = forces.get(edge.source)!;
          const fb = forces.get(edge.target)!;
          fa.fx -= fx;
          fa.fy -= fy;
          fb.fx += fx;
          fb.fy += fy;
        }

        // Apply forces with temperature clamping
        for (const node of graph.nodes) {
          const pos = positions.get(node.id)!;
          const f = forces.get(node.id)!;

          let mag = Math.sqrt(f.fx * f.fx + f.fy * f.fy);
          if (mag < 0.01) mag = 0.01;

          const clampedMag = Math.min(mag, temperature);
          pos.x += (f.fx / mag) * clampedMag;
          pos.y += (f.fy / mag) * clampedMag;
        }

        temperature *= cooling;
      }

      // Normalize positions (shift to positive, add offset)
      let minX = Infinity, minY = Infinity;
      for (const pos of positions.values()) {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
      }

      const results: LayoutNodeResult[] = [];
      let maxX = -Infinity, maxY = -Infinity;

      for (const node of graph.nodes) {
        const pos = positions.get(node.id)!;
        const x = pos.x - minX + offsetX;
        const y = pos.y - minY + offsetY;
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
