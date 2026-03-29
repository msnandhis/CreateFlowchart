"use client";

import { memo } from "react";
import { ViewportPortal } from "@xyflow/react";
import { useEditorStore } from "../stores/editorStore";
import styles from "../styles/container-layer.module.css";

export const ContainerLayer = memo(function ContainerLayer() {
  const containers = useEditorStore((state) => state.document.containers);
  const selectedContainerId = useEditorStore((state) => state.selectedContainerId);
  const setSelectedContainer = useEditorStore((state) => state.setSelectedContainer);

  return (
    <ViewportPortal>
      <div className={styles.layer}>
        {containers.map((container) => {
          const labelWidth =
            container.type === "pool" || container.type === "lane" ? 42 : 0;
          const bodyLeft = container.position.x + labelWidth;

          return (
            <button
              key={container.id}
              type="button"
              className={`${styles.container} ${
                selectedContainerId === container.id ? styles.selected : ""
              } ${container.family === "bpmn" ? styles.bpmn : styles.swimlane}`}
              style={{
                left: container.position.x,
                top: container.position.y,
                width: container.size.width,
                height: container.size.height,
              }}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedContainer(container.id);
              }}
            >
              <span
                className={`${styles.label} ${
                  labelWidth ? styles.verticalLabel : ""
                }`}
                style={
                  labelWidth
                    ? undefined
                    : {
                        left: 18,
                        top: 16,
                      }
                }
              >
                {container.label}
              </span>
              {labelWidth ? (
                <>
                  <span
                    className={styles.labelStrip}
                    style={{ width: labelWidth }}
                  />
                  <span
                    className={styles.divider}
                    style={{ left: bodyLeft }}
                  />
                  <span
                    className={styles.inner}
                    style={{
                      left: bodyLeft + 10,
                      top: 10,
                      width: container.size.width - labelWidth - 20,
                      height: container.size.height - 20,
                    }}
                  />
                </>
              ) : null}
            </button>
          );
        })}
      </div>
    </ViewportPortal>
  );
});
