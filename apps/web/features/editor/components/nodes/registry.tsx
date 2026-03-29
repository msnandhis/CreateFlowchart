"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ShapePortAnchor } from "@createflowchart/schema";
import styles from "../../styles/nodes.module.css";
import { getPaletteItemByShapeId, getShapeDefinition } from "../../lib/flowchart-shapes";

interface DiagramNodeData {
  label: string;
  confidence?: number;
  family?: string;
  kind?: string;
  shapeId?: string;
  size?: {
    width: number;
    height: number;
  };
  style?: {
    fill?: string;
    stroke?: string;
    textColor?: string;
  };
  meta?: Record<string, unknown>;
}

function ConfidenceBadge({ confidence }: { confidence?: number }) {
  if (confidence === undefined || confidence >= 0.7) return null;
  return (
    <span className={styles.confidenceBadge}>
      {Math.round(confidence * 100)}%
    </span>
  );
}

function getGeometry(shapeId: string | undefined, meta?: Record<string, unknown>) {
  const definition = shapeId ? getShapeDefinition(shapeId) : null;
  const metadata = definition?.metadata as Record<string, unknown> | undefined;

  return {
    definition,
    geometry:
      (metadata?.geometry as string | undefined) ??
      (typeof meta?.geometry === "string" ? meta.geometry : "rect"),
    icon:
      (metadata?.icon as string | undefined) ??
      (typeof meta?.icon === "string" ? meta.icon : undefined),
  };
}

function getNodeTone(kind?: string) {
  if (!kind) return styles.processTone;
  if (kind.includes("start")) return styles.startTone;
  if (kind.includes("end")) return styles.endTone;
  if (kind.includes("decision") || kind.includes("gateway")) {
    return styles.decisionTone;
  }
  if (kind.includes("automation") || kind.includes("service")) {
    return styles.actionTone;
  }
  return styles.processTone;
}

function getGeometryClass(geometry: string) {
  switch (geometry) {
    case "pill":
      return styles.geometryPill;
    case "diamond":
      return styles.geometryDiamond;
    case "parallelogram":
      return styles.geometryParallelogram;
    case "document":
      return styles.geometryDocument;
    case "multi-document":
      return styles.geometryMultiDocument;
    case "cylinder":
      return styles.geometryCylinder;
    case "subprocess":
      return styles.geometrySubprocess;
    case "predefined-process":
      return styles.geometryPredefinedProcess;
    case "manual-input":
      return styles.geometryManualInput;
    case "display":
      return styles.geometryDisplay;
    case "hexagon":
      return styles.geometryHexagon;
    case "delay":
      return styles.geometryDelay;
    case "circle":
      return styles.geometryCircle;
    case "double-circle":
      return styles.geometryDoubleCircle;
    case "note":
      return styles.geometryNote;
    case "off-page-connector":
      return styles.geometryOffPageConnector;
    case "stored-data":
      return styles.geometryStoredData;
    case "pool":
      return styles.geometryPool;
    case "lane":
      return styles.geometryLane;
    default:
      return styles.geometryRect;
  }
}

function toHandlePosition(side: ShapePortAnchor["side"]) {
  switch (side) {
    case "top":
      return Position.Top;
    case "right":
      return Position.Right;
    case "bottom":
      return Position.Bottom;
    case "left":
      return Position.Left;
    default:
      return Position.Bottom;
  }
}

function buildHandles(anchors: ShapePortAnchor[], kind?: string) {
  const sourceOnly = kind?.includes("start");
  const targetOnly = kind?.includes("end");

  return anchors.map((anchor, index) => {
    const type: "source" | "target" =
      sourceOnly ? "source" : targetOnly ? "target" : index === 0 ? "target" : "source";

    return {
      id: anchor.id,
      type,
      position: toHandlePosition(anchor.side),
      style: {
        left: anchor.side === "top" || anchor.side === "bottom" ? `${anchor.x * 100}%` : undefined,
        top: anchor.side === "left" || anchor.side === "right" ? `${anchor.y * 100}%` : undefined,
      },
    };
  });
}

export const DiagramNodeRenderer = memo(function DiagramNodeRenderer({
  data,
  selected,
}: NodeProps) {
  const node = data as unknown as DiagramNodeData;
  const shapeId =
    typeof node.shapeId === "string"
      ? node.shapeId
      : typeof node.meta?.shapeId === "string"
        ? node.meta.shapeId
        : undefined;
  const { definition, geometry, icon } = getGeometry(shapeId, node.meta);
  const paletteItem = shapeId ? getPaletteItemByShapeId(shapeId) : null;
  const width = node.size?.width ?? definition?.defaultWidth ?? 180;
  const height = node.size?.height ?? definition?.defaultHeight ?? 64;
  const handles = buildHandles(definition?.portAnchors ?? [], node.kind);

  return (
    <div
      className={[
        styles.node,
        getNodeTone(node.kind),
        getGeometryClass(geometry),
        selected ? styles.nodeSelected : "",
        node.confidence !== undefined && node.confidence < 0.7 ? styles.lowConfidence : "",
      ].join(" ")}
      style={{
        width,
        minWidth: width,
        height,
        minHeight: height,
        background: node.style?.fill,
        borderColor: node.style?.stroke,
        color: node.style?.textColor,
      }}
      title={definition?.description ?? paletteItem?.description}
    >
      <span className={`${styles.nodeIcon} ${getNodeTone(node.kind)}`}>
        {paletteItem?.icon ?? icon ?? "□"}
      </span>
      {handles.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type={handle.type}
          position={handle.position}
          style={handle.style}
        />
      ))}
      <div className={styles.nodeContent}>
        <span className={styles.nodeLabel}>{node.label}</span>
        {definition ? (
          <span className={styles.nodeCaption}>
            {definition.displayName}
          </span>
        ) : null}
      </div>
      <ConfidenceBadge confidence={node.confidence} />
    </div>
  );
});

export const nodeTypes = {
  diagramNode: DiagramNodeRenderer,
};
