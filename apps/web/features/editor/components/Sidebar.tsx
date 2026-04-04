"use client";

import { useMemo, useState } from "react";
import {
  useSelectedDocumentNode,
  useEditorStore,
  useSelectedDocumentEdge,
} from "../stores/editorStore";
import { Input } from "@/shared/ui/Input";
import styles from "../styles/sidebar.module.css";
import {
  getPaletteItemByShapeId,
  paletteSections,
  createLegacyPaletteNode,
} from "../lib/flowchart-shapes";
import { ActionNodeConfigPanel } from "./ActionNodeConfigPanel";

const EDGE_ROUTINGS = ["straight", "orthogonal", "smooth", "bezier"] as const;
const EDGE_MARKERS = ["none", "arrow", "diamond", "circle"] as const;

function StyleInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.controlGroup}>
      <span className={styles.controlLabel}>{label}</span>
      <input
        type="text"
        value={value ?? ""}
        placeholder="auto"
        onChange={(event) => onChange(event.target.value)}
        className={styles.titleInput}
      />
    </label>
  );
}

export function Sidebar() {
  const selectedNode = useSelectedDocumentNode();
  const selectedEdge = useSelectedDocumentEdge();
  const engine = useEditorStore((s) => s.engine);
  
  const updateNodeLabel = useEditorStore((s) => s.updateNodeLabel);
  const updateNodeShape = useEditorStore((s) => s.updateNodeShape);
  const updateNodeSize = useEditorStore((s) => s.updateNodeSize);
  const updateNodeStyle = useEditorStore((s) => s.updateNodeStyle);
  const updateEdgeLabel = useEditorStore((s) => s.updateEdgeLabel);
  const addNode = useEditorStore((s) => s.addNode);
  const updateNodeAutomation = useEditorStore((s) => s.updateNodeAutomation);
  
  const [showAutomationConfig, setShowAutomationConfig] = useState(false);

  const selectedShape = useMemo(
    () => (selectedNode ? getPaletteItemByShapeId(selectedNode.shape) : null),
    [selectedNode],
  );

  const validationIssues = useMemo(() => engine.getIssues(), [engine, engine.model]);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>Properties</div>
      <div className={styles.content}>
        {selectedNode ? (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Node Config</div>
            <Input
              label="Label"
              value={selectedNode.label}
              onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
            />
            
            <div className={styles.stackBlock}>
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

            <div className={styles.stackBlock}>
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
            <div className={styles.stackBlock}>
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

            <div className={styles.stackBlock}>
              <div className={styles.sectionTitle}>Style</div>
              <StyleInput
                label="Fill"
                value={selectedNode.style.fill}
                onChange={(value) =>
                  updateNodeStyle(selectedNode.id, { fill: value || undefined })
                }
              />
              <StyleInput
                label="Stroke"
                value={selectedNode.style.stroke}
                onChange={(value) =>
                  updateNodeStyle(selectedNode.id, { stroke: value || undefined })
                }
              />
              <StyleInput
                label="Text"
                value={selectedNode.style.textColor}
                onChange={(value) =>
                  updateNodeStyle(selectedNode.id, { textColor: value || undefined })
                }
              />
            </div>

            {(selectedNode.shape === "action-task" || selectedNode.shape === "bpmn-service-task") && (
              <div className={styles.stackBlock}>
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
        ) : selectedEdge ? (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Edge Config</div>
            <Input
              label="Label"
              value={selectedEdge.label ?? ""}
              onChange={(e) => updateEdgeLabel(selectedEdge.id, e.target.value)}
            />
            <div className={styles.stackBlock}>
              <div className={styles.sectionTitle}>Routing</div>
              <div className={styles.metaValue}>{selectedEdge.routing}</div>
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>Select a node or edge to edit its properties</p>
          </div>
        )}

        <div className={styles.separator} />

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Library</div>
          {paletteSections.map((section) => (
            <div key={section.id} style={{ marginBottom: "1.5rem" }}>
              <div className={styles.sectionSubTitle}>{section.title}</div>
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
          <div className={styles.sectionTitle}>Validation</div>
          {validationIssues.length === 0 ? (
            <div className={styles.metaValue}>No structural issues detected</div>
          ) : (
            <div className={styles.issueList}>
              {validationIssues.slice(0, 8).map((issue, index) => (
                <div
                  key={`${issue.code}-${issue.entityId ?? "global"}-${index}`}
                  className={`${styles.issueItem} ${styles[`issue${issue.severity[0].toUpperCase()}${issue.severity.slice(1)}`]}`}
                >
                  <strong>{issue.severity}</strong> {issue.message}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedNode && showAutomationConfig && (
        <ActionNodeConfigPanel
          nodeId={selectedNode.id}
          config={selectedNode.automation}
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
