import type { FlowGraph } from "@createflowchart/core";
import { toMermaid } from "@createflowchart/core";

export type ExportFormat = "png" | "svg" | "pdf" | "mermaid" | "json";

export interface ExportResult {
  success: boolean;
  format: ExportFormat;
  content?: string;
  fileSize?: number;
}

export function exportAsJSON(flowGraph: FlowGraph): ExportResult {
  const json = JSON.stringify(flowGraph, null, 2);
  return {
    success: true,
    format: "json",
    content: json,
    fileSize: Buffer.byteLength(json, "utf-8"),
  };
}

export function exportAsMermaid(flowGraph: FlowGraph): ExportResult {
  const mermaid = toMermaid(flowGraph);
  return {
    success: true,
    format: "mermaid",
    content: mermaid,
    fileSize: Buffer.byteLength(mermaid, "utf-8"),
  };
}

export function exportAsSVG(flowGraph: FlowGraph): ExportResult {
  const nodes = flowGraph.nodes;

  const width = Math.max(800, ...nodes.map((n) => n.position.x + 220));
  const height = Math.max(600, ...nodes.map((n) => n.position.y + 120));

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += `<style>
    .bg { fill: #0a0a0a; }
    .node-rect { fill: #1e1e1e; stroke: #3b82f6; stroke-width: 2; rx: 8; }
    .node-text { fill: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; text-anchor: middle; dominant-baseline: middle; }
    .start-rect { fill: #22c55e; stroke: #16a34a; }
    .end-rect { fill: #ef4444; stroke: #dc2626; }
    .decision-diamond { fill: #f59e0b; stroke: #d97706; }
    .action-rect { fill: #8b5cf6; stroke: #7c3aed; }
  </style>`;

  svg += `<rect class="bg" width="100%" height="100%"/>`;

  const nodeWidth = 180;
  const nodeHeight = 60;

  const colorMap: Record<string, string> = {
    start: "start-rect",
    end: "end-rect",
    decision: "decision-diamond",
    action: "action-rect",
  };

  for (const node of nodes) {
    const x = node.position.x;
    const y = node.position.y;
    const label = node.data.label;
    const nodeType = node.type;
    const rectClass = colorMap[nodeType] || "node-rect";

    if (nodeType === "decision") {
      const cx = x + nodeWidth / 2;
      const cy = y + nodeHeight / 2;
      const points = `${cx},${cy - nodeHeight / 2} ${cx + nodeWidth / 2},${cy} ${cx},${cy + nodeHeight / 2} ${cx - nodeWidth / 2},${cy}`;
      svg += `<polygon points="${points}" class="${rectClass}"/>`;
      svg += `<text x="${cx}" y="${cy}" class="node-text">${escapeXml(label)}</text>`;
    } else {
      svg += `<rect x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" class="${rectClass}"/>`;
      svg += `<text x="${x + nodeWidth / 2}" y="${y + nodeHeight / 2}" class="node-text">${escapeXml(label)}</text>`;
    }
  }

  svg += `</svg>`;

  return {
    success: true,
    format: "svg",
    content: svg,
    fileSize: Buffer.byteLength(svg, "utf-8"),
  };
}

export function exportAsPNGData(flowGraph: FlowGraph): ExportResult {
  return exportAsSVG(flowGraph);
}

export function exportAsPDFData(flowGraph: FlowGraph): ExportResult {
  return exportAsSVG(flowGraph);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getSVGString(flowGraph: FlowGraph): string {
  return exportAsSVG(flowGraph).content || "";
}