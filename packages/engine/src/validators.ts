import type {
  DiagramDocument,
  DiagramEdge,
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

export const basicDocumentValidator: EngineValidator = (
  document: DiagramDocument,
) => {
  return [
    ...validateNodeIds(document.nodes),
    ...validateEdgeIds(document.edges),
    ...validateEdgeEndpoints(document),
    ...validateContainerMembership(document),
  ];
};
