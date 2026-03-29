import type { EngineSelection } from "./types";

export function clearSelection(): EngineSelection {
  return {
    nodeIds: [],
    edgeIds: [],
    containerIds: [],
    annotationIds: [],
  };
}

export function selectNode(id: string): EngineSelection {
  return {
    nodeIds: [id],
    edgeIds: [],
    containerIds: [],
    annotationIds: [],
  };
}

export function selectEdge(id: string): EngineSelection {
  return {
    nodeIds: [],
    edgeIds: [id],
    containerIds: [],
    annotationIds: [],
  };
}
