"use client";

import { useMemo } from "react";
import type { DiagramDocument } from "@createflowchart/schema";
import { getDocumentBounds, renderDocumentToSvg } from "@createflowchart/render";
import styles from "./document-card-preview.module.css";

interface DocumentCardPreviewProps {
  document: DiagramDocument;
  className?: string;
}

export function DocumentCardPreview({
  document,
  className,
}: DocumentCardPreviewProps) {
  const bounds = useMemo(() => getDocumentBounds(document), [document]);
  const svg = useMemo(() => renderDocumentToSvg(document), [document]);
  const scale = Math.min(0.38, 260 / Math.max(bounds.width, bounds.height));

  return (
    <div className={className} aria-hidden="true">
      <div className={styles.frame}>
        <div className={styles.grid} />
        <div className={styles.viewport}>
          <div
            className={styles.canvas}
            style={{
              width: bounds.width,
              height: bounds.height,
              transform: `scale(${scale})`,
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      </div>
    </div>
  );
}
