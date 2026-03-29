"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { useDocument, useEditorStore } from "../stores/editorStore";
import {
  diffDocuments,
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
  const [draftSummary, setDraftSummary] = useState<ReturnType<typeof diffDocuments> | null>(null);
  const [draftDocument, setDraftDocument] = useState<typeof document | null>(null);

  useEffect(() => {
    if (mode !== "dsl" || isDirty) return;
    setSource(serializeDocumentToDsl(document));
  }, [document, mode, isDirty]);

  const handleChange = (value: string) => {
    setSource(value);
    setIsDirty(true);
    if (mode !== "dsl") {
      setDraftSummary(null);
      setDraftDocument(null);
      return;
    }

    try {
      const nextDocument = parseDslDocument(value, {
        id: document.id,
        metadata: document.metadata,
        theme: document.theme,
        layout: document.layout,
        annotations: document.annotations,
      });
      setDraftDocument(nextDocument);
      setDraftSummary(diffDocuments(document, nextDocument));
      setError(null);
    } catch (err) {
      setDraftDocument(null);
      setDraftSummary(null);
      setError(err instanceof Error ? err.message : "Failed to parse DSL");
    }
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
      setSource(serializeDocumentToDsl(nextDocument));
      setError(null);
      setIsDirty(false);
      setDraftDocument(null);
      setDraftSummary(null);
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
    setDraftDocument(null);
    setDraftSummary(null);
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
            ? "Canvas changes sync into DSL live. DSL edits produce a draft diff before apply."
            : "Paste Mermaid flowchart syntax and import it into the canonical document model."}
        </span>
        {mode === "dsl" && draftSummary ? (
          <div className={styles.diffBox}>
            <div className={styles.diffGrid}>
              <span>+{draftSummary.nodesAdded} nodes</span>
              <span>-{draftSummary.nodesRemoved} nodes</span>
              <span>~{draftSummary.nodesModified} nodes</span>
              <span>+{draftSummary.edgesAdded} edges</span>
              <span>-{draftSummary.edgesRemoved} edges</span>
              <span>+{draftSummary.containersAdded} containers</span>
            </div>
            {draftSummary.highlights.length > 0 ? (
              <div className={styles.highlights}>
                {draftSummary.highlights.map((highlight, index) => (
                  <span key={`${highlight}-${index}`} className={styles.highlightItem}>
                    {highlight}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {error ? <span className={styles.error}>{error}</span> : null}
      </div>
    </aside>
  );
}
