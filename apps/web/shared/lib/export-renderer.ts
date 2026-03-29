import type { DiagramDocument } from "@createflowchart/schema";
import { documentToMermaid } from "@createflowchart/dsl";
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
