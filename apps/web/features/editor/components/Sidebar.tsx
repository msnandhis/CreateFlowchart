"use client";

import { useMemo, useState } from "react";
import {
  useSelectedDocumentNode,
  useEditorStore,
} from "../stores/editorStore";
import { Input } from "@/shared/ui/Input";
import styles from "../styles/sidebar.module.css";
import {
  createLegacyPaletteNode,
  flowchartPalette,
  getPaletteItemByShapeId,
} from "../lib/flowchart-shapes";
import { ActionNodeConfigPanel } from "./ActionNodeConfigPanel";

export function Sidebar() {
  const selectedNode = useSelectedDocumentNode();
  const updateNodeLabel = useEditorStore((s) => s.updateNodeLabel);
  const updateNodeShape = useEditorStore((s) => s.updateNodeShape);
  const updateNodeSize = useEditorStore((s) => s.updateNodeSize);
  const updateNodeAutomation = useEditorStore((s) => s.updateNodeAutomation);
  const addNode = useEditorStore((s) => s.addNode);
  const [showAutomationConfig, setShowAutomationConfig] = useState(false);

  const selectedShape = useMemo(
    () =>
      selectedNode ? getPaletteItemByShapeId(selectedNode.shape) : null,
    [selectedNode],
  );

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
              <select
                value={selectedNode.shape}
                onChange={(e) => updateNodeShape(selectedNode.id, e.target.value)}
                className={styles.select}
              >
                {flowchartPalette.map((item) => (
                  <option key={item.shapeId} value={item.shapeId}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
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
            <div style={{ marginTop: "1rem" }}>
              <div className={styles.sectionTitle}>Width</div>
              <input
                type="number"
                value={Math.round(selectedNode.size.width)}
                onChange={(e) =>
                  updateNodeSize(selectedNode.id, {
                    width: Math.max(48, Number(e.target.value) || 48),
                    height: selectedNode.size.height,
                  })
                }
                className={styles.titleInput}
              />
            </div>
            <div style={{ marginTop: "1rem" }}>
              <div className={styles.sectionTitle}>Height</div>
              <input
                type="number"
                value={Math.round(selectedNode.size.height)}
                onChange={(e) =>
                  updateNodeSize(selectedNode.id, {
                    width: selectedNode.size.width,
                    height: Math.max(40, Number(e.target.value) || 40),
                  })
                }
                className={styles.titleInput}
              />
            </div>
            {selectedNode.ai?.confidence !== undefined && (
              <div style={{ marginTop: "1rem" }}>
                <div className={styles.sectionTitle}>Confidence</div>
                <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                  {Math.round(selectedNode.ai.confidence * 100)}%
                </div>
              </div>
            )}
            {(selectedNode.kind === "automation-task" ||
              selectedShape?.shapeId === "action-task") && (
              <div style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className={styles.draggableNode}
                  onClick={() => setShowAutomationConfig(true)}
                >
                  Configure Automation
                </button>
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
      {selectedNode && showAutomationConfig && (
        <ActionNodeConfigPanel
          nodeId={selectedNode.id}
          config={
            selectedNode.automation?.endpoint
              ? {
                  webhook_url: selectedNode.automation.endpoint,
                  method:
                    selectedNode.automation.method === "PATCH"
                      ? "POST"
                      : selectedNode.automation.method ?? "POST",
                  headers: selectedNode.automation.headers,
                  payload_template: selectedNode.automation.payloadTemplate,
                }
              : undefined
          }
          onSave={(config) => {
            updateNodeAutomation(selectedNode.id, config);
            setShowAutomationConfig(false);
          }}
          onCancel={() => setShowAutomationConfig(false)}
        />
      )}
    </aside>
  );
}
