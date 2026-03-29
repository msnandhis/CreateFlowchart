import type { DiagramDocument } from "@createflowchart/schema";
import { renderDocumentToSvg } from "@createflowchart/render";

export type ExportFormat = "png" | "svg" | "pdf" | "mermaid" | "json";

export interface ExportResult {
  success: boolean;
  format: ExportFormat;
  content?: string;
  fileSize?: number;
}

export function exportAsJSON(document: DiagramDocument): ExportResult {
  const json = JSON.stringify(document, null, 2);
  return {
    success: true,
    format: "json",
    content: json,
    fileSize: Buffer.byteLength(json, "utf-8"),
  };
}

export function exportAsMermaid(document: DiagramDocument): ExportResult {
  const mermaid = documentToMermaid(document);
  return {
    success: true,
    format: "mermaid",
    content: mermaid,
    fileSize: Buffer.byteLength(mermaid, "utf-8"),
  };
}

export function exportAsSVG(document: DiagramDocument): ExportResult {
  const svg = renderDocumentToSvg(document);

  return {
    success: true,
    format: "svg",
    content: svg,
    fileSize: Buffer.byteLength(svg, "utf-8"),
  };
}

export function exportAsPNGData(document: DiagramDocument): ExportResult {
  const svgResult = exportAsSVG(document);
  return {
    success: true,
    format: "png",
    content: svgResult.content,
    fileSize: svgResult.fileSize,
  };
}

export function exportAsPDFData(document: DiagramDocument): ExportResult {
  const svgResult = exportAsSVG(document);
  return {
    success: true,
    format: "pdf",
    content: svgResult.content,
    fileSize: svgResult.fileSize,
  };
}

function documentToMermaid(document: DiagramDocument): string {
  const lines: string[] = ["flowchart TD"];

  for (const node of document.nodes) {
    const label = node.content.title.replace(/"/g, "'");
    if (node.kind.includes("start") || node.kind.includes("end")) {
      lines.push(`    ${node.id}(["${label}"])`);
      continue;
    }

    if (node.kind.includes("gateway") || node.kind.includes("decision")) {
      lines.push(`    ${node.id}{"${label}"}`);
      continue;
    }

    if (node.kind.includes("automation") || node.kind.includes("service")) {
      lines.push(`    ${node.id}[/\"${label}\"/]`);
      continue;
    }

    lines.push(`    ${node.id}["${label}"]`);
  }

  for (const edge of document.edges) {
    const label = edge.labels[0]?.text;
    lines.push(
      label
        ? `    ${edge.sourceNodeId} -->|"${label.replace(/"/g, "'")}"| ${edge.targetNodeId}`
        : `    ${edge.sourceNodeId} --> ${edge.targetNodeId}`,
    );
  }

  return lines.join("\n");
}
