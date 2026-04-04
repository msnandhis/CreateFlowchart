import React, { useEffect, useMemo, useRef, useState } from "react";
import { DiagramModel, DiagramEngine, createEngine, LayoutAlgorithm } from "@createflowchart/schema";
import { renderModelToSvg } from "@createflowchart/render/src/v3";
import { LayoutEngine } from "@createflowchart/layout/src/engine";

export interface DiagramProps {
  model: DiagramModel;
  layout?: string;
  layoutOptions?: any;
  onModelChange?: (model: DiagramModel) => void;
  onNodeClick?: (nodeId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function Diagram({
  model: initialModel,
  layout,
  layoutOptions,
  onModelChange,
  onNodeClick,
  className,
  style,
}: DiagramProps) {
  // We initialize the engine once
  const engineRef = useRef<DiagramEngine | null>(null);
  const [model, setModel] = useState<DiagramModel>(initialModel);

  // Re-sync engine when initialModel props change radically,
  // but generally DiagramEngine manages the state.
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = createEngine({ initialModel });
      engineRef.current.on("modelChanged", (event) => {
        const m = engineRef.current!.getModel();
        setModel(m);
        onModelChange?.(m);
      });
    }
  }, [initialModel, onModelChange]);

  // Handle auto-layout
  useEffect(() => {
    if (layout && engineRef.current) {
      const layoutEngine = new LayoutEngine();
      // Apply layout
      try {
        const newModel = layoutEngine.layout(engineRef.current.getModel(), layout, layoutOptions);
        // We'd ideally dispatch this through the engine's command system
        // For MVP wrapper we just update state
        setModel(newModel);
      } catch (err) {
        console.error("Layout failed:", err);
      }
    }
  }, [layout, layoutOptions, model.nodes.length]);

  // Render to SVG
  const svgString = useMemo(() => {
    return renderModelToSvg(model, { showPorts: false });
  }, [model]);

  return (
    <div 
      className={className} 
      style={{ width: "100%", height: "100%", overflow: "auto", ...style }}
      dangerouslySetInnerHTML={{ __html: svgString }}
      onClick={(e) => {
        // Basic delegation for click events
        const target = e.target as HTMLElement;
        const nodeG = target.closest(".cf-node") as HTMLElement;
        if (nodeG) {
          const id = nodeG.getAttribute("data-id");
          if (id) onNodeClick?.(id);
        }
      }}
    />
  );
}
