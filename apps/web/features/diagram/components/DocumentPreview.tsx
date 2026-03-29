"use client";

import { useMemo } from "react";
import type { DiagramDocument } from "@createflowchart/schema";
import { getDocumentBounds, renderDocumentToSvg } from "@createflowchart/render";
import styles from "./document-preview.module.css";

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
      className={styles.previewFrame}
      style={{ maxWidth, minHeight }}
    >
      <div className={styles.previewHeader}>
        <span>{document.family}</span>
        <span>
          {document.nodes.length} nodes / {document.edges.length} edges
        </span>
      </div>
      <div className={styles.previewViewport}>
        <div
          className={styles.previewCanvas}
          style={{ minWidth: bounds.width, minHeight: bounds.height }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}
