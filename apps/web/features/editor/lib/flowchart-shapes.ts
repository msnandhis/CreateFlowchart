import type { NodeType, FlowNode } from "@createflowchart/core";
import { flowchartShapes, type ShapeDefinition } from "@createflowchart/schema";

export interface FlowchartPaletteItem {
  shapeId: string;
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

export const flowchartPalette: FlowchartPaletteItem[] =
  flowchartShapes.map(mapShapeToPaletteItem);

export function getPaletteItem(type: NodeType): FlowchartPaletteItem {
  return (
    flowchartPalette.find((item) => item.legacyType === type) ??
    flowchartPalette[1]
  );
}

export function getPaletteItemByShapeId(shapeId: string): FlowchartPaletteItem | null {
  return flowchartPalette.find((item) => item.shapeId === shapeId) ?? null;
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
      },
    },
  };
}
