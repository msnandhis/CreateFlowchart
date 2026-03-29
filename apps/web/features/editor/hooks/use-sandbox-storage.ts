"use client";

import { useEffect, useCallback, useRef } from "react";
import { useEditorStore } from "../stores/editorStore";
import {
  createEmptyFlowGraph,
  createStarterFlowGraph,
  validateFlowGraph,
  type FlowGraph,
} from "@createflowchart/core";

const STORAGE_KEY = "createflowchart_sandbox";
const DEBOUNCE_MS = 2000;

interface StoredSandbox {
  flowGraph: FlowGraph;
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
  const flowGraph = useEditorStore((s) => s.flowGraph);
  const title = useEditorStore((s) => s.title);
  const setFlowGraph = useEditorStore((s) => s.setFlowGraph);
  const setTitle = useEditorStore((s) => s.setTitle);
  const loadFlow = useEditorStore((s) => s.loadFlow);
  const isDirty = useEditorStore((s) => s.isDirty);
  const isFirstRender = useRef(true);

  const saveToStorage = useCallback(
    debounce((fg: FlowGraph, t: string) => {
      try {
        const data: StoredSandbox = {
          flowGraph: fg,
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
        const validation = validateFlowGraph(data.flowGraph);
        if (validation.success) {
          return { flowGraph: validation.data, title: data.title };
        }
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
          loadFlow(stored.flowGraph, null, "sandbox", stored.title);
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
    [loadFlow, loadFromStorage],
  );

  useEffect(() => {
    if (isDirty && flowGraph.nodes.length > 0) {
      saveToStorage(flowGraph, title);
    }
  }, [flowGraph, title, isDirty, saveToStorage]);

  return {
    initializeSandbox,
    saveToStorage: (fg: FlowGraph, t: string) => saveToStorage(fg, t),
    loadFromStorage,
    clearStorage,
    hasStoredData,
  };
}
