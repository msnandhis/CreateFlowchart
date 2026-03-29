"use client";

import {
  useSelectedDocumentNode,
  useEditorStore,
} from "../stores/editorStore";
import { Input } from "@/shared/ui/Input";
import styles from "../styles/sidebar.module.css";
import { createLegacyPaletteNode, flowchartPalette } from "../lib/flowchart-shapes";

export function Sidebar() {
  const selectedNode = useSelectedDocumentNode();
  const updateNodeLabel = useEditorStore((s) => s.updateNodeLabel);
  const addNode = useEditorStore((s) => s.addNode);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>Properties</div>
      <div className={styles.content}>
        {selectedNode ? (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Node Config</div>
            <Input
              label="Label"
              value={selectedNode.content.title}
              onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
            />
            <div style={{ marginTop: "1rem" }}>
              <div className={styles.sectionTitle}>Shape</div>
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                {selectedNode.shape}
              </div>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <div className={styles.sectionTitle}>Semantic Kind</div>
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                {selectedNode.kind}
              </div>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <div className={styles.sectionTitle}>Family</div>
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                {selectedNode.family}
              </div>
            </div>
            {selectedNode.ai?.confidence !== undefined && (
              <div style={{ marginTop: "1rem" }}>
                <div className={styles.sectionTitle}>Confidence</div>
                <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                  {Math.round(selectedNode.ai.confidence * 100)}%
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>Select a node to edit its properties</p>
          </div>
        )}

        <div className={styles.separator} />

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Add Nodes</div>
          <div className={styles.nodeList}>
            {flowchartPalette.map((item) => (
              <button
                key={item.legacyType}
                type="button"
                className={styles.draggableNode}
                onClick={() => addNode(createLegacyPaletteNode(item.legacyType))}
                title={item.description}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
