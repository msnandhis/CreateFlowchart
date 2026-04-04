import { z } from "zod";
import {
  DiagramFamilyV3 as DiagramFamilyEnum,
  EdgeRouting as EdgeRoutingEnum,
  MarkerType as MarkerEnum,
  PortSide as PortSideEnum,
  ResizePolicy as ResizePolicyEnum,
  GroupType as ContainerTypeEnum,
} from "./model";

export const ShapeLabelZoneSchema = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});
export type ShapeLabelZone = z.infer<typeof ShapeLabelZoneSchema>;

export const ShapePortAnchorSchema = z.object({
  id: z.string().min(1),
  side: PortSideEnum,
  x: z.number(),
  y: z.number(),
});
export type ShapePortAnchor = z.infer<typeof ShapePortAnchorSchema>;

export const ShapeDefinitionSchema = z.object({
  id: z.string().min(1),
  family: DiagramFamilyEnum,
  kind: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().optional(),
  svgPath: z.string().optional(),
  defaultWidth: z.number().positive(),
  defaultHeight: z.number().positive(),
  resizePolicy: ResizePolicyEnum.default("content"),
  portAnchors: z.array(ShapePortAnchorSchema).default([]),
  labelZones: z.array(ShapeLabelZoneSchema).default([]),
  defaultTokens: z.record(z.string()).default({}),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
});
export type ShapeDefinition = z.infer<typeof ShapeDefinitionSchema>;

export const EdgeDefinitionSchema = z.object({
  id: z.string().min(1),
  family: DiagramFamilyEnum,
  kind: z.string().min(1),
  displayName: z.string().min(1),
  defaultRouting: EdgeRoutingEnum.default("orthogonal"),
  startMarker: MarkerEnum.default("none"),
  endMarker: MarkerEnum.default("arrow"),
  tags: z.array(z.string()).default([]),
});
export type EdgeDefinition = z.infer<typeof EdgeDefinitionSchema>;

export const ContainerDefinitionSchema = z.object({
  id: z.string().min(1),
  family: DiagramFamilyEnum,
  type: ContainerTypeEnum,
  displayName: z.string().min(1),
  description: z.string().optional(),
  defaultWidth: z.number().positive(),
  defaultHeight: z.number().positive(),
  tags: z.array(z.string()).default([]),
});
export type ContainerDefinition = z.infer<typeof ContainerDefinitionSchema>;

export const DiagramKitSchema = z.object({
  id: z.string().min(1),
  family: DiagramFamilyEnum,
  displayName: z.string().min(1),
  description: z.string().optional(),
  shapeIds: z.array(z.string()).default([]),
  edgeIds: z.array(z.string()).default([]),
  containerIds: z.array(z.string()).default([]),
  supportsCodeMode: z.boolean().default(false),
  supportsAutomation: z.boolean().default(false),
  supportsSwimlanes: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});
export type DiagramKit = z.infer<typeof DiagramKitSchema>;

export interface PlatformRegistry {
  shapes: Record<string, ShapeDefinition>;
  edges: Record<string, EdgeDefinition>;
  containers: Record<string, ContainerDefinition>;
  kits: Record<string, DiagramKit>;
}

export function createEmptyRegistry(): PlatformRegistry {
  return {
    shapes: {},
    edges: {},
    containers: {},
    kits: {},
  };
}
