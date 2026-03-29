import type {
  DiagramDocument,
  DiagramEdge,
  DiagramContainer,
  DiagramNode,
} from "@createflowchart/schema";
import type { EngineValidationIssue, EngineValidator } from "./types";

function validateNodeIds(nodes: DiagramNode[]): EngineValidationIssue[] {
  const seen = new Set<string>();
  const issues: EngineValidationIssue[] = [];

  for (const node of nodes) {
    if (seen.has(node.id)) {
      issues.push({
        code: "duplicate-node-id",
        severity: "error",
        message: `Duplicate node id "${node.id}"`,
        entityId: node.id,
      });
    }
    seen.add(node.id);
  }

  return issues;
}

function validateEdgeIds(edges: DiagramEdge[]): EngineValidationIssue[] {
  const seen = new Set<string>();
  const issues: EngineValidationIssue[] = [];

  for (const edge of edges) {
    if (seen.has(edge.id)) {
      issues.push({
        code: "duplicate-edge-id",
        severity: "error",
        message: `Duplicate edge id "${edge.id}"`,
        entityId: edge.id,
      });
    }
    seen.add(edge.id);
  }

  return issues;
}

function validateEdgeEndpoints(document: DiagramDocument): EngineValidationIssue[] {
  const nodeIds = new Set(document.nodes.map((node) => node.id));
  const issues: EngineValidationIssue[] = [];

  for (const edge of document.edges) {
    if (!nodeIds.has(edge.sourceNodeId)) {
      issues.push({
        code: "missing-edge-source",
        severity: "error",
        message: `Edge "${edge.id}" references missing source node "${edge.sourceNodeId}"`,
        entityId: edge.id,
      });
    }

    if (!nodeIds.has(edge.targetNodeId)) {
      issues.push({
        code: "missing-edge-target",
        severity: "error",
        message: `Edge "${edge.id}" references missing target node "${edge.targetNodeId}"`,
        entityId: edge.id,
      });
    }
  }

  return issues;
}

function validateContainerMembership(document: DiagramDocument): EngineValidationIssue[] {
  const nodeIds = new Set(document.nodes.map((node) => node.id));
  const containerIds = new Set(document.containers.map((container) => container.id));
  const issues: EngineValidationIssue[] = [];

  for (const container of document.containers) {
    for (const childNodeId of container.childNodeIds) {
      if (!nodeIds.has(childNodeId)) {
        issues.push({
          code: "missing-container-node",
          severity: "error",
          message: `Container "${container.id}" references missing node "${childNodeId}"`,
          entityId: container.id,
        });
      }
    }

    for (const childContainerId of container.childContainerIds) {
      if (!containerIds.has(childContainerId)) {
        issues.push({
          code: "missing-container-child",
          severity: "error",
          message: `Container "${container.id}" references missing container "${childContainerId}"`,
          entityId: container.id,
        });
      }
    }
  }

  return issues;
}

function validateContainerIds(containers: DiagramContainer[]): EngineValidationIssue[] {
  const seen = new Set<string>();
  const issues: EngineValidationIssue[] = [];

  for (const container of containers) {
    if (seen.has(container.id)) {
      issues.push({
        code: "duplicate-container-id",
        severity: "error",
        message: `Duplicate container id "${container.id}"`,
        entityId: container.id,
      });
    }
    seen.add(container.id);
  }

  return issues;
}

function validateContainerNesting(document: DiagramDocument): EngineValidationIssue[] {
  const containers = new Map(document.containers.map((container) => [container.id, container]));
  const issues: EngineValidationIssue[] = [];

  for (const container of document.containers) {
    const parentId =
      typeof container.metadata.parentContainerId === "string"
        ? container.metadata.parentContainerId
        : undefined;

    if (!parentId) {
      continue;
    }

    const parent = containers.get(parentId);
    if (!parent) {
      issues.push({
        code: "missing-parent-container",
        severity: "error",
        message: `Container "${container.id}" references missing parent "${parentId}"`,
        entityId: container.id,
      });
      continue;
    }

    if (!parent.childContainerIds.includes(container.id)) {
      issues.push({
        code: "orphaned-container-membership",
        severity: "warning",
        message: `Container "${container.id}" is assigned to "${parentId}" but not listed as a child`,
        entityId: container.id,
      });
    }

    if (container.type === "pool" && parent.type === "lane") {
      issues.push({
        code: "invalid-container-nesting",
        severity: "error",
        message: `Pool "${container.id}" cannot be nested inside lane "${parentId}"`,
        entityId: container.id,
      });
    }

    if (container.type === "lane" && parent.type !== "pool" && parent.type !== "lane") {
      issues.push({
        code: "unexpected-lane-parent",
        severity: "warning",
        message: `Lane "${container.id}" is nested inside non-pool container "${parentId}"`,
        entityId: container.id,
      });
    }
  }

  return issues;
}

function validateNodeContainerPlacement(document: DiagramDocument): EngineValidationIssue[] {
  const containers = new Map(document.containers.map((container) => [container.id, container]));
  const issues: EngineValidationIssue[] = [];

  for (const node of document.nodes) {
    const parentId =
      typeof node.metadata.parentContainerId === "string"
        ? node.metadata.parentContainerId
        : undefined;
    if (!parentId) {
      continue;
    }

    const container = containers.get(parentId);
    if (!container) {
      issues.push({
        code: "missing-node-container",
        severity: "error",
        message: `Node "${node.id}" references missing container "${parentId}"`,
        entityId: node.id,
      });
      continue;
    }

    if (!container.childNodeIds.includes(node.id)) {
      issues.push({
        code: "orphaned-node-membership",
        severity: "warning",
        message: `Node "${node.id}" is assigned to "${parentId}" but is not listed in the container`,
        entityId: node.id,
      });
    }

    const labelOffset = container.type === "pool" || container.type === "lane" ? 42 : 0;
    const left = container.position.x + labelOffset;
    const top = container.position.y;
    const right = container.position.x + container.size.width;
    const bottom = container.position.y + container.size.height;
    const nodeRight = node.position.x + node.size.width;
    const nodeBottom = node.position.y + node.size.height;

    if (
      node.position.x < left ||
      node.position.y < top ||
      nodeRight > right ||
      nodeBottom > bottom
    ) {
      issues.push({
        code: "node-outside-container",
        severity: "warning",
        message: `Node "${node.id}" extends outside container "${parentId}"`,
        entityId: node.id,
      });
    }
  }

  return issues;
}

function validateEdgePorts(document: DiagramDocument): EngineValidationIssue[] {
  const nodes = new Map(document.nodes.map((node) => [node.id, node]));
  const issues: EngineValidationIssue[] = [];

  for (const edge of document.edges) {
    const sourceNode = nodes.get(edge.sourceNodeId);
    const targetNode = nodes.get(edge.targetNodeId);

    if (sourceNode && edge.sourcePortId && !sourceNode.ports.some((port) => port.id === edge.sourcePortId)) {
      issues.push({
        code: "missing-source-port",
        severity: "warning",
        message: `Edge "${edge.id}" references missing source port "${edge.sourcePortId}"`,
        entityId: edge.id,
      });
    }

    if (targetNode && edge.targetPortId && !targetNode.ports.some((port) => port.id === edge.targetPortId)) {
      issues.push({
        code: "missing-target-port",
        severity: "warning",
        message: `Edge "${edge.id}" references missing target port "${edge.targetPortId}"`,
        entityId: edge.id,
      });
    }

    if (edge.sourceNodeId === edge.targetNodeId) {
      issues.push({
        code: "self-loop-edge",
        severity: "info",
        message: `Edge "${edge.id}" creates a self-loop on "${edge.sourceNodeId}"`,
        entityId: edge.id,
      });
    }
  }

  return issues;
}

export const basicDocumentValidator: EngineValidator = (
  document: DiagramDocument,
) => {
  return [
    ...validateNodeIds(document.nodes),
    ...validateEdgeIds(document.edges),
    ...validateContainerIds(document.containers),
    ...validateEdgeEndpoints(document),
    ...validateEdgePorts(document),
    ...validateContainerMembership(document),
    ...validateContainerNesting(document),
    ...validateNodeContainerPlacement(document),
  ];
};
