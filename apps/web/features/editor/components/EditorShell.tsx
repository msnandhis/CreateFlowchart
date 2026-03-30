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
import { usePresence } from "../hooks/use-presence";
import styles from "../styles/editor-shell.module.css";

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
  const createCheckpoint = useEditorStore((s) => s.createCheckpoint);
  const restoreCheckpoint = useEditorStore((s) => s.restoreCheckpoint);
  const checkpoints = useEditorStore((s) => s.checkpoints);
  const { runLayout } = useAutoLayout();
  const [surfaceMode, setSurfaceMode] = useState<"canvas" | "split" | "code">(
    "split",
  );

  const { provider, connectionStatus, reconnect, presenceIdentity } = useYjs(
    initialData?.id,
  );
  const { users, updateCursor, clearCursor } = usePresence({
    provider,
    userId: presenceIdentity.userId,
    userName: presenceIdentity.userName,
    userColor: presenceIdentity.userColor,
  });

  useAutosave();
  useShortcuts();

  useEffect(() => {
    if (initialData) {
      setInitialData(initialData);
    }
  }, [initialData, setInitialData]);

  return (
    <div className={styles.shell}>
      <Toolbar
        surfaceMode={surfaceMode}
        onSurfaceModeChange={setSurfaceMode}
        connectionStatus={connectionStatus}
        onReconnect={reconnect}
        remoteUsers={users}
        checkpoints={checkpoints}
        onCreateCheckpoint={() => createCheckpoint()}
        onRestoreCheckpoint={restoreCheckpoint}
        onAutoLayout={runLayout}
        onOpenGenerate={onOpenGenerate}
        onOpenAnalyze={onOpenAnalyze}
        onOpenExport={onOpenExport}
        onOpenImport={onOpenImport}
      />
      <div className={styles.workspace}>
        {surfaceMode !== "code" ? (
          <main className={styles.canvasPane}>
            <Canvas
              remoteUsers={users}
              updateLocalCursor={updateCursor}
              clearLocalCursor={clearCursor}
            />
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
