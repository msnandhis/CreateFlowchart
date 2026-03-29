import type { ContainerDefinition } from "../registry";

export const containerPresets: ContainerDefinition[] = [
  {
    id: "bpmn-pool-container",
    family: "bpmn",
    type: "pool",
    displayName: "BPMN Pool",
    description: "Top-level BPMN pool for participants or systems",
    defaultWidth: 880,
    defaultHeight: 280,
    tags: ["bpmn", "pool", "container"],
  },
  {
    id: "bpmn-lane-container",
    family: "bpmn",
    type: "lane",
    displayName: "BPMN Lane",
    description: "Horizontal lane inside a BPMN pool",
    defaultWidth: 840,
    defaultHeight: 140,
    tags: ["bpmn", "lane", "container"],
  },
  {
    id: "swimlane-container",
    family: "swimlane",
    type: "lane",
    displayName: "Swimlane",
    description: "Cross-functional swimlane for roles or teams",
    defaultWidth: 840,
    defaultHeight: 160,
    tags: ["swimlane", "lane", "container"],
  },
];
