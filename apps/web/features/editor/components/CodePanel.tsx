"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { useDocument, useEditorStore } from "../stores/editorStore";
import {
  diffDocuments,
  parseDslDocument,
  parseDslDocumentDetailed,
  parseMermaidDocument,
  parseMermaidDocumentDetailed,
  serializeDocumentToDsl,
  serializeDocumentToMermaid,
} from "../lib/document-codec";
import styles from "../styles/code-panel.module.css";
import type { DslDiagnostic } from "@createflowchart/dsl";

type CodeMode = "dsl" | "mermaid";

export function CodePanel() {
  const document = useDocument();
  const setDocument = useEditorStore((state) => state.setDocument);
  const [mode, setMode] = useState<CodeMode>("dsl");
  const [source, setSource] = useState(() => serializeDocumentToDsl(document));
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<DslDiagnostic[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [draftSummary, setDraftSummary] = useState<ReturnType<typeof diffDocuments> | null>(null);
  const [draftDocument, setDraftDocument] = useState<typeof document | null>(null);

  useEffect(() => {
    if (isDirty) return;

    const nextSource =
      mode === "dsl"
        ? serializeDocumentToDsl(document)
        : serializeDocumentToMermaid(document).content;
    setSource(nextSource);
    setDiagnostics([]);
  }, [document, isDirty, mode]);

  const handleChange = (value: string) => {
    setSource(value);
    setIsDirty(true);

    try {
      const parsed =
        mode === "dsl"
          ? parseDslDocumentDetailed(value, {
              id: document.id,
              metadata: document.metadata,
              theme: document.theme,
              layout: document.layout,
              annotations: document.annotations,
            })
          : parseMermaidDocumentDetailed(value, {
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

      setDraftDocument(parsed.document);
      setDraftSummary(diffDocuments(document, parsed.document));
      setDiagnostics(parsed.diagnostics);
      setError(null);
    } catch (err) {
      setDraftDocument(null);
      setDraftSummary(null);
      setDiagnostics([]);
      setError(err instanceof Error ? err.message : "Failed to parse source");
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
      setSource(
        mode === "dsl"
          ? serializeDocumentToDsl(nextDocument)
          : serializeDocumentToMermaid(nextDocument).content,
      );
      setError(null);
      setDiagnostics([]);
      setIsDirty(false);
      setDraftDocument(null);
      setDraftSummary(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apply failed");
    }
  };

  const resetFromDocument = () => {
    setSource(
      mode === "dsl"
        ? serializeDocumentToDsl(document)
        : serializeDocumentToMermaid(document).content,
    );
    setError(null);
    setDiagnostics([]);
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
              setDiagnostics([]);
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
              setSource(serializeDocumentToMermaid(document).content);
              setError(null);
              setDiagnostics([]);
              setIsDirty(false);
            }}
          >
            Mermaid
          </button>
        </div>
        <div className={styles.actions}>
          <Button variant="ghost" size="sm" onClick={resetFromDocument}>
            Reset
          </Button>
          <Button variant="secondary" size="sm" onClick={applyCurrentSource}>
            Apply
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
            ? `Native DSL v${"1.0"} is the canonical code surface. Edits are validated before apply.`
            : "Mermaid mode is a compatibility view. Unsupported constructs are reported instead of silently dropped."}
        </span>
        {draftSummary ? (
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
        {diagnostics.length > 0 ? (
          <div className={styles.diagnostics}>
            {diagnostics.map((diagnostic, index) => (
              <div
                key={`${diagnostic.code}-${diagnostic.line ?? index}-${index}`}
                className={`${styles.diagnosticItem} ${styles[`diagnostic${diagnostic.severity[0].toUpperCase()}${diagnostic.severity.slice(1)}`]}`}
              >
                <strong>{diagnostic.severity}</strong>
                {diagnostic.line ? ` line ${diagnostic.line}: ` : " "}
                {diagnostic.message}
              </div>
            ))}
          </div>
        ) : null}
        {error ? <span className={styles.error}>{error}</span> : null}
      </div>
    </aside>
  );
}
