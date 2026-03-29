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
import { ContainerLayer } from "./ContainerLayer";

interface CanvasProps {
  provider: WebsocketProvider | null;
  updateLocalCursor?: (x: number, y: number) => void;
}

export function Canvas({ provider, updateLocalCursor }: CanvasProps) {
  const nodes = useNodes();
  const edges = useEdges();

  const onNodesChange = useEditorStore((s) => s.onNodesChange);
  const onEdgesChange = useEditorStore((s) => s.onEdgesChange);
  const onConnect = useEditorStore((s) => s.onConnect);
  const setSelectedNode = useEditorStore((s) => s.setSelectedNode);
  const setSelectedEdge = useEditorStore((s) => s.setSelectedEdge);
  const setSelectedContainer = useEditorStore((s) => s.setSelectedContainer);

  const onNodeClick: NodeMouseHandler = (_, node) => setSelectedNode(node.id);
  const onEdgeClick: EdgeMouseHandler = (_, edge) => setSelectedEdge(edge.id);

  const onPaneClick = () => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setSelectedContainer(null);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!updateLocalCursor) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    updateLocalCursor(x, y);
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
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--color-border)"
        />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeWidth={2}
          pannable
          zoomable
          style={{ width: 160, height: 100 }}
        />
        <ContainerLayer />
        <PresenceLayer provider={provider} />
      </ReactFlow>
    </div>
  );
}
