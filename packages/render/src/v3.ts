/**
 * SVG Renderer v3
 *
 * Renders a DiagramModel (v3) to SVG string.
 * Framework-agnostic — runs in Node.js or browser.
 * No DOM — pure string concatenation.
 *
 * Supports: all standard geometries, ports, groups, annotations,
 * edge routing (straight, bezier), edge labels, markers.
 */

import type { DiagramModel, DiagramNode, DiagramEdge, DiagramGroup } from "@createflowchart/schema";

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export interface RenderOptions {
  /** Padding around the diagram. Default: 60 */
  padding?: number;
  /** Background color. Default: "#0b1020" */
  background?: string;
  /** Whether to render annotations. Default: true */
  showAnnotations?: boolean;
  /** Whether to render ports. Default: false */
  showPorts?: boolean;
  /** Custom CSS to inject. Default: built-in dark theme */
  customCss?: string;
  /** Font family. Default: "Inter, system-ui, sans-serif" */
  fontFamily?: string;
}

export interface RenderBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ═══════════════════════════════════════════════════════════════════
// Main Render Function
// ═══════════════════════════════════════════════════════════════════

export function renderModelToSvg(
  model: DiagramModel,
  options?: RenderOptions,
): string {
  const padding = options?.padding ?? 60;
  const background = options?.background ?? "#0b1020";
  const showPorts = options?.showPorts ?? false;
  const fontFamily = options?.fontFamily ?? "Inter, system-ui, sans-serif";

  const bounds = computeBounds(model, padding);

  const defs = buildDefs();
  const css = options?.customCss ?? buildDefaultCss(fontFamily);

  // Render layers (bottom to top)
  const groupsSvg = model.groups
    .slice()
    .sort(groupSortOrder)
    .map((g) => renderGroup(g))
    .join("");

  const edgesSvg = model.edges
    .map((e) => renderEdge(model, e))
    .join("");

  const nodesSvg = model.nodes
    .map((n) => renderNode(n, showPorts))
    .join("");

  const annotationsSvg = options?.showAnnotations !== false
    ? model.annotations.map((a) => renderAnnotation(a)).join("")
    : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}">`,
    `<style>${css}</style>`,
    defs,
    `<rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="${background}" />`,
    `<g class="cf-groups">${groupsSvg}</g>`,
    `<g class="cf-edges">${edgesSvg}</g>`,
    `<g class="cf-nodes">${nodesSvg}</g>`,
    annotationsSvg ? `<g class="cf-annotations">${annotationsSvg}</g>` : "",
    `</svg>`,
  ].join("\n");
}

// ═══════════════════════════════════════════════════════════════════
// Bounds
// ═══════════════════════════════════════════════════════════════════

function computeBounds(model: DiagramModel, padding: number): RenderBounds {
  const points: Array<{ x: number; y: number }> = [];

  for (const node of model.nodes) {
    points.push(node.position);
    points.push({
      x: node.position.x + node.size.width,
      y: node.position.y + node.size.height,
    });
  }

  for (const group of model.groups) {
    points.push(group.position);
    points.push({
      x: group.position.x + group.size.width,
      y: group.position.y + group.size.height,
    });
  }

  if (points.length === 0) {
    return { x: 0, y: 0, width: 1200, height: 800 };
  }

  const minX = Math.min(...points.map((p) => p.x)) - padding;
  const minY = Math.min(...points.map((p) => p.y)) - padding;
  const maxX = Math.max(...points.map((p) => p.x)) + padding;
  const maxY = Math.max(...points.map((p) => p.y)) + padding;

  return {
    x: minX,
    y: minY,
    width: Math.max(800, maxX - minX),
    height: Math.max(600, maxY - minY),
  };
}

// ═══════════════════════════════════════════════════════════════════
// Groups
// ═══════════════════════════════════════════════════════════════════

function groupSortOrder(a: DiagramGroup, b: DiagramGroup): number {
  // Parent groups render before child groups
  const aDepth = a.parentGroupId ? 1 : 0;
  const bDepth = b.parentGroupId ? 1 : 0;
  return aDepth - bDepth;
}

function renderGroup(group: DiagramGroup): string {
  const { x, y } = group.position;
  const { width, height } = group.size;
  const fill = group.style.fill ?? "rgba(148, 163, 184, 0.06)";
  const stroke = group.style.stroke ?? "rgba(148, 163, 184, 0.35)";

  return [
    `<g class="cf-group" data-id="${esc(group.id)}">`,
    `  <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="16" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />`,
    group.label
      ? `  <text class="cf-group-label" x="${x + 16}" y="${y + 24}">${esc(group.label)}</text>`
      : "",
    `</g>`,
  ].join("\n");
}

// ═══════════════════════════════════════════════════════════════════
// Edges
// ═══════════════════════════════════════════════════════════════════

function renderEdge(model: DiagramModel, edge: DiagramEdge): string {
  const sourceNode = model.nodes.find((n) => n.id === edge.source);
  const targetNode = model.nodes.find((n) => n.id === edge.target);
  if (!sourceNode || !targetNode) return "";

  const sp = getAnchorPoint(sourceNode, edge.sourcePort, "source");
  const tp = getAnchorPoint(targetNode, edge.targetPort, "target");

  // Edge path
  let path: string;
  const routing = edge.routing ?? "orthogonal";

  if (routing === "straight") {
    path = `M ${sp.x} ${sp.y} L ${tp.x} ${tp.y}`;
  } else if (routing === "bezier" || routing === "smooth") {
    const mx = (sp.x + tp.x) / 2;
    path = `M ${sp.x} ${sp.y} C ${mx} ${sp.y}, ${mx} ${tp.y}, ${tp.x} ${tp.y}`;
  } else {
    // Orthogonal (step)
    const my = (sp.y + tp.y) / 2;
    path = `M ${sp.x} ${sp.y} L ${sp.x} ${my} L ${tp.x} ${my} L ${tp.x} ${tp.y}`;
  }

  // Stroke style
  const strokeColor = edge.style.stroke ?? "rgba(203, 213, 225, 0.75)";
  const strokeWidth = edge.style.strokeWidth ?? 2;
  const dasharray = edge.style.strokeDash ?? "";

  // Marker
  const markerEnd = edge.targetMarker !== "none" ? ` marker-end="url(#cf-arrow)"` : "";

  // Label
  const labelSvg = edge.label || (edge.labels && edge.labels.length > 0)
    ? renderEdgeLabels(edge, sp, tp)
    : "";

  return [
    `<g class="cf-edge" data-id="${esc(edge.id)}">`,
    `  <path d="${path}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}"${dasharray ? ` stroke-dasharray="${dasharray}"` : ""}${markerEnd} />`,
    labelSvg,
    `</g>`,
  ].join("\n");
}

function renderEdgeLabels(
  edge: DiagramEdge,
  sp: { x: number; y: number },
  tp: { x: number; y: number },
): string {
  const labels = edge.labels && edge.labels.length > 0
    ? edge.labels
    : edge.label ? [{ text: edge.label, position: 0.5 }] : [];

  return labels.map((label) => {
    const t = label.position ?? 0.5;
    const x = sp.x + (tp.x - sp.x) * t;
    const y = sp.y + (tp.y - sp.y) * t - 8;
    return `  <text class="cf-edge-label" x="${x}" y="${y}">${esc(label.text)}</text>`;
  }).join("\n");
}

// ═══════════════════════════════════════════════════════════════════
// Nodes
// ═══════════════════════════════════════════════════════════════════

function renderNode(node: DiagramNode, showPorts: boolean): string {
  const { x, y } = node.position;
  const { width, height } = node.size;
  const toneClass = inferToneClass(node);

  const shapeSvg = renderShapeGeometry(node);
  const textY = node.subtitle
    ? y + height / 2 - 8
    : y + height / 2 + 1;

  const labelSvg = `<text class="cf-node-label" x="${x + width / 2}" y="${textY}">${esc(node.label)}</text>`;
  const subtitleSvg = node.subtitle
    ? `<text class="cf-node-subtitle" x="${x + width / 2}" y="${y + height / 2 + 12}">${esc(node.subtitle)}</text>`
    : "";

  const portsSvg = showPorts ? renderPorts(node) : "";

  return [
    `<g class="cf-node ${toneClass}" data-id="${esc(node.id)}" data-shape="${esc(node.shape)}">`,
    shapeSvg,
    labelSvg,
    subtitleSvg,
    portsSvg,
    `</g>`,
  ].join("\n");
}

function renderShapeGeometry(node: DiagramNode): string {
  const { x, y } = node.position;
  const { width: w, height: h } = node.size;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const shape = node.shape;

  // Map shape name to geometry
  if (shape.includes("start") || shape.includes("end") || shape.includes("terminal")) {
    return `<rect class="cf-shape" x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" />`;
  }
  if (shape.includes("diamond") || shape.includes("decision") || shape.includes("gateway")) {
    return `<polygon class="cf-shape" points="${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}" />`;
  }
  if (shape.includes("circle") || shape.includes("event")) {
    return `<ellipse class="cf-shape" cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${h / 2}" />`;
  }
  if (shape.includes("parallelogram") || shape.includes("io")) {
    return `<polygon class="cf-shape" points="${x + w * 0.12},${y} ${x + w},${y} ${x + w * 0.88},${y + h} ${x},${y + h}" />`;
  }
  if (shape.includes("hexagon")) {
    return `<polygon class="cf-shape" points="${x + w * 0.12},${y} ${x + w * 0.88},${y} ${x + w},${cy} ${x + w * 0.88},${y + h} ${x + w * 0.12},${y + h} ${x},${cy}" />`;
  }
  if (shape.includes("cylinder") || shape.includes("database")) {
    return [
      `<ellipse class="cf-shape-top" cx="${cx}" cy="${y + 12}" rx="${w / 2}" ry="12" />`,
      `<rect class="cf-shape" x="${x}" y="${y + 12}" width="${w}" height="${h - 24}" />`,
      `<ellipse class="cf-shape" cx="${cx}" cy="${y + h - 12}" rx="${w / 2}" ry="12" />`,
    ].join("");
  }
  if (shape.includes("document")) {
    return `<path class="cf-shape" d="M ${x} ${y} H ${x + w} V ${y + h - 12} C ${x + w - 16} ${y + h + 2}, ${x + 16} ${y + h + 2}, ${x} ${y + h - 12} Z" />`;
  }

  // Default: rounded rectangle
  return `<rect class="cf-shape" x="${x}" y="${y}" width="${w}" height="${h}" rx="14" />`;
}

function renderPorts(node: DiagramNode): string {
  if (!node.ports || node.ports.length === 0) return "";

  return node.ports.map((port) => {
    const { x, y } = getPortPosition(node, port.side, port.offset);
    return `<circle class="cf-port" cx="${x}" cy="${y}" r="4" />`;
  }).join("\n");
}

function getPortPosition(
  node: DiagramNode,
  side: string,
  offset: number,
): { x: number; y: number } {
  const { x, y } = node.position;
  const { width: w, height: h } = node.size;

  switch (side) {
    case "top":    return { x: x + w * offset, y };
    case "bottom": return { x: x + w * offset, y: y + h };
    case "left":   return { x, y: y + h * offset };
    case "right":  return { x: x + w, y: y + h * offset };
    default:       return { x: x + w / 2, y: y + h };
  }
}

function getAnchorPoint(
  node: DiagramNode,
  portId: string | undefined,
  role: "source" | "target",
): { x: number; y: number } {
  if (portId && node.ports) {
    const port = node.ports.find((p) => p.id === portId);
    if (port) {
      return getPortPosition(node, port.side, port.offset);
    }
  }

  // Default: bottom for source, top for target
  const { x, y } = node.position;
  const { width: w, height: h } = node.size;

  if (role === "source") return { x: x + w / 2, y: y + h };
  return { x: x + w / 2, y };
}

function inferToneClass(node: DiagramNode): string {
  const s = node.shape.toLowerCase();
  if (s.includes("start")) return "cf-tone-start";
  if (s.includes("end") || s.includes("terminal")) return "cf-tone-end";
  if (s.includes("decision") || s.includes("gateway")) return "cf-tone-decision";
  if (s.includes("action") || s.includes("service") || s.includes("automation")) return "cf-tone-action";
  return "cf-tone-process";
}

// ═══════════════════════════════════════════════════════════════════
// Annotations
// ═══════════════════════════════════════════════════════════════════

function renderAnnotation(annotation: { id: string; text: string; position?: { x: number; y: number } }): string {
  const pos = annotation.position ?? { x: 0, y: 0 };
  return [
    `<g class="cf-annotation" data-id="${esc(annotation.id)}">`,
    `  <rect x="${pos.x}" y="${pos.y}" width="180" height="40" rx="8" class="cf-annotation-bg" />`,
    `  <text class="cf-annotation-text" x="${pos.x + 12}" y="${pos.y + 24}">${esc(annotation.text)}</text>`,
    `</g>`,
  ].join("\n");
}

// ═══════════════════════════════════════════════════════════════════
// SVG Defs & Styles
// ═══════════════════════════════════════════════════════════════════

function buildDefs(): string {
  return [
    `<defs>`,
    `  <marker id="cf-arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">`,
    `    <path d="M 0 0 L 10 4 L 0 8 z" fill="rgba(203,213,225,0.75)" />`,
    `  </marker>`,
    `  <marker id="cf-arrow-filled" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">`,
    `    <path d="M 0 0 L 10 4 L 0 8 z" fill="rgba(203,213,225,0.95)" />`,
    `  </marker>`,
    `  <marker id="cf-diamond" markerWidth="12" markerHeight="12" refX="6" refY="6" orient="auto">`,
    `    <polygon points="6,0 12,6 6,12 0,6" fill="none" stroke="rgba(203,213,225,0.75)" stroke-width="1.5" />`,
    `  </marker>`,
    `  <marker id="cf-circle" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">`,
    `    <circle cx="4" cy="4" r="3" fill="none" stroke="rgba(203,213,225,0.75)" stroke-width="1.5" />`,
    `  </marker>`,
    `</defs>`,
  ].join("\n");
}

function buildDefaultCss(fontFamily: string): string {
  return `
    text { font-family: ${fontFamily}; }
    .cf-shape, .cf-shape-top { stroke-width: 2; }
    .cf-node-label { font-size: 14px; font-weight: 600; fill: #f8fafc; text-anchor: middle; dominant-baseline: middle; }
    .cf-node-subtitle { font-size: 10px; font-weight: 400; fill: rgba(226,232,240,0.6); text-anchor: middle; dominant-baseline: middle; text-transform: uppercase; letter-spacing: 0.06em; }
    .cf-edge-label { font-size: 11px; fill: #e2e8f0; text-anchor: middle; font-weight: 500; }
    .cf-group-label { font-size: 13px; font-weight: 600; fill: #cbd5e1; }
    .cf-port { fill: rgba(58,134,255,0.5); stroke: #3a86ff; stroke-width: 1.5; }
    .cf-annotation-bg { fill: rgba(251,191,36,0.08); stroke: rgba(251,191,36,0.3); stroke-width: 1; }
    .cf-annotation-text { font-size: 11px; fill: #fbbf24; }
    .cf-tone-process .cf-shape { fill: rgba(58,134,255,0.14); stroke: #3a86ff; }
    .cf-tone-start .cf-shape { fill: rgba(16,185,129,0.14); stroke: #10b981; }
    .cf-tone-end .cf-shape { fill: rgba(239,68,68,0.14); stroke: #ef4444; }
    .cf-tone-decision .cf-shape { fill: rgba(167,139,250,0.14); stroke: #a78bfa; }
    .cf-tone-action .cf-shape { fill: rgba(251,146,60,0.14); stroke: #fb923c; }
  `;
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
