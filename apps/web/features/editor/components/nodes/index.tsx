"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import styles from "../../styles/nodes.module.css";

// ─── Shared base for all nodes ──────────────────────────────────
interface FlowNodeData {
  label: string;
  confidence?: number;
  [key: string]: unknown;
}

function ConfidenceBadge({ confidence }: { confidence?: number }) {
  if (confidence === undefined || confidence >= 0.7) return null;
  return (
    <span className={styles.confidenceBadge}>
      {Math.round(confidence * 100)}%
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Start Node — Green pill
// ═══════════════════════════════════════════════════════════════════
export const StartNode = memo(function StartNode({ data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  return (
    <div className={`${styles.node} ${styles.startNode} ${selected ? styles.nodeSelected : ""} ${d.confidence !== undefined && d.confidence < 0.7 ? styles.lowConfidence : ""}`}>
      <span className={`${styles.nodeIcon} ${styles.startIcon}`}>▶</span>
      <Handle type="source" position={Position.Bottom} />
      {d.label}
      <ConfidenceBadge confidence={d.confidence} />
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// Process Node — Blue rectangle
// ═══════════════════════════════════════════════════════════════════
export const ProcessNode = memo(function ProcessNode({ data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  return (
    <div className={`${styles.node} ${styles.processNode} ${selected ? styles.nodeSelected : ""} ${d.confidence !== undefined && d.confidence < 0.7 ? styles.lowConfidence : ""}`}>
      <span className={`${styles.nodeIcon} ${styles.processIcon}`}>⚙</span>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      {d.label}
      <ConfidenceBadge confidence={d.confidence} />
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// Decision Node — Purple diamond
// ═══════════════════════════════════════════════════════════════════
export const DecisionNode = memo(function DecisionNode({ data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  return (
    <div className={`${styles.node} ${styles.decisionNode} ${selected ? styles.nodeSelected : ""} ${d.confidence !== undefined && d.confidence < 0.7 ? styles.lowConfidence : ""}`}>
      <span className={`${styles.nodeIcon} ${styles.decisionIcon}`}>◆</span>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <Handle type="source" position={Position.Right} id="right" />
      <span className={styles.decisionLabel}>{d.label}</span>
      <ConfidenceBadge confidence={d.confidence} />
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// Action Node — Orange rectangle with webhook icon
// ═══════════════════════════════════════════════════════════════════
export const ActionNode = memo(function ActionNode({ data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  return (
    <div className={`${styles.node} ${styles.actionNode} ${selected ? styles.nodeSelected : ""} ${d.confidence !== undefined && d.confidence < 0.7 ? styles.lowConfidence : ""}`}>
      <span className={`${styles.nodeIcon} ${styles.actionIcon}`}>⚡</span>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      {d.label}
      <ConfidenceBadge confidence={d.confidence} />
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// End Node — Red pill
// ═══════════════════════════════════════════════════════════════════
export const EndNode = memo(function EndNode({ data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  return (
    <div className={`${styles.node} ${styles.endNode} ${selected ? styles.nodeSelected : ""} ${d.confidence !== undefined && d.confidence < 0.7 ? styles.lowConfidence : ""}`}>
      <span className={`${styles.nodeIcon} ${styles.endIcon}`}>■</span>
      <Handle type="target" position={Position.Top} />
      {d.label}
      <ConfidenceBadge confidence={d.confidence} />
    </div>
  );
});

// ─── Node type registry for React Flow ──────────────────────────
export const nodeTypes = {
  start: StartNode,
  process: ProcessNode,
  decision: DecisionNode,
  action: ActionNode,
  end: EndNode,
};
