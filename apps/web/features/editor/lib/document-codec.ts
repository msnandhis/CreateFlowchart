import {
  documentToAst,
  documentToFlowDsl,
  flowDslToDocument,
  parseFlowDsl,
} from "@createflowchart/dsl";
import type { DiagramDocument } from "@createflowchart/schema";

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
