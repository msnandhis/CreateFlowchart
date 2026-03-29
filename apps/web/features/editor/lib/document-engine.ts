import type { FlowNode } from "@createflowchart/core";
import {
  addNode as addDocumentNode,
  addContainer as addDocumentContainer,
  clearSelection,
  createEngineState,
  redo as redoDocumentHistory,
  removeContainer as removeDocumentContainer,
  removeEdge as removeDocumentEdge,
  removeNode as removeDocumentNode,
  selectEdge,
  selectContainer,
  selectNode,
  setDocumentTitle,
  undo as undoDocumentHistory,
  updateContainer as updateDocumentContainer,
  updateEdge as updateDocumentEdge,
  updateNode as updateDocumentNode,
  replaceDocument as replaceEngineDocument,
  type EngineSelection,
  type EngineState,
} from "@createflowchart/engine";
import type {
  DiagramContainer,
  DiagramDocument,
  DiagramFamily,
  EdgeRouting,
  Marker,
} from "@createflowchart/schema";
import type { Edge, Node } from "@xyflow/react";
import {
  documentToFlowGraph,
  documentToReactFlow,
  reactFlowToDocument,
} from "./document-compat";
import { getPaletteItemByShapeId, getShapeDefinition } from "./flowchart-shapes";
import type { ActionConfig } from "@createflowchart/core";

export interface EditorProjection {
  engineState: EngineState;
  document: DiagramDocument;
  flowGraph: ReturnType<typeof documentToFlowGraph>;
  rfNodes: ReturnType<typeof documentToReactFlow>["nodes"];
  rfEdges: ReturnType<typeof documentToReactFlow>["edges"];
}

export function createEditorProjection(document: DiagramDocument): EditorProjection {
  const engineState = createEngineState(document);
  return projectEngineState(engineState);
}

export function projectEngineState(engineState: EngineState): EditorProjection {
  const document = engineState.document;
  const flowGraph = documentToFlowGraph(document);
  const { nodes, edges } = documentToReactFlow(document);

  return {
    engineState,
    document,
    flowGraph,
    rfNodes: nodes,
    rfEdges: edges,
  };
}

export function setEditorTitle(
  engineState: EngineState,
  title: string,
): EditorProjection {
  return projectEngineState(setDocumentTitle(engineState, title));
}

export function applyReactFlowProjection(
  engineState: EngineState,
  nodes: Node[],
  edges: Edge[],
): EditorProjection {
  const nextDocument = reactFlowToDocument(nodes, edges, engineState.document);
  return projectEngineState(createEngineState(nextDocument, engineState.history.limit));
}

export function addLegacyNode(
  engineState: EngineState,
  node: FlowNode,
): EditorProjection {
  const shapeId =
    typeof node.data.meta.shapeId === "string"
      ? node.data.meta.shapeId
      : undefined;
  const paletteItem = shapeId ? getPaletteItemByShapeId(shapeId) : null;
  const shapeDefinition = shapeId ? getShapeDefinition(shapeId) : null;

  const nextState = addDocumentNode(engineState, {
    id: node.id,
    family:
      asDiagramFamily(
        typeof node.data.meta.family === "string" ? node.data.meta.family : undefined,
      ) ??
      paletteItem?.family ??
      "flowchart",
    kind:
      (typeof node.data.meta.semanticKind === "string"
        ? node.data.meta.semanticKind
        : paletteItem?.kind) ??
      (node.type === "start"
        ? "start-event"
        : node.type === "end"
          ? "end-event"
          : node.type === "decision"
            ? "decision-gateway"
            : node.type === "action"
              ? "automation-task"
              : "process-step"),
    shape:
      shapeId ??
      (node.type === "decision"
        ? "decision"
        : node.type === "action"
          ? "action-task"
          : node.type === "process"
            ? "process"
            : node.type === "start"
              ? "terminator-start"
              : "terminator-end"),
    position: node.position,
    size: {
      width: shapeDefinition?.defaultWidth ?? paletteItem?.defaultSize.width ?? 180,
      height:
        shapeDefinition?.defaultHeight ??
        paletteItem?.defaultSize.height ??
        (node.type === "decision" ? 120 : 64),
    },
    ports:
      shapeDefinition?.portAnchors.map((anchor) => ({
        id: anchor.id,
        side: anchor.side,
        metadata: {
          anchor,
        },
        accepts: [],
      })) ?? [],
    content: {
      title: node.data.label,
      labels: [],
    },
    style: { tokens: {} },
    resizePolicy: shapeDefinition?.resizePolicy ?? "content",
    metadata: {
      ...node.data.meta,
      shapeId:
        shapeId ??
        (node.type === "decision"
          ? "decision"
          : node.type === "action"
            ? "action-task"
            : node.type === "process"
              ? "process"
              : node.type === "start"
                ? "terminator-start"
                : "terminator-end"),
      semanticKind:
        (typeof node.data.meta.semanticKind === "string"
          ? node.data.meta.semanticKind
          : paletteItem?.kind) ??
        (node.type === "start"
          ? "start-event"
          : node.type === "end"
            ? "end-event"
            : node.type === "decision"
              ? "decision-gateway"
              : node.type === "action"
                ? "automation-task"
                : "process-step"),
      family:
        (typeof node.data.meta.family === "string" ? node.data.meta.family : undefined) ??
        paletteItem?.family ??
        "flowchart",
    },
    automation: node.data.action
      ? {
          actionType: "http",
          endpoint: node.data.action.webhook_url,
          method:
            node.data.action.method === "DELETE"
              ? "DELETE"
              : node.data.action.method,
          headers: node.data.action.headers,
          payloadTemplate: node.data.action.payload_template,
          metadata: {},
        }
      : undefined,
    ai: {
      confidence: node.data.confidence,
      notes: [],
    },
  });

  return projectEngineState(nextState);
}

export function addDocumentContainerEntity(
  engineState: EngineState,
  container: DiagramContainer,
): EditorProjection {
  return projectEngineState(addDocumentContainer(engineState, container));
}

export function replaceEditorDocument(
  engineState: EngineState,
  document: DiagramDocument,
): EditorProjection {
  return projectEngineState(replaceEngineDocument(engineState, document));
}

export function updateDocumentNodeTitle(
  engineState: EngineState,
  nodeId: string,
  title: string,
): EditorProjection {
  return projectEngineState(
    updateDocumentNode(engineState, nodeId, (node) => ({
      ...node,
      content: {
        ...node.content,
        title,
      },
    })),
  );
}

export function updateDocumentNodeShape(
  engineState: EngineState,
  nodeId: string,
  shapeId: string,
): EditorProjection {
  const paletteItem = getPaletteItemByShapeId(shapeId);
  const shapeDefinition = getShapeDefinition(shapeId);

  return projectEngineState(
    updateDocumentNode(engineState, nodeId, (node) => ({
      ...node,
      family: paletteItem?.family ?? node.family,
      shape: shapeId,
      kind: paletteItem?.kind ?? node.kind,
      size: paletteItem
        ? {
            width: paletteItem.defaultSize.width,
            height: paletteItem.defaultSize.height,
          }
        : node.size,
      ports:
        shapeDefinition?.portAnchors.map((anchor) => ({
          id: anchor.id,
          side: anchor.side,
          metadata: {
            anchor,
          },
          accepts: [],
        })) ?? node.ports,
      resizePolicy: shapeDefinition?.resizePolicy ?? node.resizePolicy,
      metadata: {
        ...node.metadata,
        shapeId,
        semanticKind: paletteItem?.kind ?? node.kind,
        family: paletteItem?.family ?? node.family,
      },
    })),
  );
}

export function updateDocumentNodeSize(
  engineState: EngineState,
  nodeId: string,
  size: { width: number; height: number },
): EditorProjection {
  return projectEngineState(
    updateDocumentNode(engineState, nodeId, (node) => ({
      ...node,
      size,
    })),
  );
}

export function updateDocumentNodeStyle(
  engineState: EngineState,
  nodeId: string,
  style: { fill?: string; stroke?: string; textColor?: string },
): EditorProjection {
  return projectEngineState(
    updateDocumentNode(engineState, nodeId, (node) => ({
      ...node,
      style: {
        ...node.style,
        ...style,
        tokens: node.style.tokens ?? {},
      },
    })),
  );
}

export function updateDocumentNodeAutomation(
  engineState: EngineState,
  nodeId: string,
  config: ActionConfig | undefined,
): EditorProjection {
  return projectEngineState(
    updateDocumentNode(engineState, nodeId, (node) => ({
      ...node,
      automation: config
        ? {
            actionType: "http",
            endpoint: config.webhook_url,
            method: config.method,
            headers: config.headers,
            payloadTemplate: config.payload_template,
            metadata: {},
          }
        : undefined,
    })),
  );
}

export function deleteSelectedEntities(
  engineState: EngineState,
  selectedNodeId: string | null,
  selectedEdgeId: string | null,
  selectedContainerId: string | null,
): EditorProjection {
  let nextState = engineState;

  if (selectedNodeId) {
    nextState = removeDocumentNode(nextState, selectedNodeId);
  }

  if (selectedEdgeId) {
    nextState = removeDocumentEdge(nextState, selectedEdgeId);
  }

  if (selectedContainerId) {
    nextState = removeDocumentContainer(nextState, selectedContainerId);
  }

  return projectEngineState(nextState);
}

export function updateDocumentEdgeLabel(
  engineState: EngineState,
  edgeId: string,
  label: string,
): EditorProjection {
  return projectEngineState(
    updateDocumentEdge(engineState, edgeId, (edge) => ({
      ...edge,
      labels: label.trim() ? [{ text: label.trim(), position: "center" }] : [],
    })),
  );
}

export function updateDocumentEdgeKind(
  engineState: EngineState,
  edgeId: string,
  kind: string,
): EditorProjection {
  return projectEngineState(
    updateDocumentEdge(engineState, edgeId, (edge) => ({
      ...edge,
      kind,
    })),
  );
}

export function updateDocumentEdgeRouting(
  engineState: EngineState,
  edgeId: string,
  routing: EdgeRouting,
): EditorProjection {
  return projectEngineState(
    updateDocumentEdge(engineState, edgeId, (edge) => ({
      ...edge,
      routing,
    })),
  );
}

export function updateDocumentEdgeMarkers(
  engineState: EngineState,
  edgeId: string,
  markers: { startMarker?: Marker; endMarker?: Marker },
): EditorProjection {
  return projectEngineState(
    updateDocumentEdge(engineState, edgeId, (edge) => ({
      ...edge,
      startMarker: markers.startMarker ?? edge.startMarker,
      endMarker: markers.endMarker ?? edge.endMarker,
    })),
  );
}

export function undoEditor(engineState: EngineState): EditorProjection {
  return projectEngineState(undoDocumentHistory(engineState));
}

export function redoEditor(engineState: EngineState): EditorProjection {
  return projectEngineState(redoDocumentHistory(engineState));
}

export function selectNodeInEngine(
  _engineState: EngineState,
  id: string | null,
): EngineSelection {
  return id ? selectNode(id) : clearSelection();
}

export function selectEdgeInEngine(
  _engineState: EngineState,
  id: string | null,
): EngineSelection {
  return id ? selectEdge(id) : clearSelection();
}

export function selectContainerInEngine(
  _engineState: EngineState,
  id: string | null,
): EngineSelection {
  return id ? selectContainer(id) : clearSelection();
}

export function updateDocumentContainerLabel(
  engineState: EngineState,
  containerId: string,
  label: string,
): EditorProjection {
  return projectEngineState(
    updateDocumentContainer(engineState, containerId, (container) => ({
      ...container,
      label,
    })),
  );
}

export function updateDocumentContainerSize(
  engineState: EngineState,
  containerId: string,
  size: { width: number; height: number },
): EditorProjection {
  return projectEngineState(
    updateDocumentContainer(engineState, containerId, (container) => ({
      ...container,
      size,
    })),
  );
}

export function updateDocumentContainerStyle(
  engineState: EngineState,
  containerId: string,
  style: { fill?: string; stroke?: string },
): EditorProjection {
  return projectEngineState(
    updateDocumentContainer(engineState, containerId, (container) => ({
      ...container,
      style: {
        ...container.style,
        ...style,
        tokens: container.style.tokens ?? {},
      },
    })),
  );
}

export function assignContainerToParent(
  engineState: EngineState,
  containerId: string,
  parentContainerId: string | null,
): EditorProjection {
  let nextState = updateDocumentContainer(engineState, containerId, (container) => ({
    ...container,
    metadata: {
      ...container.metadata,
      parentContainerId: parentContainerId ?? null,
    },
  }));

  const touchedContainerIds = new Set(
    nextState.document.containers
      .filter((container) =>
        container.childContainerIds.includes(containerId) || container.id === parentContainerId,
      )
      .map((container) => container.id),
  );

  for (const currentContainerId of touchedContainerIds) {
    nextState = updateDocumentContainer(nextState, currentContainerId, (container) => {
      const withoutChild = container.childContainerIds.filter((id) => id !== containerId);
      const childContainerIds =
        currentContainerId === parentContainerId
          ? Array.from(new Set([...withoutChild, containerId]))
          : withoutChild;

      return {
        ...container,
        childContainerIds,
      };
    });
  }

  return projectEngineState(nextState);
}

export function assignNodeToContainer(
  engineState: EngineState,
  nodeId: string,
  containerId: string | null,
): EditorProjection {
  let nextState = updateDocumentNode(engineState, nodeId, (node) => ({
    ...node,
    metadata: {
      ...node.metadata,
      parentContainerId: containerId ?? null,
    },
  }));

  const touchedContainerIds = new Set(
    nextState.document.containers
      .filter((container) =>
        container.childNodeIds.includes(nodeId) || container.id === containerId,
      )
      .map((container) => container.id),
  );

  for (const currentContainerId of touchedContainerIds) {
    nextState = updateDocumentContainer(nextState, currentContainerId, (container) => {
      const withoutNode = container.childNodeIds.filter((id) => id !== nodeId);
      const childNodeIds =
        currentContainerId === containerId
          ? Array.from(new Set([...withoutNode, nodeId]))
          : withoutNode;

      return {
        ...container,
        childNodeIds,
      };
    });
  }

  if (containerId) {
    const assignedContainer = nextState.document.containers.find(
      (container) => container.id === containerId,
    );

    if (assignedContainer) {
      nextState = updateDocumentNode(nextState, nodeId, (node) => ({
        ...node,
        position: {
          x: Math.max(
            assignedContainer.position.x + 64,
            Math.min(
              node.position.x,
              assignedContainer.position.x + assignedContainer.size.width - node.size.width - 32,
            ),
          ),
          y: Math.max(
            assignedContainer.position.y + 32,
            Math.min(
              node.position.y,
              assignedContainer.position.y + assignedContainer.size.height - node.size.height - 32,
            ),
          ),
        },
      }));
    }
  }

  return projectEngineState(nextState);
}

export function detectContainerForNode(
  document: DiagramDocument,
  nodeId: string,
  position?: { x: number; y: number },
): string | null {
  const node = document.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return null;

  const nodeLeft = position?.x ?? node.position.x;
  const nodeTop = position?.y ?? node.position.y;
  const nodeRight = nodeLeft + node.size.width;
  const nodeBottom = nodeTop + node.size.height;

  const matchingContainers = document.containers.filter((container) => {
    const labelOffset = container.type === "pool" || container.type === "lane" ? 42 : 0;
    const left = container.position.x + labelOffset;
    const top = container.position.y;
    const right = container.position.x + container.size.width;
    const bottom = container.position.y + container.size.height;

    return nodeLeft >= left && nodeRight <= right && nodeTop >= top && nodeBottom <= bottom;
  });

  if (matchingContainers.length === 0) {
    return null;
  }

  return matchingContainers
    .sort(
      (a, b) =>
        a.size.width * a.size.height - b.size.width * b.size.height,
    )[0]?.id ?? null;
}

const DIAGRAM_FAMILIES: DiagramFamily[] = [
  "flowchart",
  "bpmn",
  "swimlane",
  "sequence",
  "state",
  "er",
  "class",
  "c4",
  "architecture",
  "dataflow",
  "mindmap",
  "orgchart",
  "timeline",
  "journey",
  "sankey",
  "custom",
];

function asDiagramFamily(value: string | undefined): DiagramFamily | undefined {
  return value && DIAGRAM_FAMILIES.includes(value as DiagramFamily)
    ? (value as DiagramFamily)
    : undefined;
}
