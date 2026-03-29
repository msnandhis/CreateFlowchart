"use client";

import { useMemo } from "react";
import type { DiagramDocument } from "@createflowchart/schema";
import { getDocumentBounds, renderDocumentToSvg } from "@createflowchart/render";

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

  return (
    <div className={className} aria-hidden="true">
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(circle at top left, rgba(14, 165, 233, 0.16), transparent 36%), linear-gradient(180deg, #0f172a 0%, #111827 100%)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.1,
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.25) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: 14,
            transform: "scale(0.34)",
            transformOrigin: "top left",
            width: bounds.width,
            height: bounds.height,
            pointerEvents: "none",
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}
