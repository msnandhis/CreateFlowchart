"use client";

import { Toolbar } from "./Toolbar";
import { Canvas } from "./Canvas";
import { Sidebar } from "./Sidebar";
import { CommandMenu } from "./CommandMenu";
import { CodePanel } from "./CodePanel";

import { useEffect, useState } from "react";
import { useEditorStore } from "../stores/editorStore";
import { useYjs } from "../hooks/use-yjs";
import { useAutosave } from "../hooks/use-autosave";
import { useShortcuts } from "../hooks/use-shortcuts";
import { useAutoLayout } from "../hooks/use-auto-layout";

interface EditorShellProps {
  initialData?: any;
  onOpenGenerate?: () => void;
  onOpenAnalyze?: () => void;
  onOpenExport?: () => void;
  onOpenImport?: () => void;
}

export function EditorShell({
  initialData,
  onOpenGenerate,
  onOpenAnalyze,
  onOpenExport,
  onOpenImport,
}: EditorShellProps) {
  const setInitialData = useEditorStore((s) => s.setInitialData);
  const { runLayout } = useAutoLayout();
  const [surfaceMode, setSurfaceMode] = useState<"canvas" | "split" | "code">(
    "split",
  );

  const { provider, updateLocalCursor } = useYjs(initialData?.id);

  useAutosave();
  useShortcuts();

  useEffect(() => {
    if (initialData) {
      setInitialData(initialData);
    }
  }, [initialData, setInitialData]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: "#0a0a0a",
      }}
    >
      <Toolbar
        surfaceMode={surfaceMode}
        onSurfaceModeChange={setSurfaceMode}
      />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {surfaceMode !== "code" ? (
          <main style={{ flex: 1, position: "relative" }}>
            <Canvas provider={provider} updateLocalCursor={updateLocalCursor} />
          </main>
        ) : null}
        {surfaceMode !== "canvas" ? <CodePanel /> : null}
        <Sidebar />
      </div>
      <CommandMenu
        onOpenGenerate={onOpenGenerate ?? (() => {})}
        onOpenAnalyze={onOpenAnalyze ?? (() => {})}
        onOpenExport={onOpenExport ?? (() => {})}
        onOpenImport={onOpenImport ?? (() => {})}
        onAutoLayout={runLayout}
        onSave={() => {}}
        onUndo={() => useEditorStore.getState().undo()}
        onRedo={() => useEditorStore.getState().redo()}
      />
    </div>
  );
}
