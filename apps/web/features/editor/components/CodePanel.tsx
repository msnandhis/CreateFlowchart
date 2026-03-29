"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { useDocument, useEditorStore } from "../stores/editorStore";
import {
  parseDslDocument,
  parseMermaidDocument,
  serializeDocumentToDsl,
} from "../lib/document-codec";
import styles from "../styles/code-panel.module.css";

type CodeMode = "dsl" | "mermaid";

export function CodePanel() {
  const document = useDocument();
  const setDocument = useEditorStore((state) => state.setDocument);
  const [mode, setMode] = useState<CodeMode>("dsl");
  const [source, setSource] = useState(() => serializeDocumentToDsl(document));
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mode !== "dsl" || isDirty) return;
    setSource(serializeDocumentToDsl(document));
  }, [document, mode, isDirty]);

  useEffect(() => {
    if (mode !== "dsl" || !isDirty) return;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      try {
        const nextDocument = parseDslDocument(source, {
          id: document.id,
          metadata: document.metadata,
          theme: document.theme,
          layout: document.layout,
          annotations: document.annotations,
        });
        setDocument(nextDocument);
        setError(null);
        setIsDirty(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse DSL");
      }
    }, 300);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [document.annotations, document.id, document.layout, document.metadata, document.theme, isDirty, mode, setDocument, source]);

  const handleChange = (value: string) => {
    setSource(value);
    setIsDirty(true);
  };

  const applyCurrentSource = () => {
    try {
      const nextDocument =
        mode === "dsl"
          ? parseDslDocument(source, {
              id: document.id,
              metadata: document.metadata,
              theme: document.theme,
              layout: document.layout,
              annotations: document.annotations,
            })
          : parseMermaidDocument(source, {
              id: document.id,
              metadata: {
                ...document.metadata,
                title: document.metadata.title,
                source: "mermaid",
              },
              theme: document.theme,
              layout: document.layout,
              annotations: document.annotations,
            });

      setDocument(nextDocument);
      if (mode === "dsl") {
        setSource(serializeDocumentToDsl(nextDocument));
      }
      setError(null);
      setIsDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    }
  };

  const resetFromDocument = () => {
    setSource(
      mode === "dsl"
        ? serializeDocumentToDsl(document)
        : `flowchart TD\n    start["${document.metadata.title}"]`,
    );
    setError(null);
    setIsDirty(false);
  };

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.modeGroup}>
          <button
            type="button"
            className={`${styles.modeButton} ${mode === "dsl" ? styles.active : ""}`}
            onClick={() => {
              setMode("dsl");
              setSource(serializeDocumentToDsl(document));
              setError(null);
              setIsDirty(false);
            }}
          >
            Native DSL
          </button>
          <button
            type="button"
            className={`${styles.modeButton} ${mode === "mermaid" ? styles.active : ""}`}
            onClick={() => {
              setMode("mermaid");
              setSource(`flowchart TD\n    start["${document.metadata.title}"]`);
              setError(null);
              setIsDirty(false);
            }}
          >
            Mermaid Import
          </button>
        </div>
        <div className={styles.actions}>
          <Button variant="ghost" size="sm" onClick={resetFromDocument}>
            Reset
          </Button>
          <Button variant="secondary" size="sm" onClick={applyCurrentSource}>
            {mode === "dsl" ? "Apply" : "Import"}
          </Button>
        </div>
      </div>

      <div className={styles.body}>
        <textarea
          className={styles.editor}
          value={source}
          onChange={(event) => handleChange(event.target.value)}
          spellCheck={false}
        />
      </div>

      <div className={styles.footer}>
        <span className={styles.hint}>
          {mode === "dsl"
            ? "Native DSL stays in sync with the canvas."
            : "Paste Mermaid flowchart syntax and import it into the canonical document model."}
        </span>
        {error ? <span className={styles.error}>{error}</span> : null}
      </div>
    </aside>
  );
}
