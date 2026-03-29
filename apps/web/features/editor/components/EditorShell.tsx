"use client";

import { useState } from "react";
import { Toolbar } from "./Toolbar";
import { Canvas } from "./Canvas";
import { Sidebar } from "./Sidebar";
import { CommandMenu } from "./CommandMenu";
import { ExportModal } from "./ExportModal";
import { ShareModal } from "./ShareModal";

import { useEffect } from "react";
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
  const [showExport, setShowExport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  const setInitialData = useEditorStore((s) => s.setInitialData);
  const flowId = useEditorStore((s) => s.flowId);
  const title = useEditorStore((s) => s.title);
  const mode = useEditorStore((s) => s.mode);
  const isDirty = useEditorStore((s) => s.isDirty);
  const flowGraph = useEditorStore((s) => s.flowGraph);
  const markClean = useEditorStore((s) => s.markClean);
  const { runLayout } = useAutoLayout();

  const { provider, updateLocalCursor } = useYjs(initialData?.id);

  useAutosave();
  useShortcuts();

  useEffect(() => {
    if (initialData) {
      setInitialData(initialData);
      if (initialData.isPublic !== undefined) {
        setIsPublic(initialData.isPublic);
      }
    }
  }, [initialData, setInitialData]);

  const handleSave = async () => {
    if (mode !== "cloud" || !flowId) return;
    try {
      await fetch(`/api/flows/${flowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, data: flowGraph }),
      });
      markClean();
    } catch (e) {
      console.error("[Manual Save] Error:", e);
    }
  };

  const handleVisibilityChange = (newIsPublic: boolean) => {
    setIsPublic(newIsPublic);
  };

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
      <Toolbar onExport={() => setShowExport(true)} onShare={() => setShowShare(true)} />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <main style={{ flex: 1, position: "relative" }}>
          <Canvas provider={provider} updateLocalCursor={updateLocalCursor} />
        </main>
        <Sidebar />
      </div>
      <CommandMenu
        onGenerate={onOpenGenerate ?? (() => {})}
        onAnalyze={onOpenAnalyze ?? (() => {})}
        onExport={() => setShowExport(true)}
        onImport={onOpenImport ?? (() => {})}
        onAutoLayout={runLayout}
        onSave={handleSave}
        onUndo={() => useEditorStore.getState().undo()}
        onRedo={() => useEditorStore.getState().redo()}
      />
      <ExportModal open={showExport} onClose={() => setShowExport(false)} />
      <ShareModal
        open={showShare}
        onClose={() => setShowShare(false)}
        flowId={flowId || ""}
        flowTitle={title}
        isPublic={isPublic}
        onVisibilityChange={handleVisibilityChange}
      />
    </div>
  );
}