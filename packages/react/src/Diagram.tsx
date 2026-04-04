import React, { useEffect, useRef, useState } from "react";
import { DiagramModel, DiagramEngine, createEngine } from "@createflowchart/schema";
import { CanvasRenderer, ToolManager } from "@createflowchart/render";
import { createLayoutEngine } from "@createflowchart/layout";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DiagramEngine | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const toolManagerRef = useRef<ToolManager | null>(null);

  const [model, setModel] = useState<DiagramModel>(initialModel);

  // 1. Initialize Engine & Canvas Pipeline
  useEffect(() => {
    if (!canvasRef.current) return;

    // Create DiagramEngine
    const engine = createEngine({ initialModel });
    engineRef.current = engine;

    // Create Renderer
    const renderer = new CanvasRenderer(canvasRef.current);
    rendererRef.current = renderer;
    renderer.setModel(engine.getModel());

    // Create ToolManager
    const toolManager = new ToolManager(canvasRef.current, renderer, engine);
    toolManagerRef.current = toolManager;

    // Bind engine changes to state and renderer
    const unsubscribe = engine.on("modelChanged", () => {
      const updatedModel = engine.getModel();
      setModel(updatedModel);
      renderer.setModel(updatedModel);
      onModelChange?.(updatedModel);
    });

    const unsubscribeClick = engine.on("selection:changed", (event: any) => {
      if (event.payload?.ids?.length === 1) {
        onNodeClick?.(event.payload.ids[0]);
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
      unsubscribeClick();
      toolManager.destroy();
      renderer.destroy();
      engineRef.current = null;
      rendererRef.current = null;
      toolManagerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run essentially once on mount

  // 2. Handle programmatic model updates from props (e.g. initial generation)
  // If the parent passes a completely new initialModel that isn't our internal state
  useEffect(() => {
    if (initialModel !== model && engineRef.current) {
      engineRef.current.batch("Update model from props", (e) => {
        // Simple full replacement for MVP. A robust version would diff.
        // Or if we trust Yjs, we listen to Yjs events instead.
        e.replaceModel(initialModel);
      });
    }
  }, [initialModel, model]);

  // 3. Handle Auto-Layout
  useEffect(() => {
    if (layout && engineRef.current) {
      const layoutEngine = createLayoutEngine();
      try {
        const currentModel = engineRef.current.getModel();
        const newModel = layoutEngine.applyAlgorithm(layout, currentModel, layoutOptions);
        
        // Push layout changes into engine
        engineRef.current.batch("Auto Layout", (e) => {
          for (const node of newModel.nodes) {
            e.moveNode(node.id, node.position);
          }
        });
      } catch (err) {
        console.error("Layout failed:", err);
      }
    }
  }, [layout, layoutOptions, model.nodes.length]);

  return (
    <div 
      className={`cf-diagram-wrapper relative w-full h-full overflow-hidden ${className || ""}`}
      style={style}
    >
      <canvas 
        ref={canvasRef} 
        style={{ width: "100%", height: "100%", touchAction: "none" }} 
      />
    </div>
  );
}

