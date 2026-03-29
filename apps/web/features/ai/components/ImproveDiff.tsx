"use client";

import { useState } from "react";
import {
  aiService,
  type AIJobStatus,
  type AIImproveResult,
} from "../services/ai-service";
import { useEditorStore } from "@/features/editor/stores/editorStore";
import { Button } from "@/shared/ui/Button";
import styles from "./ai.module.css";

interface ImproveDiffProps {
  onClose: () => void;
}

export function ImproveDiff({ onClose }: ImproveDiffProps) {
  const [instruction, setInstruction] = useState("");
  const [isImproving, setIsImproving] = useState(false);
  const [jobStatus, setJobStatus] = useState<AIJobStatus | null>(null);
  const [result, setResult] = useState<AIImproveResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const document = useEditorStore((s) => s.document);
  const setDocument = useEditorStore((s) => s.setDocument);

  const handleImprove = async () => {
    if (!instruction.trim()) {
      setError("Please enter an improvement instruction");
      return;
    }

    setIsImproving(true);
    setError(null);

    try {
      const { jobId } = await aiService.improve(document, instruction);

      const status = await aiService.waitForCompletion(jobId, setJobStatus);

      if (status.status === "completed" && status.result) {
        setResult(status.result as AIImproveResult);
      } else if (status.status === "failed") {
        setError(status.error ?? "Improvement failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to improve flow");
    } finally {
      setIsImproving(false);
    }
  };

  const handleApply = () => {
    if (result?.document) {
      setDocument(result.document as typeof document);
      onClose();
    }
  };

  const handleDiscard = () => {
    setResult(null);
    setInstruction("");
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Improve Flow</h3>
        <button className={styles.closeBtn} onClick={onClose}>
          ×
        </button>
      </div>

      <div className={styles.panelContent}>
        {!result && (
          <>
            <div className={styles.field}>
              <label className={styles.label}>Improvement Instruction</label>
              <textarea
                className={styles.textarea}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="e.g., 'Add error handling', 'Simplify the decision flow', 'Add validation steps'"
                rows={3}
                disabled={isImproving}
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.actions}>
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={isImproving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleImprove}
                disabled={isImproving || !instruction.trim()}
              >
                {isImproving ? "Improving..." : "Improve"}
              </Button>
            </div>

            {isImproving && jobStatus && (
              <div className={styles.processing}>
                <div className={styles.spinner} />
                <p>Applying improvements...</p>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${jobStatus.progress}%` }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {result && (
          <div className={styles.result}>
            <h4 className={styles.diffTitle}>Proposed Changes</h4>
            <div className={styles.changesList}>
              {[
                ...result.patch.nodeAdds,
                ...result.patch.nodeUpdates,
                ...result.patch.nodeRemovals,
                ...result.patch.containerAdds,
                ...result.patch.containerUpdates,
                ...result.patch.containerRemovals,
              ].map((change, idx) => (
                <div key={idx} className={styles.changeItem}>
                  <span className={styles.changeIcon}>•</span>
                  <span className={styles.changeDesc}>{change}</span>
                </div>
              ))}
            </div>

            <div className={styles.diffPreview}>
              <h4>Preview</h4>
              <p className={styles.nodeCount}>{result.patch.summary}</p>
              <p className={styles.nodeCount}>
                {Array.isArray((result.document as { nodes?: unknown[] } | undefined)?.nodes)
                  ? (result.document as { nodes: unknown[] }).nodes.length
                  : 0} nodes in improved flow
              </p>
              <p className={styles.metaNote}>
                {result.provenance.provider} · {result.provenance.model} · {Math.round(result.provenance.confidence * 100)}%
              </p>
            </div>

            <div className={styles.actions}>
              <Button variant="secondary" onClick={handleDiscard}>
                Discard
              </Button>
              <Button variant="primary" onClick={handleApply}>
                Apply Changes
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
