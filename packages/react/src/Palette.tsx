import React from "react";
import type { ShapeDefinition, DiagramKit } from "@createflowchart/schema";

export interface PaletteProps {
  shapes?: ShapeDefinition[];
  kits?: DiagramKit[];
  onShapeDragStart?: (shapeId: string) => void;
  className?: string;
}

export function Palette({ shapes = [], kits = [], onShapeDragStart, className }: PaletteProps) {
  return (
    <div className={`cf-palette flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-4 ${className || ""}`}>
      <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Shapes</h3>
      <div className="grid grid-cols-2 gap-2">
        {shapes.map((shape) => (
          <div
            key={shape.id}
            className="cf-palette-item flex flex-col items-center justify-center p-3 rounded bg-slate-800 border border-slate-700 cursor-grab hover:bg-slate-700 transition-colors"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/cf-shape", shape.id);
              onShapeDragStart?.(shape.id);
            }}
          >
            <span className="text-2xl mb-1">{shape.metadata?.icon || "⬜"}</span>
            <span className="text-xs text-slate-400 text-center">{shape.displayName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
