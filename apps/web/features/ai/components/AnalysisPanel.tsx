"use client";

import { useState } from "react";
import {
  aiService,
  type AIJobStatus,
  type AIAnalyzeResult,
} from "../services/ai-service";
import { useEditorStore } from "@/features/editor/stores/editorStore";
import { Button } from "@/shared/ui/Button";
import styles from "./ai.module.css";

interface AnalysisPanelProps {
  onClose: () => void;
}

export function AnalysisPanel({ onClose }: AnalysisPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [jobStatus, setJobStatus] = useState<AIJobStatus | null>(null);
  const [result, setResult] = useState<AIAnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const document = useEditorStore((s) => s.document);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { jobId } = await aiService.analyze(document);

      const status = await aiService.waitForCompletion(jobId, setJobStatus);

      if (status.status === "completed" && status.result) {
        setResult(status.result as AIAnalyzeResult);
      } else if (status.status === "failed") {
        setError(status.error ?? "Analysis failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze flow");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getIssueIcon = (type: "error" | "warning" | "suggestion") => {
    switch (type) {
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "suggestion":
        return "💡";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "var(--color-success)";
    if (score >= 0.5) return "var(--color-warning)";
    return "var(--color-error)";
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Flow Analysis</h3>
        <button className={styles.closeBtn} onClick={onClose}>
          ×
        </button>
      </div>

      <div className={styles.panelContent}>
        {!result && !isAnalyzing && (
          <div className={styles.emptyState}>
            <p>Analyze your flowchart for issues and suggestions.</p>
            <Button variant="primary" onClick={handleAnalyze}>
              Analyze Flow
            </Button>
          </div>
        )}

        {isAnalyzing && (
          <div className={styles.processing}>
            <div className={styles.spinner} />
            <p>Analyzing flowchart...</p>
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
            <div className={styles.scoreSection}>
              <div
                className={styles.scoreCircle}
                style={{ borderColor: getScoreColor(result.score) }}
              >
                <span
                  className={styles.scoreValue}
                  style={{ color: getScoreColor(result.score) }}
                >
                  {Math.round(result.score * 100)}
                </span>
                <span className={styles.scoreLabel}>Score</span>
              </div>
            </div>

            <div className={styles.issuesList}>
              <h4>Issues ({result.issues.length})</h4>
              {result.issues.length === 0 ? (
                <p className={styles.noIssues}>
                  No issues found! Your flow looks great.
                </p>
              ) : (
                result.issues.map((issue, idx) => (
                  <div key={idx} className={styles.issueItem}>
                    <span className={styles.issueIcon}>
                      {getIssueIcon(issue.type)}
                    </span>
                    <div className={styles.issueContent}>
                      <span className={styles.issueMessage}>
                        {issue.message}
                      </span>
                      {issue.nodeIds.length > 0 && (
                        <span className={styles.issueNodes}>
                          Affects: {issue.nodeIds.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className={styles.actions}>
              <Button variant="secondary" onClick={handleAnalyze}>
                Re-analyze
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
