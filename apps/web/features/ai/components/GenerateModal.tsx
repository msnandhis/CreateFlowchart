"use client";

import { useState } from "react";
import { Modal } from "@/shared/ui/Modal";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { aiService, type AIJobStatus } from "../services/ai-service";
import { useEditorStore } from "@/features/editor/stores/editorStore";
import styles from "./ai.module.css";
import type { DiagramDocument } from "@createflowchart/schema";

interface GenerateModalProps {
  open: boolean;
  onClose: () => void;
}

export function GenerateModal({ open, onClose }: GenerateModalProps) {
  const [prompt, setPrompt] = useState("");
  const [nodeCount, setNodeCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobStatus, setJobStatus] = useState<AIJobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setDocument = useEditorStore((s) => s.setDocument);
  const setTitle = useEditorStore((s) => s.setTitle);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a description");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { jobId } = await aiService.generate({ prompt, nodeCount });

      const status = await aiService.waitForCompletion(jobId, setJobStatus);

      if (status.status === "completed" && status.result) {
        const result = status.result as {
          document?: DiagramDocument;
          flow?: unknown;
        };
        if (result.document) {
          setDocument(result.document);
          setTitle(result.document.metadata.title);
        }
        onClose();
        resetForm();
      } else if (status.status === "failed") {
        setError(status.error ?? "Generation failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate flow");
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setPrompt("");
    setNodeCount(5);
    setJobStatus(null);
    setError(null);
  };

  const handleClose = () => {
    if (!isGenerating) {
      resetForm();
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Generate Flowchart">
      <div className={styles.modalContent}>
        {jobStatus?.status === "processing" ? (
          <div className={styles.processing}>
            <div className={styles.spinner} />
            <p>Generating your flowchart...</p>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${jobStatus.progress}%` }}
              />
            </div>
            <span className={styles.progressText}>{jobStatus.progress}%</span>
          </div>
        ) : (
          <>
            <div className={styles.field}>
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.textarea}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your flowchart, e.g., 'User registration flow with email verification'"
                rows={4}
                disabled={isGenerating}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Approximate Node Count</label>
              <Input
                type="number"
                min={1}
                max={20}
                value={nodeCount}
                onChange={(e) => setNodeCount(Number(e.target.value))}
                disabled={isGenerating}
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.actions}>
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
              >
                {isGenerating ? "Generating..." : "Generate"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
