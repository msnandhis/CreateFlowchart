"use client";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useEditorStore, useNodes, useEdges } from "../stores/editorStore";
import { nodeTypes } from "./nodes";
import styles from "../styles/canvas.module.css";
import type { WebsocketProvider } from "y-websocket";
import { PresenceLayer } from "./PresenceLayer";
import { useMemo } from "react";

export function Canvas({ provider }: { provider: WebsocketProvider | null }) {
  const nodes = useNodes();
  const edges = useEdges();
  
  const onNodesChange = useEditorStore((s) => s.onNodesChange);
  const onEdgesChange = useEditorStore((s) => s.onEdgesChange);
  const onConnect = useEditorStore((s) => s.onConnect);
  const setSelectedNode = useEditorStore((s) => s.setSelectedNode);
  const setSelectedEdge = useEditorStore((s) => s.setSelectedEdge);

  const onNodeClick: NodeMouseHandler = (_, node) => setSelectedNode(node.id);
  const onEdgeClick: EdgeMouseHandler = (_, edge) => setSelectedEdge(edge.id);

  const onPaneClick = () => {
    setSelectedNode(null);
    setSelectedEdge(null);
  };

  /**
   * Track local mouse movement and broadcast to other users via Yjs awareness.
   */
  const handlePointerMove = (event: React.PointerEvent) => {
    if (!provider) return;
    
    // We update the awareness state with the local cursor position
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    provider.awareness.setLocalStateField("cursor", {
      x,
      y,
      name: "User", // TODO: Get from session
      color: "#3b82f6", // TODO: Assign random per user
    });
  };

  return (
    <div className={styles.canvas} onPointerMove={handlePointerMove}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        snapToGrid
        snapGrid={[20, 20]}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: false,
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--color-border)" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeWidth={2}
          pannable
          zoomable
          style={{ width: 160, height: 100 }}
        />
        <PresenceLayer provider={provider} />
      </ReactFlow>
    </div>
  );
}

