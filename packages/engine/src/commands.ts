import type {
  DiagramAnnotation,
  DiagramContainer,
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
} from "@createflowchart/schema";
import { withCommittedChange } from "./history";
import type { EngineSelection, EngineState } from "./types";

function replaceMetadataTimestamp(document: DiagramDocument): DiagramDocument {
  return {
    ...document,
    metadata: {
      ...document.metadata,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function setSelection(
  state: EngineState,
  selection: Partial<EngineSelection>,
): EngineState {
  return {
    ...state,
    selection: {
      ...state.selection,
      ...selection,
    },
  };
}

export function setDocumentTitle(state: EngineState, title: string): EngineState {
  const nextDocument = replaceMetadataTimestamp({
    ...state.document,
    metadata: {
      ...state.document.metadata,
      title,
    },
  });

  return withCommittedChange(state, nextDocument);
}

export function addNode(state: EngineState, node: DiagramNode): EngineState {
  const nextDocument = replaceMetadataTimestamp({
    ...state.document,
    nodes: [...state.document.nodes, node],
  });

  return withCommittedChange(state, nextDocument, {
    ...state.selection,
    nodeIds: [node.id],
    edgeIds: [],
    containerIds: [],
    annotationIds: [],
  });
}

export function updateNode(
  state: EngineState,
  nodeId: string,
  updater: (node: DiagramNode) => DiagramNode,
): EngineState {
  const nextDocument = replaceMetadataTimestamp({
    ...state.document,
    nodes: state.document.nodes.map((node) =>
      node.id === nodeId ? updater(node) : node,
    ),
  });

  return withCommittedChange(state, nextDocument);
}

export function removeNode(state: EngineState, nodeId: string): EngineState {
  const nextDocument = replaceMetadataTimestamp({
    ...state.document,
    nodes: state.document.nodes.filter((node) => node.id !== nodeId),
    edges: state.document.edges.filter(
      (edge) => edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId,
    ),
    containers: state.document.containers.map((container) => ({
      ...container,
      childNodeIds: container.childNodeIds.filter((id) => id !== nodeId),
    })),
  });

  return withCommittedChange(state, nextDocument, {
    ...state.selection,
    nodeIds: state.selection.nodeIds.filter((id) => id !== nodeId),
    edgeIds: [],
  });
}

export function addEdge(state: EngineState, edge: DiagramEdge): EngineState {
  const nextDocument = replaceMetadataTimestamp({
    ...state.document,
    edges: [...state.document.edges, edge],
  });

  return withCommittedChange(state, nextDocument, {
    ...state.selection,
    nodeIds: [],
    edgeIds: [edge.id],
    containerIds: [],
    annotationIds: [],
  });
}

export function updateEdge(
  state: EngineState,
  edgeId: string,
  updater: (edge: DiagramEdge) => DiagramEdge,
): EngineState {
  const nextDocument = replaceMetadataTimestamp({
    ...state.document,
    edges: state.document.edges.map((edge) =>
      edge.id === edgeId ? updater(edge) : edge,
    ),
  });

  return withCommittedChange(state, nextDocument);
}

export function removeEdge(state: EngineState, edgeId: string): EngineState {
  const nextDocument = replaceMetadataTimestamp({
    ...state.document,
    edges: state.document.edges.filter((edge) => edge.id !== edgeId),
  });

  return withCommittedChange(state, nextDocument, {
    ...state.selection,
    edgeIds: state.selection.edgeIds.filter((id) => id !== edgeId),
  });
}

export function addContainer(
  state: EngineState,
  container: DiagramContainer,
): EngineState {
  const nextDocument = replaceMetadataTimestamp({
    ...state.document,
    containers: [...state.document.containers, container],
  });

  return withCommittedChange(state, nextDocument, {
    ...state.selection,
    nodeIds: [],
    edgeIds: [],
    containerIds: [container.id],
    annotationIds: [],
  });
}

export function updateContainer(
  state: EngineState,
  containerId: string,
  updater: (container: DiagramContainer) => DiagramContainer,
): EngineState {
  const nextDocument = replaceMetadataTimestamp({
    ...state.document,
    containers: state.document.containers.map((container) =>
      container.id === containerId ? updater(container) : container,
    ),
  });

  return withCommittedChange(state, nextDocument);
}

export function removeContainer(state: EngineState, containerId: string): EngineState {
  const nextDocument = replaceMetadataTimestamp({
    ...state.document,
    containers: state.document.containers.filter(
      (container) => container.id !== containerId,
    ),
  });

  return withCommittedChange(state, nextDocument, {
    ...state.selection,
    containerIds: state.selection.containerIds.filter((id) => id !== containerId),
  });
}

export function addAnnotation(
  state: EngineState,
  annotation: DiagramAnnotation,
): EngineState {
  const nextDocument = replaceMetadataTimestamp({
    ...state.document,
    annotations: [...state.document.annotations, annotation],
  });

  return withCommittedChange(state, nextDocument, {
    ...state.selection,
    nodeIds: [],
    edgeIds: [],
    containerIds: [],
    annotationIds: [annotation.id],
  });
}

export function replaceDocument(
  state: EngineState,
  document: DiagramDocument,
): EngineState {
  return withCommittedChange(state, replaceMetadataTimestamp(document));
}
