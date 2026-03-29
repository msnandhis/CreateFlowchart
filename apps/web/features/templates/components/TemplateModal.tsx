"use client";

import { useState } from "react";
import { Modal } from "@/shared/ui/Modal";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Badge } from "@/shared/ui/Badge";
import styles from "../styles/templates.module.css";
import type { FlowGraph } from "@createflowchart/core";

interface TemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSaveAsTemplate?: (data: {
    title: string;
    description?: string;
    category?: string;
    tags?: string[];
    data: FlowGraph;
  }) => Promise<void>;
  currentFlowData?: FlowGraph;
  mode?: "save" | "browse";
}

export function TemplateModal({
  open,
  onClose,
  onSaveAsTemplate,
  currentFlowData,
  mode = "browse",
}: TemplateModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !currentFlowData || !onSaveAsTemplate) return;

    setSaving(true);
    try {
      await onSaveAsTemplate({
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        data: currentFlowData,
      });
      onClose();
      setTitle("");
      setDescription("");
      setCategory("");
      setTags("");
    } catch (error) {
      console.error("Failed to save template:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Save as Template">
      <div className={styles.modalContent}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Title *</label>
          <Input
            placeholder="My Awesome Template"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.textarea}
            placeholder="Describe what this template does..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Category</label>
          <Input
            placeholder="e.g., algorithms, business, education"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <p className={styles.hint}>
            Common categories: <Badge variant="default">algorithms</Badge>{" "}
            <Badge variant="default">business</Badge>{" "}
            <Badge variant="default">education</Badge>{" "}
            <Badge variant="default">general</Badge>
          </p>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Tags</label>
          <Input
            placeholder="comma, separated, tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        <div className={styles.modalActions}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!title.trim() || saving}
          >
            {saving ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
