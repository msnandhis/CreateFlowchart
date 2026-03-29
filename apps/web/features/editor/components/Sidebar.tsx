"use client";

import { useMemo, useState } from "react";
import {
  useSelectedDocumentContainer,
  useSelectedDocumentNode,
  useEditorStore,
} from "../stores/editorStore";
import { Input } from "@/shared/ui/Input";
import styles from "../styles/sidebar.module.css";
import {
  containerPalette,
  createLegacyPaletteNode,
  createPaletteContainer,
  getPaletteItemByShapeId,
  paletteSections,
} from "../lib/flowchart-shapes";
import { ActionNodeConfigPanel } from "./ActionNodeConfigPanel";

export function Sidebar() {
  const selectedNode = useSelectedDocumentNode();
  const selectedContainer = useSelectedDocumentContainer();
  const updateNodeLabel = useEditorStore((s) => s.updateNodeLabel);
  const updateNodeShape = useEditorStore((s) => s.updateNodeShape);
  const updateNodeSize = useEditorStore((s) => s.updateNodeSize);
  const updateNodeAutomation = useEditorStore((s) => s.updateNodeAutomation);
  const assignNodeContainer = useEditorStore((s) => s.assignNodeContainer);
  const addNode = useEditorStore((s) => s.addNode);
  const addContainer = useEditorStore((s) => s.addContainer);
  const updateContainerLabel = useEditorStore((s) => s.updateContainerLabel);
  const updateContainerSize = useEditorStore((s) => s.updateContainerSize);
  const containers = useEditorStore((s) => s.document.containers);
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
                {paletteSections.map((section) => (
                  <optgroup key={section.id} label={section.title}>
                    {section.items.map((item) => (
                      <option key={item.shapeId} value={item.shapeId}>
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <div className={styles.sectionTitle}>Diagram Family</div>
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                {selectedShape?.family ?? selectedNode.family}
              </div>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <div className={styles.sectionTitle}>Kit</div>
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                {selectedShape?.kit ?? "core-flowchart"}
              </div>
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
              <div className={styles.sectionTitle}>Container</div>
              <select
                value={
                  typeof selectedNode.metadata.parentContainerId === "string"
                    ? selectedNode.metadata.parentContainerId
                    : ""
                }
                onChange={(e) =>
                  assignNodeContainer(
                    selectedNode.id,
                    e.target.value ? e.target.value : null,
                  )
                }
                className={styles.select}
              >
                <option value="">No Container</option>
                {containers.map((container) => (
                  <option key={container.id} value={container.id}>
                    {container.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <div className={styles.sectionTitle}>Geometry</div>
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                {selectedShape?.geometry ?? "rect"}
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
            <div style={{ marginTop: "1rem" }}>
              <div className={styles.sectionTitle}>Resize Policy</div>
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                {selectedNode.resizePolicy}
              </div>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <div className={styles.sectionTitle}>Ports</div>
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                {selectedNode.ports.length}
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
                {selectedNode.automation?.endpoint ? (
                  <div style={{ marginTop: "0.75rem", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
                    <div>{selectedNode.automation.method ?? "POST"} {selectedNode.automation.endpoint}</div>
                    {selectedNode.automation.payloadTemplate ? (
                      <div style={{ marginTop: "0.375rem" }}>Payload template attached</div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : selectedContainer ? (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Container Config</div>
            <Input
              label="Label"
              value={selectedContainer.label}
              onChange={(e) =>
                updateContainerLabel(selectedContainer.id, e.target.value)
              }
            />
            <div style={{ marginTop: "1rem" }}>
              <div className={styles.sectionTitle}>Family</div>
              <div className={styles.metaValue}>{selectedContainer.family}</div>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <div className={styles.sectionTitle}>Type</div>
              <div className={styles.metaValue}>{selectedContainer.type}</div>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <div className={styles.sectionTitle}>Width</div>
              <input
                type="number"
                value={Math.round(selectedContainer.size.width)}
                onChange={(e) =>
                  updateContainerSize(selectedContainer.id, {
                    width: Math.max(160, Number(e.target.value) || 160),
                    height: selectedContainer.size.height,
                  })
                }
                className={styles.titleInput}
              />
            </div>
            <div style={{ marginTop: "1rem" }}>
              <div className={styles.sectionTitle}>Height</div>
              <input
                type="number"
                value={Math.round(selectedContainer.size.height)}
                onChange={(e) =>
                  updateContainerSize(selectedContainer.id, {
                    width: selectedContainer.size.width,
                    height: Math.max(80, Number(e.target.value) || 80),
                  })
                }
                className={styles.titleInput}
              />
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>Select a node or container to edit its properties</p>
          </div>
        )}

        <div className={styles.separator} />

        <div className={styles.section}>
          {paletteSections.map((section) => (
            <div key={section.id} style={{ marginBottom: "1rem" }}>
              <div className={styles.sectionTitle}>{section.title}</div>
              <div className={styles.nodeList}>
                {section.items.map((item) => (
                  <button
                    key={item.shapeId}
                    type="button"
                    className={styles.draggableNode}
                    onClick={() => addNode(createLegacyPaletteNode(item.shapeId))}
                    title={item.description}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Add Containers</div>
          <div className={styles.nodeList}>
            {containerPalette.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.draggableNode}
                onClick={() => addContainer(createPaletteContainer(item.id))}
                title={item.description}
              >
                {item.label}
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
                  method: selectedNode.automation.method ?? "POST",
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
