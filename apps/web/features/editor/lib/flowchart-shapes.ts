import type { NodeType, FlowNode } from "@createflowchart/core";

export interface FlowchartPaletteItem {
  legacyType: NodeType;
  label: string;
  description: string;
  icon: string;
  defaultSize: {
    width: number;
    height: number;
  };
}

export const flowchartPalette: FlowchartPaletteItem[] = [
  {
    legacyType: "start",
    label: "Start",
    description: "Entry point for a process or workflow",
    icon: "▶",
    defaultSize: { width: 180, height: 64 },
  },
  {
    legacyType: "process",
    label: "Process",
    description: "Standard work step or operation",
    icon: "⚙",
    defaultSize: { width: 180, height: 64 },
  },
  {
    legacyType: "decision",
    label: "Decision",
    description: "Branching condition or gateway",
    icon: "◆",
    defaultSize: { width: 180, height: 120 },
  },
  {
    legacyType: "action",
    label: "Action",
    description: "Webhook, API, or automation task",
    icon: "⚡",
    defaultSize: { width: 180, height: 64 },
  },
  {
    legacyType: "end",
    label: "End",
    description: "Terminal outcome or end state",
    icon: "■",
    defaultSize: { width: 180, height: 64 },
  },
];

export function getPaletteItem(type: NodeType): FlowchartPaletteItem {
  return (
    flowchartPalette.find((item) => item.legacyType === type) ??
    flowchartPalette[1]
  );
}

export function createLegacyPaletteNode(
  type: NodeType,
  position?: { x: number; y: number },
): FlowNode {
  const item = getPaletteItem(type);

  return {
    id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    position: position ?? {
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
    },
    data: {
      label: item.label,
      confidence: 1,
      meta: {
        paletteSource: item.legacyType,
      },
    },
  };
}
