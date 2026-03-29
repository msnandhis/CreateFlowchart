"use client";

import { Toolbar } from "./Toolbar";
import { Canvas } from "./Canvas";
import { Sidebar } from "./Sidebar";

import { useEffect } from "react";
import { useEditorStore } from "../stores/editorStore";

export function EditorShell({ initialData }: { initialData?: any }) {
  const setInitialData = useEditorStore((s) => s.setInitialData);

  useEffect(() => {
    if (initialData) {
      setInitialData(initialData);
    }
  }, [initialData, setInitialData]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", overflow: "hidden" }}>
      <Toolbar />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <main style={{ flex: 1, position: "relative" }}>
          <Canvas />
        </main>
        <Sidebar />
      </div>
    </div>
  );
}
