"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import styles from "../../styles/nodes.module.css";

interface FlowNodeData {
  label: string;
  confidence?: number;
  [key: string]: unknown;
}

interface NodeRenderDefinition {
  type: string;
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
    const labelClassName = definition.labelClassName;

    return (
      <div
        className={`${styles.node} ${definition.className} ${
          selected ? styles.nodeSelected : ""
        } ${
          d.confidence !== undefined && d.confidence < 0.7
            ? styles.lowConfidence
            : ""
        }`}
      >
        <span className={`${styles.nodeIcon} ${definition.iconClassName}`}>
          {definition.icon}
        </span>
        {definition.handles.map((handle) => (
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
    type: "start",
    icon: "▶",
    className: styles.startNode,
    iconClassName: styles.startIcon,
    handles: [{ type: "source", position: Position.Bottom }],
  },
  process: {
    type: "process",
    icon: "⚙",
    className: styles.processNode,
    iconClassName: styles.processIcon,
    handles: [
      { type: "target", position: Position.Top },
      { type: "source", position: Position.Bottom },
    ],
  },
  decision: {
    type: "decision",
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
    type: "action",
    icon: "⚡",
    className: styles.actionNode,
    iconClassName: styles.actionIcon,
    handles: [
      { type: "target", position: Position.Top },
      { type: "source", position: Position.Bottom },
    ],
  },
  end: {
    type: "end",
    icon: "■",
    className: styles.endNode,
    iconClassName: styles.endIcon,
    handles: [{ type: "target", position: Position.Top }],
  },
};

export const nodeTypes = Object.fromEntries(
  Object.entries(nodeRenderRegistry).map(([type, definition]) => [
    type,
    createRegistryNode(definition),
  ]),
);
