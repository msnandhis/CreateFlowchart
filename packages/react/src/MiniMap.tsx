import React, { useMemo } from "react";
import type { DiagramModel } from "@createflowchart/schema";
import { renderModelToSvg } from "@createflowchart/render/src/v3";

export interface MiniMapProps {
  model: DiagramModel;
  className?: string;
  style?: React.CSSProperties;
}

export function MiniMap({ model, className, style }: MiniMapProps) {
  const svgString = useMemo(() => {
    // Render without annotations or ports for minimap
    return renderModelToSvg(model, { showAnnotations: false, showPorts: false });
  }, [model]);

  return (
    <div 
      className={`cf-minimap absolute bottom-4 right-4 w-48 h-32 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-lg shadow-xl overflow-hidden ${className || ""}`}
      style={style}
    >
      <div 
        className="w-full h-full scale-[0.25] transform origin-top-left pointer-events-none"
        dangerouslySetInnerHTML={{ __html: svgString }}
      />
    </div>
  );
}
