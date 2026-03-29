import type { NodeType, FlowNode } from "@createflowchart/core";
import {
  bpmnLiteShapes,
  flowchartShapes,
  type DiagramFamily,
  type ShapeDefinition,
} from "@createflowchart/schema";

export interface FlowchartPaletteItem {
  shapeId: string;
  family: DiagramFamily;
  kit: string;
  geometry: string;
  kind: string;
  legacyType: NodeType;
  label: string;
  description: string;
  icon: string;
  defaultSize: {
    width: number;
    height: number;
  };
}

function mapShapeToPaletteItem(shape: ShapeDefinition): FlowchartPaletteItem {
  const metadata = shape.metadata as Record<string, unknown>;

  return {
    shapeId: shape.id,
    family: shape.family,
    kit: shape.family === "bpmn" ? "bpmn-lite" : "core-flowchart",
    geometry: (metadata.geometry as string | undefined) ?? "rect",
    kind: shape.kind,
    legacyType: (metadata.legacyType as NodeType | undefined) ?? "process",
    label: shape.displayName,
    description: shape.description ?? shape.displayName,
    icon: (metadata.icon as string | undefined) ?? "□",
    defaultSize: {
      width: shape.defaultWidth,
      height: shape.defaultHeight,
    },
  };
}

const shapeLibrary = [...flowchartShapes, ...bpmnLiteShapes];

export const diagramPalette: FlowchartPaletteItem[] =
  shapeLibrary.map(mapShapeToPaletteItem);

export const flowchartPalette: FlowchartPaletteItem[] =
  diagramPalette.filter((item) => item.family === "flowchart");

export const bpmnPalette: FlowchartPaletteItem[] =
  diagramPalette.filter((item) => item.family === "bpmn");

export const paletteSections: Array<{
  id: string;
  title: string;
  items: FlowchartPaletteItem[];
}> = [
  { id: "flowchart", title: "Flowchart Shapes", items: flowchartPalette },
  { id: "bpmn", title: "BPMN Lite", items: bpmnPalette },
];

export const shapeDefinitionMap: Record<string, ShapeDefinition> = Object.fromEntries(
  shapeLibrary.map((shape) => [shape.id, shape]),
);

export function getPaletteItem(type: NodeType): FlowchartPaletteItem {
  return (
    diagramPalette.find((item) => item.legacyType === type) ??
    diagramPalette[1]
  );
}

export function getPaletteItemByShapeId(shapeId: string): FlowchartPaletteItem | null {
  return diagramPalette.find((item) => item.shapeId === shapeId) ?? null;
}

export function getShapeDefinition(shapeId: string): ShapeDefinition | null {
  return shapeDefinitionMap[shapeId] ?? null;
}

export function createLegacyPaletteNode(
  typeOrShapeId: NodeType | string,
  position?: { x: number; y: number },
): FlowNode {
  const item =
    getPaletteItemByShapeId(typeOrShapeId) ??
    getPaletteItem(typeOrShapeId as NodeType);

  return {
    id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: item.legacyType,
    position: position ?? {
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
    },
    data: {
      label: item.label,
      confidence: 1,
      meta: {
        paletteSource: item.shapeId,
        shapeId: item.shapeId,
        semanticKind: item.kind,
        family: item.family,
        kit: item.kit,
        geometry: item.geometry,
      },
    },
  };
}
