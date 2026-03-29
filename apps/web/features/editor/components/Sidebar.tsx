"use client";

import { useSelectedNode, useEditorStore } from "../stores/editorStore";
import { Input } from "@/shared/ui/Input";
import styles from "../styles/sidebar.module.css";

export function Sidebar() {
  const selectedNode = useSelectedNode();
  const updateNodeLabel = useEditorStore((s) => s.updateNodeLabel);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>Properties</div>
      <div className={styles.content}>
        {selectedNode ? (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Node Config</div>
            <Input
              label="Label"
              value={selectedNode.data.label as string}
              onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
            />
            <div style={{ marginTop: "1rem" }}>
              <div className={styles.sectionTitle}>Type</div>
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                {selectedNode.type}
              </div>
            </div>
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
            <div className={styles.draggableNode}>Process Node</div>
            <div className={styles.draggableNode}>Decision Node</div>
            <div className={styles.draggableNode}>Action Node</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
