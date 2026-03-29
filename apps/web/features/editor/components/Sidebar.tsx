"use client";

import { useMemo, useState } from "react";
import {
  useSelectedDocumentContainer,
  useSelectedDocumentEdge,
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
import { basicDocumentValidator } from "@createflowchart/engine";

const EDGE_ROUTINGS = ["straight", "orthogonal", "smooth", "bezier", "manual"] as const;
const EDGE_MARKERS = ["none", "arrow", "diamond", "circle", "triangle"] as const;
const EDGE_KINDS = ["flow", "conditional-flow", "message-flow", "association", "annotation-link"] as const;

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
  const selectedContainer = useSelectedDocumentContainer();
  const document = useEditorStore((s) => s.document);
  const updateNodeLabel = useEditorStore((s) => s.updateNodeLabel);
  const updateNodeShape = useEditorStore((s) => s.updateNodeShape);
  const updateNodeSize = useEditorStore((s) => s.updateNodeSize);
  const updateNodeStyle = useEditorStore((s) => s.updateNodeStyle);
  const updateEdgeLabel = useEditorStore((s) => s.updateEdgeLabel);
  const updateEdgeKind = useEditorStore((s) => s.updateEdgeKind);
  const updateEdgeRouting = useEditorStore((s) => s.updateEdgeRouting);
  const updateEdgeMarkers = useEditorStore((s) => s.updateEdgeMarkers);
  const updateNodeAutomation = useEditorStore((s) => s.updateNodeAutomation);
  const assignNodeContainer = useEditorStore((s) => s.assignNodeContainer);
  const addNode = useEditorStore((s) => s.addNode);
  const addContainer = useEditorStore((s) => s.addContainer);
  const updateContainerLabel = useEditorStore((s) => s.updateContainerLabel);
  const updateContainerSize = useEditorStore((s) => s.updateContainerSize);
  const updateContainerStyle = useEditorStore((s) => s.updateContainerStyle);
  const assignContainerParent = useEditorStore((s) => s.assignContainerParent);
  const containers = useEditorStore((s) => s.document.containers);
  const [showAutomationConfig, setShowAutomationConfig] = useState(false);

  const selectedShape = useMemo(
    () =>
      selectedNode ? getPaletteItemByShapeId(selectedNode.shape) : null,
    [selectedNode],
  );
  const validationIssues = useMemo(
    () => basicDocumentValidator(document),
    [document],
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
              <div className={styles.sectionTitle}>Diagram Family</div>
              <div className={styles.metaValue}>
                {selectedShape?.family ?? selectedNode.family}
              </div>
            </div>
            <div className={styles.stackBlock}>
              <div className={styles.sectionTitle}>Kit</div>
              <div className={styles.metaValue}>
                {selectedShape?.kit ?? "core-flowchart"}
              </div>
            </div>
            <div className={styles.stackBlock}>
              <div className={styles.sectionTitle}>Shape</div>
              <div className={styles.metaValue}>
                {selectedNode.shape}
              </div>
            </div>
            <div className={styles.stackBlock}>
              <div className={styles.sectionTitle}>Semantic Kind</div>
              <div className={styles.metaValue}>
                {selectedNode.kind}
              </div>
            </div>
            <div className={styles.stackBlock}>
              <div className={styles.sectionTitle}>Family</div>
              <div className={styles.metaValue}>
                {selectedNode.family}
              </div>
            </div>
            <div className={styles.stackBlock}>
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
            <div className={styles.stackBlock}>
              <div className={styles.sectionTitle}>Geometry</div>
              <div className={styles.metaValue}>
                {selectedShape?.geometry ?? "rect"}
              </div>
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
              <div className={styles.sectionTitle}>Resize Policy</div>
              <div className={styles.metaValue}>
                {selectedNode.resizePolicy}
              </div>
            </div>
            <div className={styles.stackBlock}>
              <div className={styles.sectionTitle}>Ports</div>
              <div className={styles.metaValue}>
                {selectedNode.ports.length}
              </div>
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
            {selectedNode.ai?.confidence !== undefined && (
              <div className={styles.stackBlock}>
                <div className={styles.sectionTitle}>Confidence</div>
                <div className={styles.metaValue}>
                  {Math.round(selectedNode.ai.confidence * 100)}%
                </div>
              </div>
            )}
            {(selectedNode.kind === "automation-task" ||
              selectedShape?.shapeId === "action-task") && (
              <div className={styles.stackBlock}>
                <button
                  type="button"
                  className={styles.draggableNode}
                  onClick={() => setShowAutomationConfig(true)}
                >
                  Configure Automation
                </button>
                {selectedNode.automation?.endpoint ? (
                  <div className={styles.metaStack}>
                    <div>{selectedNode.automation.method ?? "POST"} {selectedNode.automation.endpoint}</div>
                    {selectedNode.automation.payloadTemplate ? (
                      <div>Payload template attached</div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : selectedEdge ? (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Edge Config</div>
            <Input
              label="Label"
              value={selectedEdge.labels[0]?.text ?? ""}
              onChange={(e) => updateEdgeLabel(selectedEdge.id, e.target.value)}
            />
            <div className={styles.stackBlock}>
              <div className={styles.sectionTitle}>Semantic Kind</div>
              <select
                value={selectedEdge.kind}
                onChange={(e) => updateEdgeKind(selectedEdge.id, e.target.value)}
                className={styles.select}
              >
                {EDGE_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.stackBlock}>
              <div className={styles.sectionTitle}>Routing</div>
              <select
                value={selectedEdge.routing}
                onChange={(e) => updateEdgeRouting(selectedEdge.id, e.target.value as typeof EDGE_ROUTINGS[number])}
                className={styles.select}
              >
                {EDGE_ROUTINGS.map((routing) => (
                  <option key={routing} value={routing}>
                    {routing}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.stackBlock}>
              <div className={styles.sectionTitle}>Start Marker</div>
              <select
                value={selectedEdge.startMarker}
                onChange={(e) =>
                  updateEdgeMarkers(selectedEdge.id, {
                    startMarker: e.target.value as typeof EDGE_MARKERS[number],
                  })
                }
                className={styles.select}
              >
                {EDGE_MARKERS.map((marker) => (
                  <option key={marker} value={marker}>
                    {marker}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.stackBlock}>
              <div className={styles.sectionTitle}>End Marker</div>
              <select
                value={selectedEdge.endMarker}
                onChange={(e) =>
                  updateEdgeMarkers(selectedEdge.id, {
                    endMarker: e.target.value as typeof EDGE_MARKERS[number],
                  })
                }
                className={styles.select}
              >
                {EDGE_MARKERS.map((marker) => (
                  <option key={marker} value={marker}>
                    {marker}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.stackBlock}>
              <div className={styles.sectionTitle}>Family</div>
              <div className={styles.metaValue}>{selectedEdge.family}</div>
            </div>
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
            <div className={styles.stackBlock}>
              <div className={styles.sectionTitle}>Family</div>
              <div className={styles.metaValue}>{selectedContainer.family}</div>
            </div>
            <div className={styles.stackBlock}>
              <div className={styles.sectionTitle}>Type</div>
              <div className={styles.metaValue}>{selectedContainer.type}</div>
            </div>
            <div className={styles.stackBlock}>
              <div className={styles.sectionTitle}>Parent Container</div>
              <select
                value={
                  typeof selectedContainer.metadata.parentContainerId === "string"
                    ? selectedContainer.metadata.parentContainerId
                    : ""
                }
                onChange={(e) =>
                  assignContainerParent(
                    selectedContainer.id,
                    e.target.value ? e.target.value : null,
                  )
                }
                className={styles.select}
              >
                <option value="">No Parent</option>
                {containers
                  .filter((container) => container.id !== selectedContainer.id)
                  .map((container) => (
                    <option key={container.id} value={container.id}>
                      {container.label}
                    </option>
                  ))}
              </select>
            </div>
            <div className={styles.stackBlock}>
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
            <div className={styles.stackBlock}>
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
            <div className={styles.stackBlock}>
              <div className={styles.sectionTitle}>Style</div>
              <StyleInput
                label="Fill"
                value={selectedContainer.style.fill}
                onChange={(value) =>
                  updateContainerStyle(selectedContainer.id, {
                    fill: value || undefined,
                  })
                }
              />
              <StyleInput
                label="Stroke"
                value={selectedContainer.style.stroke}
                onChange={(value) =>
                  updateContainerStyle(selectedContainer.id, {
                    stroke: value || undefined,
                  })
                }
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
