import {
  documentToAst,
  documentToFlowDsl,
  flowDslToDocument,
  mermaidToDocument,
  parseFlowDsl,
} from "@createflowchart/dsl";
import type { DiagramDocument } from "@createflowchart/schema";

export interface DocumentChangeSummary {
  nodesAdded: number;
  nodesRemoved: number;
  nodesModified: number;
  edgesAdded: number;
  edgesRemoved: number;
  containersAdded: number;
  containersRemoved: number;
  titleChanged: boolean;
  highlights: string[];
}

export function serializeDocumentToDsl(document: DiagramDocument): string {
  return documentToFlowDsl(document);
}

export function parseDslDocument(
  source: string,
  base?: Partial<DiagramDocument>,
): DiagramDocument {
  return flowDslToDocument(source, base);
}

export function inspectDslDocument(source: string) {
  return documentToAst(flowDslToDocument(source));
}

export function parseDslAst(source: string) {
  return parseFlowDsl(source);
}

export function parseMermaidDocument(
  source: string,
  base?: Partial<DiagramDocument>,
): DiagramDocument {
  return mermaidToDocument(source, base);
}

export function diffDocuments(
  current: DiagramDocument,
  next: DiagramDocument,
): DocumentChangeSummary {
  const currentNodes = new Map(current.nodes.map((node) => [node.id, node]));
  const nextNodes = new Map(next.nodes.map((node) => [node.id, node]));
  const currentEdges = new Map(current.edges.map((edge) => [edge.id, edge]));
  const nextEdges = new Map(next.edges.map((edge) => [edge.id, edge]));
  const currentContainers = new Map(
    current.containers.map((container) => [container.id, container]),
  );
  const nextContainers = new Map(
    next.containers.map((container) => [container.id, container]),
  );

  const nodesAdded = next.nodes.filter((node) => !currentNodes.has(node.id)).length;
  const nodesRemoved = current.nodes.filter((node) => !nextNodes.has(node.id)).length;
  const nodesModified = next.nodes.filter((node) => {
    const previous = currentNodes.get(node.id);
    return (
      previous &&
      (previous.content.title !== node.content.title ||
        previous.shape !== node.shape ||
        previous.kind !== node.kind ||
        previous.position.x !== node.position.x ||
        previous.position.y !== node.position.y)
    );
  }).length;

  const edgesAdded = next.edges.filter((edge) => !currentEdges.has(edge.id)).length;
  const edgesRemoved = current.edges.filter((edge) => !nextEdges.has(edge.id)).length;
  const containersAdded = next.containers.filter(
    (container) => !currentContainers.has(container.id),
  ).length;
  const containersRemoved = current.containers.filter(
    (container) => !nextContainers.has(container.id),
  ).length;

  const highlights: string[] = [];
  if (current.metadata.title !== next.metadata.title) {
    highlights.push(`Rename diagram to "${next.metadata.title}"`);
  }
  next.nodes
    .filter((node) => !currentNodes.has(node.id))
    .slice(0, 3)
    .forEach((node) => highlights.push(`Add node "${node.content.title}"`));
  next.containers
    .filter((container) => !currentContainers.has(container.id))
    .slice(0, 2)
    .forEach((container) => highlights.push(`Add ${container.type} "${container.label}"`));
  next.nodes
    .filter((node) => {
      const previous = currentNodes.get(node.id);
      return previous && previous.content.title !== node.content.title;
    })
    .slice(0, 3)
    .forEach((node) => {
      const previous = currentNodes.get(node.id)!;
      highlights.push(`Rename node "${previous.content.title}" to "${node.content.title}"`);
    });

  return {
    nodesAdded,
    nodesRemoved,
    nodesModified,
    edgesAdded,
    edgesRemoved,
    containersAdded,
    containersRemoved,
    titleChanged: current.metadata.title !== next.metadata.title,
    highlights,
  };
}
