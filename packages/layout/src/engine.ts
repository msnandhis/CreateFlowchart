/**
 * Layout Engine — Orchestrator
 *
 * Central registry for layout algorithms. Takes a DiagramModel,
 * looks up the algorithm from model.layout.algorithm, runs it,
 * and returns a copy of the model with updated positions.
 *
 * Usage:
 *   const engine = createLayoutEngine();
 *   const result = engine.applyLayout(model);
 *   // result is a DiagramModel with updated node/group positions
 */

import type { DiagramModel } from "@createflowchart/schema";
import type {
  LayoutAlgorithmPlugin,
  LayoutOptions,
  LayoutResult,
  LayoutGraph,
} from "./types";
import { modelToLayoutGraph, applyLayoutResult } from "./types";

// Built-in algorithms
import { createLayeredDigraphLayout } from "./layered-digraph";
import { createTreeLayout } from "./tree";
import { createForceDirectedLayout } from "./force-directed";
import { createCircularLayout } from "./circular";
import { createGridLayout } from "./grid";
import { createRadialLayout } from "./radial";

// ═══════════════════════════════════════════════════════════════════
// Layout Engine
// ═══════════════════════════════════════════════════════════════════

export interface LayoutEngine {
  /** Register a custom algorithm plugin */
  register(plugin: LayoutAlgorithmPlugin): void;

  /** List all available algorithm names */
  list(): string[];

  /** Get a specific algorithm by name */
  get(name: string): LayoutAlgorithmPlugin | undefined;

  /** Apply layout to a DiagramModel using its layout.algorithm setting */
  applyLayout(model: DiagramModel, overrides?: Partial<LayoutOptions>): DiagramModel;

  /** Apply a specific algorithm to a DiagramModel (ignores model.layout.algorithm) */
  applyAlgorithm(
    algorithmName: string,
    model: DiagramModel,
    options?: LayoutOptions,
  ): DiagramModel;

  /** Run a layout algorithm on a raw LayoutGraph (advanced) */
  run(algorithmName: string, graph: LayoutGraph, options?: LayoutOptions): LayoutResult;
}

export function createLayoutEngine(): LayoutEngine {
  const plugins = new Map<string, LayoutAlgorithmPlugin>();

  // Register built-ins
  const builtins = [
    createLayeredDigraphLayout(),
    createTreeLayout(),
    createForceDirectedLayout(),
    createCircularLayout(),
    createGridLayout(),
    createRadialLayout(),
  ];

  for (const plugin of builtins) {
    plugins.set(plugin.name, plugin);
  }

  function getAlgorithm(name: string): LayoutAlgorithmPlugin {
    const algo = plugins.get(name);
    if (!algo) {
      throw new Error(
        `Unknown layout algorithm "${name}". Available: ${[...plugins.keys()].join(", ")}`,
      );
    }
    return algo;
  }

  return {
    register(plugin) {
      plugins.set(plugin.name, plugin);
    },

    list() {
      return [...plugins.keys()];
    },

    get(name) {
      return plugins.get(name);
    },

    applyLayout(model, overrides) {
      const algorithmName = model.layout?.algorithm ?? "layered-digraph";

      // "manual" means skip auto-layout
      if (algorithmName === "manual") return model;

      const options: LayoutOptions = {
        direction: model.layout?.direction as LayoutOptions["direction"],
        nodeSpacing: model.layout?.nodeSpacing,
        layerSpacing: model.layout?.layerSpacing,
        ...overrides,
      };

      const graph = modelToLayoutGraph(model);
      const algo = getAlgorithm(algorithmName);
      const result = algo.apply(graph, options);
      return applyLayoutResult(model, result);
    },

    applyAlgorithm(algorithmName, model, options) {
      if (algorithmName === "manual") return model;

      const graph = modelToLayoutGraph(model);
      const algo = getAlgorithm(algorithmName);
      const result = algo.apply(graph, options ?? {});
      return applyLayoutResult(model, result);
    },

    run(algorithmName, graph, options) {
      const algo = getAlgorithm(algorithmName);
      return algo.apply(graph, options ?? {});
    },
  };
}
