"use client";

import { useState, useRef } from "react";
import { Modal } from "@/shared/ui/Modal";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import styles from "../styles/dashboard.module.css";
import {
  parseDslDocumentDetailed,
  parseMermaidDocumentDetailed,
} from "@/features/editor/lib/document-codec";
import {
  isDiagramDocument,
  toDiagramDocument,
} from "@/features/editor/lib/document-compat";
import type { DiagramDocument } from "@createflowchart/schema";
import type { DslDiagnostic } from "@createflowchart/dsl";

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (data: { title: string; document: DiagramDocument }) => void;
}

export function ImportModal({ open, onClose, onImport }: ImportModalProps) {
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<"json" | "dsl" | "mermaid">("json");
  const [jsonContent, setJsonContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<DslDiagnostic[]>([]);
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
        const result = validateImportContent(content, format, title);
        setDiagnostics(result.diagnostics);
      } catch {
        setError("Invalid content format");
        setDiagnostics([]);
      }
    };
    reader.readAsText(file);
  };

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    setJsonContent(content);
    setError(null);

    try {
      const result = validateImportContent(content, format, title);
      setDiagnostics(result.diagnostics);
    } catch {
      setError("Invalid content format");
      setDiagnostics([]);
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
      const document = parseImportedDocument(jsonContent, format, title.trim());
      onImport({ title: title.trim(), document });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import content");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setFormat("json");
    setJsonContent("");
    setError(null);
    setDiagnostics([]);
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
          <label className={styles.importLabel}>Format</label>
          <select
            value={format}
            onChange={(e) => {
              const nextFormat = e.target.value as typeof format;
              setFormat(nextFormat);
              setError(null);
            }}
            className={styles.importSelect}
          >
            <option value="json">JSON</option>
            <option value="dsl">Native DSL</option>
            <option value="mermaid">Mermaid</option>
          </select>
        </div>

        <div className={styles.importSection}>
          <div className={styles.importLabelRow}>
            <label className={styles.importLabel}>
              {format === "json"
                ? "Diagram JSON"
                : format === "dsl"
                  ? "Native DSL"
                  : "Mermaid"}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept={format === "json" ? ".json" : ".txt,.mmd,.md"}
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload File
            </Button>
          </div>
          <textarea
            className={styles.jsonTextarea}
            value={jsonContent}
            onChange={handlePaste}
            placeholder={
              format === "json"
                ? '{"nodes": [...], "edges": [...], "meta": {...}}'
                : format === "dsl"
                  ? 'diagram "Checkout Flow" family flowchart kit core-flowchart'
                  : "flowchart TD\n    start([Start]) --> step[Review]"
            }
            rows={10}
          />
        </div>

        {error && <div className={styles.importError}>{error}</div>}
        {diagnostics.length > 0 ? (
          <div className={styles.importWarnings}>
            {diagnostics.map((diagnostic, index) => (
              <div
                key={`${diagnostic.code}-${diagnostic.line ?? index}-${index}`}
                className={styles.importWarning}
              >
                <strong>{diagnostic.severity}</strong>
                {diagnostic.line ? ` line ${diagnostic.line}: ` : " "}
                {diagnostic.message}
              </div>
            ))}
          </div>
        ) : null}

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

function validateImportContent(
  content: string,
  format: "json" | "dsl" | "mermaid",
  title: string,
) {
  return parseImportedDocumentDetailed(content, format, title || "Imported Diagram");
}

function parseImportedDocument(
  content: string,
  format: "json" | "dsl" | "mermaid",
  title: string,
): DiagramDocument {
  if (format === "dsl") {
    return parseDslDocumentDetailed(content, {
      metadata: {
        title,
        source: "native",
        tags: [],
      },
    }).document;
  }

  if (format === "mermaid") {
    return parseMermaidDocumentDetailed(content, {
      metadata: {
        title,
        source: "mermaid",
        tags: [],
      },
    }).document;
  }

  const parsed = JSON.parse(content);

  if (isDiagramDocument(parsed)) {
    return {
      ...parsed,
      metadata: {
        ...parsed.metadata,
        title: title || parsed.metadata.title,
      },
    };
  }

  return toDiagramDocument({
    title,
    data: parsed,
  });
}

function parseImportedDocumentDetailed(
  content: string,
  format: "json" | "dsl" | "mermaid",
  title: string,
) {
  if (format === "dsl") {
    return parseDslDocumentDetailed(content, {
      metadata: {
        title,
        source: "native",
        tags: [],
      },
    });
  }

  if (format === "mermaid") {
    return parseMermaidDocumentDetailed(content, {
      metadata: {
        title,
        source: "mermaid",
        tags: [],
      },
    });
  }

  const document = parseImportedDocument(content, "json", title);
  return { document, diagnostics: [] as DslDiagnostic[], degraded: false };
}
