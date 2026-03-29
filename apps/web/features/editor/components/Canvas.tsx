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

export function Canvas() {
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

  return (
    <div className={styles.canvas}>
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
      </ReactFlow>
    </div>
  );
}
