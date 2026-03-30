"use client";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesInitialized,
  useReactFlow,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useEffect } from "react";
import {
  useEditorStore,
  useNodes,
  useEdges,
  useViewportFitRequest,
} from "../stores/editorStore";
import nodeTypes from "./nodes";
import styles from "../styles/canvas.module.css";
import { PresenceLayer } from "./PresenceLayer";
import { ContainerLayer } from "./ContainerLayer";

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

function CanvasViewportSync({
  fitRequest,
  nodeCount,
}: {
  fitRequest: number;
  nodeCount: number;
}) {
  const nodesInitialized = useNodesInitialized();
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (!fitRequest || !nodesInitialized || nodeCount === 0) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      void fitView({
        duration: 360,
        padding: 0.18,
        includeHiddenNodes: true,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [fitRequest, nodeCount, nodesInitialized, fitView]);

  return null;
}

export function Canvas({
  remoteUsers,
  updateLocalCursor,
  clearLocalCursor,
}: CanvasProps) {
  const nodes = useNodes();
  const edges = useEdges();

  const onNodesChange = useEditorStore((s) => s.onNodesChange);
  const onEdgesChange = useEditorStore((s) => s.onEdgesChange);
  const onConnect = useEditorStore((s) => s.onConnect);
  const onNodeDragStop = useEditorStore((s) => s.onNodeDragStop);
  const setSelectedNode = useEditorStore((s) => s.setSelectedNode);
  const setSelectedEdge = useEditorStore((s) => s.setSelectedEdge);
  const setSelectedContainer = useEditorStore((s) => s.setSelectedContainer);
  const viewportFitRequest = useViewportFitRequest();

  const onNodeClick: NodeMouseHandler = (_, node) => setSelectedNode(node.id);
  const onEdgeClick: EdgeMouseHandler = (_, edge) => setSelectedEdge(edge.id);
  const handleNodeDragStop = (event: React.MouseEvent | React.TouchEvent, node: Node) =>
    onNodeDragStop(event, node);

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
    <div
      className={styles.canvas}
      onPointerMove={handlePointerMove}
      onPointerLeave={clearLocalCursor}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={handleNodeDragStop}
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
        <CanvasViewportSync
          fitRequest={viewportFitRequest}
          nodeCount={nodes.length}
        />
        <ContainerLayer />
        <PresenceLayer users={remoteUsers} />
      </ReactFlow>
    </div>
  );
}
