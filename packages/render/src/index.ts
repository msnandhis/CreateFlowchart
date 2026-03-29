import {
  bpmnLiteShapes,
  flowchartShapes,
  type DiagramContainer,
  type DiagramDocument,
  type DiagramEdge,
  type DiagramNode,
  type ShapeDefinition,
} from "@createflowchart/schema";

export interface DocumentRenderBounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface RenderDocumentSvgOptions {
  padding?: number;
  background?: string;
}

const shapeMap = new Map<string, ShapeDefinition>(
  [...flowchartShapes, ...bpmnLiteShapes].map((shape) => [shape.id, shape]),
);

export function getDocumentBounds(
  document: DiagramDocument,
  padding = 80,
): DocumentRenderBounds {
  const points: Array<{ x: number; y: number }> = [];

  for (const node of document.nodes) {
    points.push(node.position);
    points.push({
      x: node.position.x + node.size.width,
      y: node.position.y + node.size.height,
    });
  }

  for (const container of document.containers) {
    points.push(container.position);
    points.push({
      x: container.position.x + container.size.width,
      y: container.position.y + container.size.height,
    });
  }

  if (points.length === 0) {
    return { minX: 0, minY: 0, width: 1200, height: 800 };
  }

  const minX = Math.min(...points.map((point) => point.x)) - padding;
  const minY = Math.min(...points.map((point) => point.y)) - padding;
  const maxX = Math.max(...points.map((point) => point.x)) + padding;
  const maxY = Math.max(...points.map((point) => point.y)) + padding;

  return {
    minX,
    minY,
    width: Math.max(800, maxX - minX),
    height: Math.max(600, maxY - minY),
  };
}

export function renderDocumentToSvg(
  document: DiagramDocument,
  options?: RenderDocumentSvgOptions,
): string {
  const bounds = getDocumentBounds(document, options?.padding ?? 80);
  const background = options?.background ?? "#0b1020";

  const containers = document.containers
    .slice()
    .sort((a, b) => getContainerDepth(a) - getContainerDepth(b))
    .map((container) => renderContainer(container))
    .join("");
  const edges = document.edges.map((edge) => renderEdge(document, edge)).join("");
  const nodes = document.nodes.map((node) => renderNode(node)).join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}">`,
    `<style>${buildSvgStyles()}</style>`,
    `<defs><marker id="cf-arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M 0 0 L 10 4 L 0 8 z" /></marker></defs>`,
    `<rect x="${bounds.minX}" y="${bounds.minY}" width="${bounds.width}" height="${bounds.height}" fill="${background}" />`,
    `<g class="containers">${containers}</g>`,
    `<g class="edges">${edges}</g>`,
    `<g class="nodes">${nodes}</g>`,
    `</svg>`,
  ].join("");
}

function renderContainer(container: DiagramContainer): string {
  const labelWidth = container.type === "lane" || container.type === "pool" ? 42 : 0;
  const bodyX = container.position.x + labelWidth;
  const bodyWidth = Math.max(40, container.size.width - labelWidth);
  const toneClass =
    container.family === "bpmn" ? "container-bpmn" : "container-swimlane";

  return [
    `<g class="container ${toneClass}">`,
    `<rect class="container-body" x="${container.position.x}" y="${container.position.y}" width="${container.size.width}" height="${container.size.height}" rx="18" />`,
    labelWidth
      ? `<rect class="container-label-strip" x="${container.position.x}" y="${container.position.y}" width="${labelWidth}" height="${container.size.height}" rx="18" />`
      : "",
    labelWidth
      ? `<line class="container-divider" x1="${bodyX}" y1="${container.position.y}" x2="${bodyX}" y2="${container.position.y + container.size.height}" />`
      : "",
    `<text class="container-label ${labelWidth ? "container-label-vertical" : ""}" x="${
      labelWidth ? container.position.x + labelWidth / 2 : container.position.x + 18
    }" y="${
      labelWidth ? container.position.y + container.size.height / 2 : container.position.y + 28
    }">${escapeXml(container.label)}</text>`,
    labelWidth
      ? `<rect class="container-inner" x="${bodyX + 10}" y="${container.position.y + 10}" width="${bodyWidth - 20}" height="${container.size.height - 20}" rx="14" />`
      : "",
    `</g>`,
  ].join("");
}

function renderEdge(document: DiagramDocument, edge: DiagramEdge): string {
  const sourceNode = document.nodes.find((node) => node.id === edge.sourceNodeId);
  const targetNode = document.nodes.find((node) => node.id === edge.targetNodeId);

  if (!sourceNode || !targetNode) {
    return "";
  }

  const sourcePoint = getNodeAnchorPoint(sourceNode, edge.sourcePortId, "source");
  const targetPoint = getNodeAnchorPoint(targetNode, edge.targetPortId, "target");
  const midX = (sourcePoint.x + targetPoint.x) / 2;
  const path =
    edge.routing === "straight"
      ? `M ${sourcePoint.x} ${sourcePoint.y} L ${targetPoint.x} ${targetPoint.y}`
      : `M ${sourcePoint.x} ${sourcePoint.y} C ${midX} ${sourcePoint.y}, ${midX} ${targetPoint.y}, ${targetPoint.x} ${targetPoint.y}`;

  return [
    `<g class="edge">`,
    `<path class="edge-path" d="${path}" marker-end="url(#cf-arrow)" />`,
    edge.labels[0]?.text
      ? `<text class="edge-label" x="${midX}" y="${(sourcePoint.y + targetPoint.y) / 2 - 10}">${escapeXml(edge.labels[0].text)}</text>`
      : "",
    `</g>`,
  ].join("");
}

function renderNode(node: DiagramNode): string {
  const shapeDefinition = shapeMap.get(node.shape);
  const geometry =
    typeof shapeDefinition?.metadata?.geometry === "string"
      ? shapeDefinition.metadata.geometry
      : inferGeometry(node);
  const toneClass = getToneClass(node);
  const content = [
    `<text class="node-title" x="${node.position.x + node.size.width / 2}" y="${node.position.y + node.size.height / 2 - 2}">${escapeXml(node.content.title)}</text>`,
    `<text class="node-caption" x="${node.position.x + node.size.width / 2}" y="${node.position.y + node.size.height - 12}">${escapeXml(shapeDefinition?.displayName ?? node.kind)}</text>`,
  ].join("");

  return [
    `<g class="node ${toneClass}">`,
    renderGeometry(node, geometry),
    content,
    `</g>`,
  ].join("");
}

function renderGeometry(node: DiagramNode, geometry: string): string {
  const x = node.position.x;
  const y = node.position.y;
  const width = node.size.width;
  const height = node.size.height;
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  switch (geometry) {
    case "pill":
      return `<rect class="node-shape" x="${x}" y="${y}" width="${width}" height="${height}" rx="${height / 2}" />`;
    case "diamond":
      return `<polygon class="node-shape" points="${centerX},${y} ${x + width},${centerY} ${centerX},${y + height} ${x},${centerY}" />`;
    case "parallelogram":
      return `<polygon class="node-shape" points="${x + width * 0.12},${y} ${x + width},${y} ${x + width * 0.88},${y + height} ${x},${y + height}" />`;
    case "document":
      return `<path class="node-shape" d="M ${x} ${y} H ${x + width} V ${y + height - 12} C ${x + width - 16} ${y + height + 2}, ${x + 16} ${y + height + 2}, ${x} ${y + height - 12} Z" />`;
    case "multi-document":
      return [
        `<path class="node-shape-shadow" d="M ${x + 10} ${y + 8} H ${x + width + 10} V ${y + height - 4} C ${x + width - 6} ${y + height + 10}, ${x + 26} ${y + height + 10}, ${x + 10} ${y + height - 4} Z" />`,
        `<path class="node-shape" d="M ${x} ${y} H ${x + width} V ${y + height - 12} C ${x + width - 16} ${y + height + 2}, ${x + 16} ${y + height + 2}, ${x} ${y + height - 12} Z" />`,
      ].join("");
    case "cylinder":
      return [
        `<ellipse class="node-shape-top" cx="${centerX}" cy="${y + 12}" rx="${width / 2}" ry="12" />`,
        `<rect class="node-shape" x="${x}" y="${y + 12}" width="${width}" height="${height - 24}" rx="10" />`,
        `<ellipse class="node-shape-bottom" cx="${centerX}" cy="${y + height - 12}" rx="${width / 2}" ry="12" />`,
      ].join("");
    case "subprocess":
      return `<rect class="node-shape node-shape-subprocess" x="${x}" y="${y}" width="${width}" height="${height}" rx="16" />`;
    case "predefined-process":
      return `<rect class="node-shape node-shape-predefined" x="${x}" y="${y}" width="${width}" height="${height}" rx="16" />`;
    case "manual-input":
      return `<polygon class="node-shape" points="${x + width * 0.1},${y} ${x + width},${y} ${x + width * 0.9},${y + height} ${x},${y + height}" />`;
    case "display":
      return `<polygon class="node-shape" points="${x + 12},${y} ${x + width - 18},${y} ${x + width},${centerY} ${x + width - 18},${y + height} ${x + 12},${y + height} ${x},${centerY}" />`;
    case "hexagon":
      return `<polygon class="node-shape" points="${x + width * 0.12},${y} ${x + width * 0.88},${y} ${x + width},${centerY} ${x + width * 0.88},${y + height} ${x + width * 0.12},${y + height} ${x},${centerY}" />`;
    case "delay":
      return `<path class="node-shape" d="M ${x} ${y} H ${x + width - height / 2} A ${height / 2} ${height / 2} 0 0 1 ${x + width - height / 2} ${y + height} H ${x} Z" />`;
    case "circle":
      return `<ellipse class="node-shape" cx="${centerX}" cy="${centerY}" rx="${width / 2}" ry="${height / 2}" />`;
    case "off-page-connector":
      return `<polygon class="node-shape" points="${x + 12},${y} ${x + width - 12},${y} ${x + width - 12},${y + height * 0.62} ${centerX},${y + height} ${x + 12},${y + height * 0.62}" />`;
    case "stored-data":
      return `<path class="node-shape" d="M ${x + 20} ${y} H ${x + width} V ${y + height} H ${x + 20} Q ${x} ${centerY} ${x + 20} ${y} Z" />`;
    default:
      return `<rect class="node-shape" x="${x}" y="${y}" width="${width}" height="${height}" rx="16" />`;
  }
}

function inferGeometry(node: DiagramNode): string {
  if (node.kind.includes("start") || node.kind.includes("end")) return "pill";
  if (node.kind.includes("gateway") || node.kind.includes("decision")) return "diamond";
  return "rect";
}

function getToneClass(node: DiagramNode): string {
  if (node.kind.includes("start")) return "node-start";
  if (node.kind.includes("end")) return "node-end";
  if (node.kind.includes("gateway") || node.kind.includes("decision")) return "node-decision";
  if (node.kind.includes("automation") || node.kind.includes("service")) return "node-action";
  if (node.family === "bpmn") return "node-bpmn";
  return "node-process";
}

function getNodeAnchorPoint(
  node: DiagramNode,
  portId: string | undefined,
  role: "source" | "target",
): { x: number; y: number } {
  const shapeDefinition = shapeMap.get(node.shape);
  const port =
    shapeDefinition?.portAnchors.find((anchor) => anchor.id === portId) ??
    shapeDefinition?.portAnchors[
      role === "target" ? 0 : Math.max(0, (shapeDefinition?.portAnchors.length ?? 1) - 1)
    ];

  if (port) {
    return {
      x: node.position.x + node.size.width * port.x,
      y: node.position.y + node.size.height * port.y,
    };
  }

  return {
    x: node.position.x + node.size.width / 2,
    y: node.position.y + node.size.height / 2,
  };
}

function getContainerDepth(container: DiagramContainer): number {
  return typeof container.metadata.parentContainerId === "string" ? 1 : 0;
}

function buildSvgStyles(): string {
  return `
    .container-body { fill: rgba(148, 163, 184, 0.08); stroke: rgba(148, 163, 184, 0.45); stroke-width: 2; }
    .container-inner { fill: rgba(255,255,255,0.02); stroke: rgba(148, 163, 184, 0.18); stroke-width: 1; }
    .container-label-strip { fill: rgba(15, 23, 42, 0.78); stroke: rgba(148, 163, 184, 0.45); stroke-width: 2; }
    .container-divider { stroke: rgba(148, 163, 184, 0.35); stroke-width: 1; }
    .container-label { fill: #cbd5e1; font-family: Inter, sans-serif; font-size: 15px; font-weight: 600; }
    .container-label-vertical { writing-mode: vertical-rl; transform: rotate(180deg); text-anchor: middle; dominant-baseline: middle; }
    .container-bpmn .container-body { stroke: rgba(14, 165, 233, 0.52); fill: rgba(14, 165, 233, 0.05); }
    .container-swimlane .container-body { stroke: rgba(99, 102, 241, 0.45); fill: rgba(99, 102, 241, 0.05); }
    .edge-path { fill: none; stroke: rgba(203, 213, 225, 0.82); stroke-width: 2.25; }
    .edge-label { fill: #e2e8f0; font-family: Inter, sans-serif; font-size: 12px; text-anchor: middle; }
    .node-shape, .node-shape-top, .node-shape-bottom { stroke-width: 2; }
    .node-shape-shadow { fill: rgba(15, 23, 42, 0.35); stroke: rgba(15, 23, 42, 0.2); stroke-width: 1.5; }
    .node-title { fill: #f8fafc; font-family: Inter, sans-serif; font-size: 15px; font-weight: 600; text-anchor: middle; dominant-baseline: middle; }
    .node-caption { fill: rgba(226, 232, 240, 0.72); font-family: Inter, sans-serif; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; text-anchor: middle; }
    .node-process .node-shape, .node-process .node-shape-top, .node-process .node-shape-bottom { fill: rgba(58, 134, 255, 0.16); stroke: #3a86ff; }
    .node-start .node-shape, .node-start .node-shape-top, .node-start .node-shape-bottom { fill: rgba(16, 185, 129, 0.18); stroke: #10b981; }
    .node-end .node-shape, .node-end .node-shape-top, .node-end .node-shape-bottom { fill: rgba(239, 68, 68, 0.18); stroke: #ef4444; }
    .node-decision .node-shape, .node-decision .node-shape-top, .node-decision .node-shape-bottom { fill: rgba(245, 158, 11, 0.18); stroke: #f59e0b; }
    .node-action .node-shape, .node-action .node-shape-top, .node-action .node-shape-bottom { fill: rgba(251, 146, 60, 0.18); stroke: #fb923c; }
    .node-bpmn .node-shape, .node-bpmn .node-shape-top, .node-bpmn .node-shape-bottom { fill: rgba(14, 165, 233, 0.18); stroke: #0ea5e9; }
    .node-shape-subprocess { stroke-dasharray: 0; }
    .node-shape-predefined { stroke-dasharray: 0; }
    marker path { fill: rgba(203, 213, 225, 0.82); }
  `;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
