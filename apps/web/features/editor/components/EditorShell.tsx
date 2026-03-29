"use client";

import { Toolbar } from "./Toolbar";
import { Canvas } from "./Canvas";
import { Sidebar } from "./Sidebar";

import { useEffect } from "react";
import { useEditorStore } from "../stores/editorStore";
import { useYjs } from "../hooks/use-yjs";
import { useAutosave } from "../hooks/use-autosave";
import { useShortcuts } from "../hooks/use-shortcuts";

export function EditorShell({ initialData }: { initialData?: any }) {
  const setInitialData = useEditorStore((s) => s.setInitialData);
  
  // Initialize Real-time Sync (Yjs)
  const { provider } = useYjs(initialData?.id);

  // Initialize Auto-save & Shortcuts
  useAutosave();
  useShortcuts();


  useEffect(() => {
    if (initialData) {
      setInitialData(initialData);
    }
  }, [initialData, setInitialData]);


  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", overflow: "hidden", background: "#0a0a0a" }}>
      <Toolbar />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <main style={{ flex: 1, position: "relative" }}>
          <Canvas provider={provider} />
        </main>
        <Sidebar />
      </div>
    </div>
  );
}

