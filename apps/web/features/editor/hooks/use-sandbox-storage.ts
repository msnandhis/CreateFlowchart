"use client";

import { useEffect, useCallback, useRef } from "react";
import { useEditorStore } from "../stores/editorStore";
import {
  createStarterFlowGraph,
  type FlowGraph,
} from "@createflowchart/core";
import type { DiagramDocument } from "@createflowchart/schema";
import { createPersistedFlowEnvelope, normalizePersistedFlow } from "../lib/persisted-flow";
import { documentToFlowGraph } from "../lib/document-compat";

const STORAGE_KEY = "createflowchart_sandbox";
const DEBOUNCE_MS = 2000;

interface StoredSandbox {
  data?: FlowGraph;
  document?: DiagramDocument;
  formatVersion?: string;
  title: string;
  updatedAt: string;
}

function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function useSandboxStorage() {
  const document = useEditorStore((s) => s.document);
  const title = useEditorStore((s) => s.title);
  const loadFlow = useEditorStore((s) => s.loadFlow);
  const setDocument = useEditorStore((s) => s.setDocument);
  const isDirty = useEditorStore((s) => s.isDirty);
  const isFirstRender = useRef(true);

  const saveToStorage = useCallback(
    debounce((nextDocument: DiagramDocument, t: string) => {
      try {
        const envelope = createPersistedFlowEnvelope({
          data: documentToFlowGraph(nextDocument),
          document: nextDocument,
          title: t,
        });
        const data: StoredSandbox = {
          data: envelope.legacy,
          document: envelope.document,
          formatVersion: envelope.formatVersion,
          title: t,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        useEditorStore.getState().markClean();
      } catch (error) {
        console.error("[SandboxStorage] Save failed:", error);
      }
    }, DEBOUNCE_MS),
    [],
  );

  const loadFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: StoredSandbox = JSON.parse(stored);
        const normalized = normalizePersistedFlow({
          data: data.data ?? createStarterFlowGraph(undefined, true),
          document: data.document,
          title: data.title,
        });
        return { document: normalized.document, title: data.title };
      }
    } catch (error) {
      console.error("[SandboxStorage] Load failed:", error);
    }
    return null;
  }, []);

  const clearStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const hasStoredData = useCallback(() => {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }, []);

  const initializeSandbox = useCallback(
    (flowGraphToUse?: FlowGraph) => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        const stored = loadFromStorage();

        if (stored) {
          setDocument(stored.document);
          return;
        }

        if (flowGraphToUse) {
          loadFlow(flowGraphToUse, null, "sandbox", "Sandbox");
        } else {
          const starter = createStarterFlowGraph(undefined, true);
          loadFlow(starter, null, "sandbox", "Untitled Flow");
        }
      }
    },
    [loadFlow, loadFromStorage, setDocument],
  );

  useEffect(() => {
    if (isDirty && document.nodes.length > 0) {
      saveToStorage(document, title);
    }
  }, [document, title, isDirty, saveToStorage]);

  return {
    initializeSandbox,
    saveToStorage: (doc: DiagramDocument, t: string) => saveToStorage(doc, t),
    loadFromStorage,
    clearStorage,
    hasStoredData,
  };
}
