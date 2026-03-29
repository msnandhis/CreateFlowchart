"use client";

import { useState, useRef } from "react";
import { Modal } from "@/shared/ui/Modal";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import styles from "../styles/dashboard.module.css";

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (data: { title: string; flowGraph: unknown }) => void;
}

export function ImportModal({ open, onClose, onImport }: ImportModalProps) {
  const [title, setTitle] = useState("");
  const [jsonContent, setJsonContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonContent(content);
      setError(null);

      if (!title && file.name) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setTitle(nameWithoutExt);
      }

      try {
        const parsed = JSON.parse(content);
        if (!parsed.nodes || !parsed.edges) {
          setError("Invalid FlowGraph: missing nodes or edges");
        }
      } catch {
        setError("Invalid JSON format");
      }
    };
    reader.readAsText(file);
  };

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    setJsonContent(content);
    setError(null);

    try {
      const parsed = JSON.parse(content);
      if (!parsed.nodes || !parsed.edges) {
        setError("Invalid FlowGraph: missing nodes or edges");
      }
    } catch {
      setError("Invalid JSON format");
    }
  };

  const handleImport = () => {
    if (!jsonContent || !title.trim()) {
      setError("Please provide both a title and JSON content");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const flowGraph = JSON.parse(jsonContent);
      if (!flowGraph.nodes || !flowGraph.edges) {
        throw new Error("Missing nodes or edges");
      }

      onImport({ title: title.trim(), flowGraph });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse JSON");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setJsonContent("");
    setError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Import Flowchart">
      <div className={styles.importModal}>
        <div className={styles.importSection}>
          <label className={styles.importLabel}>Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Flowchart"
          />
        </div>

        <div className={styles.importSection}>
          <div className={styles.importLabelRow}>
            <label className={styles.importLabel}>FlowGraph JSON</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              📁 Upload JSON
            </Button>
          </div>
          <textarea
            className={styles.jsonTextarea}
            value={jsonContent}
            onChange={handlePaste}
            placeholder='{"nodes": [...], "edges": [...], "meta": {...}}'
            rows={10}
          />
        </div>

        {error && <div className={styles.importError}>{error}</div>}

        <div className={styles.importActions}>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={!jsonContent || !title.trim() || !!error || isLoading}
          >
            {isLoading ? "Importing..." : "Import"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
