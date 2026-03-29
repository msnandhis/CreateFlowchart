"use client";

import { useMemo } from "react";
import type { DiagramDocument } from "@createflowchart/schema";
import { getDocumentBounds, renderDocumentToSvg } from "@createflowchart/render";

interface DocumentPreviewProps {
  document: DiagramDocument;
  maxWidth?: number | string;
  minHeight?: number | string;
}

export function DocumentPreview({
  document,
  maxWidth = "100%",
  minHeight = 360,
}: DocumentPreviewProps) {
  const bounds = useMemo(() => getDocumentBounds(document), [document]);
  const svg = useMemo(() => renderDocumentToSvg(document), [document]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth,
        minHeight,
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid rgba(148, 163, 184, 0.18)",
        background: "linear-gradient(180deg, #0b1020 0%, #0f172a 100%)",
        boxShadow: "0 24px 80px rgba(2, 6, 23, 0.28)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
          color: "rgba(226, 232, 240, 0.82)",
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        <span>{document.family}</span>
        <span>
          {document.nodes.length} nodes / {document.edges.length} edges
        </span>
      </div>
      <div
        style={{
          overflow: "auto",
          padding: 16,
        }}
      >
        <div
          style={{
            minWidth: bounds.width,
            minHeight: bounds.height,
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}
