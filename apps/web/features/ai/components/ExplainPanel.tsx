"use client";

import { useState } from "react";
import {
  aiService,
  type AIJobStatus,
  type AIExplainResult,
} from "../services/ai-service";
import { useEditorStore } from "@/features/editor/stores/editorStore";
import { Button } from "@/shared/ui/Button";
import styles from "./ai.module.css";

interface ExplainPanelProps {
  onClose: () => void;
}

export function ExplainPanel({ onClose }: ExplainPanelProps) {
  const [isExplaining, setIsExplaining] = useState(false);
  const [jobStatus, setJobStatus] = useState<AIJobStatus | null>(null);
  const [result, setResult] = useState<AIExplainResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const flowGraph = useEditorStore((s) => s.flowGraph);

  const handleExplain = async () => {
    setIsExplaining(true);
    setError(null);

    try {
      const { jobId } = await aiService.explain(flowGraph);

      const status = await aiService.waitForCompletion(jobId, setJobStatus);

      if (status.status === "completed" && status.result) {
        setResult(status.result as AIExplainResult);
      } else if (status.status === "failed") {
        setError(status.error ?? "Explanation failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to explain flow");
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Explain Flow</h3>
        <button className={styles.closeBtn} onClick={onClose}>
          ×
        </button>
      </div>

      <div className={styles.panelContent}>
        {!result && !isExplaining && (
          <div className={styles.emptyState}>
            <p>Get a human-readable explanation of your flowchart.</p>
            <Button variant="primary" onClick={handleExplain}>
              Explain Flow
            </Button>
          </div>
        )}

        {isExplaining && (
          <div className={styles.processing}>
            <div className={styles.spinner} />
            <p>Analyzing flowchart structure...</p>
            {jobStatus && (
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${jobStatus.progress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        {result && (
          <div className={styles.result}>
            <div className={styles.summary}>
              <h4>Summary</h4>
              <p>{result.summary}</p>
            </div>

            <div className={styles.stepsList}>
              <h4>Step-by-Step Explanation</h4>
              {result.steps.map((step, idx) => (
                <div key={idx} className={styles.stepItem}>
                  <span className={styles.stepNumber}>{idx + 1}</span>
                  <div className={styles.stepContent}>
                    <span className={styles.stepNode}>Node: {step.nodeId}</span>
                    <span className={styles.stepDesc}>{step.description}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.actions}>
              <Button variant="secondary" onClick={handleExplain}>
                Re-explain
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
