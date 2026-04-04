"use client";

import { useEffect, useCallback } from "react";
import { Diagram } from "@createflowchart/react";
import { useEditorStore } from "../stores/editorStore";
import styles from "../styles/canvas.module.css";
// import { PresenceLayer } from "./PresenceLayer";
// import { ContainerLayer } from "./ContainerLayer";

interface CanvasProps {
  remoteUsers: Map<
    number,
    {
      id: string;
      name: string;
      color: string;
      cursor?: { x: number; y: number };
      lastActive: number;
    }
  >;
  updateLocalCursor?: (x: number, y: number) => void;
  clearLocalCursor?: () => void;
}

export function Canvas({
  remoteUsers,
  updateLocalCursor,
  clearLocalCursor,
}: CanvasProps) {
  const engine = useEditorStore((s) => s.engine);
  const setSelectedNode = useEditorStore((s) => s.setSelectedNode);

  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    if (!updateLocalCursor) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    updateLocalCursor(x, y);
  }, [updateLocalCursor]);

  return (
    <div
      className={styles.canvas}
      onPointerMove={handlePointerMove}
      onPointerLeave={clearLocalCursor}
      style={{ position: 'relative', width: '100%', height: '100%', background: '#0b1020' }}
    >
      <Diagram 
        engine={engine} 
        onNodeClick={setSelectedNode} 
      />
    </div>
  );
}

