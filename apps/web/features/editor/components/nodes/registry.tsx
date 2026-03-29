"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import styles from "../../styles/nodes.module.css";
import { getPaletteItemByShapeId } from "../../lib/flowchart-shapes";

interface FlowNodeData {
  label: string;
  confidence?: number;
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

interface NodeRenderDefinition {
  icon: string;
  className: string;
  iconClassName: string;
  handles: Array<{
    type: "source" | "target";
    position: Position;
    id?: string;
  }>;
  labelClassName?: string;
}

function ConfidenceBadge({ confidence }: { confidence?: number }) {
  if (confidence === undefined || confidence >= 0.7) return null;
  return (
    <span className={styles.confidenceBadge}>
      {Math.round(confidence * 100)}%
    </span>
  );
}

function createRegistryNode(definition: NodeRenderDefinition) {
  return memo(function RegistryNode({ data, selected }: NodeProps) {
    const d = data as FlowNodeData;
    const shapeId =
      typeof d.meta?.shapeId === "string" ? d.meta.shapeId : undefined;
    const shapeItem = shapeId ? getPaletteItemByShapeId(shapeId) : null;
    const renderVariant =
      shapeItem?.shapeId === "document"
        ? "document"
        : shapeItem?.shapeId === "data"
          ? "data"
          : shapeItem?.shapeId === "database"
            ? "database"
            : shapeItem?.shapeId === "subprocess"
              ? "subprocess"
              : shapeItem?.shapeId === "manual-input"
                ? "manual-input"
                : shapeItem?.shapeId === "display"
                  ? "display"
                  : shapeItem?.shapeId === "connector"
                    ? "connector"
                    : null;

    const activeDefinition =
      renderVariant && nodeRenderRegistry[renderVariant]
        ? nodeRenderRegistry[renderVariant]
        : definition;
    const labelClassName = activeDefinition.labelClassName;

    return (
      <div
        className={`${styles.node} ${activeDefinition.className} ${
          selected ? styles.nodeSelected : ""
        } ${
          d.confidence !== undefined && d.confidence < 0.7
            ? styles.lowConfidence
            : ""
        }`}
      >
        <span className={`${styles.nodeIcon} ${activeDefinition.iconClassName}`}>
          {shapeItem?.icon ?? activeDefinition.icon}
        </span>
        {activeDefinition.handles.map((handle) => (
          <Handle
            key={`${handle.type}-${handle.position}-${handle.id ?? "default"}`}
            type={handle.type}
            position={handle.position}
            id={handle.id}
          />
        ))}
        {labelClassName ? (
          <span className={labelClassName}>{d.label}</span>
        ) : (
          d.label
        )}
        <ConfidenceBadge confidence={d.confidence} />
      </div>
    );
  });
}

export const nodeRenderRegistry: Record<string, NodeRenderDefinition> = {
  start: {
    icon: "▶",
    className: styles.startNode,
    iconClassName: styles.startIcon,
    handles: [{ type: "source", position: Position.Bottom }],
  },
  process: {
    icon: "⚙",
    className: styles.processNode,
    iconClassName: styles.processIcon,
    handles: [
      { type: "target", position: Position.Top },
      { type: "source", position: Position.Bottom },
    ],
  },
  decision: {
    icon: "◆",
    className: styles.decisionNode,
    iconClassName: styles.decisionIcon,
    handles: [
      { type: "target", position: Position.Top },
      { type: "source", position: Position.Bottom },
      { type: "source", position: Position.Right, id: "right" },
    ],
    labelClassName: styles.decisionLabel,
  },
  action: {
    icon: "⚡",
    className: styles.actionNode,
    iconClassName: styles.actionIcon,
    handles: [
      { type: "target", position: Position.Top },
      { type: "source", position: Position.Bottom },
    ],
  },
  end: {
    icon: "■",
    className: styles.endNode,
    iconClassName: styles.endIcon,
    handles: [{ type: "target", position: Position.Top }],
  },
  document: {
    icon: "📄",
    className: styles.processNode,
    iconClassName: styles.processIcon,
    handles: [
      { type: "target", position: Position.Top },
      { type: "source", position: Position.Bottom },
    ],
  },
  data: {
    icon: "⬒",
    className: styles.processNode,
    iconClassName: styles.processIcon,
    handles: [
      { type: "target", position: Position.Top },
      { type: "source", position: Position.Bottom },
    ],
  },
  database: {
    icon: "🛢",
    className: styles.processNode,
    iconClassName: styles.processIcon,
    handles: [
      { type: "target", position: Position.Top },
      { type: "source", position: Position.Bottom },
    ],
  },
  subprocess: {
    icon: "▤",
    className: styles.processNode,
    iconClassName: styles.processIcon,
    handles: [
      { type: "target", position: Position.Top },
      { type: "source", position: Position.Bottom },
    ],
  },
  "manual-input": {
    icon: "⌨",
    className: styles.processNode,
    iconClassName: styles.processIcon,
    handles: [
      { type: "target", position: Position.Top },
      { type: "source", position: Position.Bottom },
    ],
  },
  display: {
    icon: "🖵",
    className: styles.processNode,
    iconClassName: styles.processIcon,
    handles: [
      { type: "target", position: Position.Top },
      { type: "source", position: Position.Bottom },
    ],
  },
  connector: {
    icon: "○",
    className: styles.processNode,
    iconClassName: styles.processIcon,
    handles: [
      { type: "target", position: Position.Top },
      { type: "source", position: Position.Bottom },
    ],
  },
};

export const nodeTypes = Object.fromEntries(
  Object.entries(nodeRenderRegistry).map(([type, definition]) => [
    type,
    createRegistryNode(definition),
  ]),
);
