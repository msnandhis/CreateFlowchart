"use client";

import { useEditorStore, useIsDirty } from "../stores/editorStore";
import { Button } from "@/shared/ui/Button";
import styles from "../styles/toolbar.module.css";
import { useLayout } from "../hooks/use-layout";
import { ConnectionStatus } from "./ConnectionStatus";
import { PresenceAvatars } from "./PresenceAvatars";

export type EditorSurfaceMode = "canvas" | "split" | "code";

interface EditorCheckpoint {
  id: string;
  label: string;
  createdAt: string;
}

interface ToolbarProps {
  surfaceMode: EditorSurfaceMode;
  onSurfaceModeChange: (mode: EditorSurfaceMode) => void;
  connectionStatus?: "disconnected" | "connecting" | "connected";
  onReconnect?: () => void;
  remoteUsers?: Map<
    number,
    {
      id: string;
      name: string;
      color: string;
      cursor?: { x: number; y: number };
      lastActive: number;
    }
  >;
  checkpoints?: EditorCheckpoint[];
  onCreateCheckpoint?: () => void;
  onRestoreCheckpoint?: (id: string) => void;
  onOpenGenerate?: () => void;
  onOpenAnalyze?: () => void;
  onOpenExport?: () => void;
  onOpenImport?: () => void;
}

export function Toolbar({
  surfaceMode,
  onSurfaceModeChange,
  connectionStatus = "disconnected",
  onReconnect,
  remoteUsers = new Map(),
  checkpoints = [],
  onCreateCheckpoint,
  onRestoreCheckpoint,
  onOpenGenerate,
  onOpenAnalyze,
  onOpenExport,
  onOpenImport,
}: ToolbarProps) {
  const title = useEditorStore((s) => s.title);
  const setTitle = useEditorStore((s) => s.setTitle);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.canUndo);
  const canRedo = useEditorStore((s) => s.canRedo);
  const isDirty = useIsDirty();

  const { performLayout } = useLayout();

  return (
    <div className={styles.toolbar}>
      <div className={styles.titleBlock}>
        <input
          className={styles.titleInput}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Flow title"
        />
        <span className={`${styles.saveIndicator} ${isDirty ? styles.dirty : ""}`}>
          {isDirty ? "Unsaved changes" : "Saved and synced"}
        </span>
      </div>

      <div className={styles.toolbarFrame}>
        <div className={styles.group}>
        <Button variant="ghost" size="sm" icon onClick={undo} disabled={!canUndo()} title="Undo (Ctrl+Z)">
          <UndoIcon />
        </Button>
        <Button variant="ghost" size="sm" icon onClick={redo} disabled={!canRedo()} title="Redo (Ctrl+Y)">
          <RedoIcon />
        </Button>
      </div>

        <div className={styles.separator} />

        <div className={styles.group}>
        <Button variant="ghost" size="sm" title="Auto Layout" onClick={performLayout}>
          <LayoutIcon />
        </Button>
        <Button variant="ghost" size="sm" title="AI Generate (/)" onClick={onOpenGenerate}>
          <SparklesIcon />
        </Button>
        <Button variant="ghost" size="sm" title="Analyze" onClick={onOpenAnalyze}>
          <InspectIcon />
        </Button>
        <Button variant="ghost" size="sm" title="Import" onClick={onOpenImport}>
          <ImportIcon />
        </Button>
        </div>

        <div className={styles.separator} />

        <div className={styles.surfaceModes}>
          {(["canvas", "split", "code"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`${styles.surfaceButton} ${
                surfaceMode === mode ? styles.surfaceButtonActive : ""
              }`}
              onClick={() => onSurfaceModeChange(mode)}
            >
              {mode === "canvas" ? "Canvas" : mode === "split" ? "Split" : "Code"}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.spacer} />

      <div className={styles.statusCluster}>
        <div className={styles.group}>
        <Button
          variant="ghost"
          size="sm"
          title="Create checkpoint"
          onClick={onCreateCheckpoint}
        >
          Checkpoint
        </Button>
        <select
          className={styles.checkpointSelect}
          aria-label="Restore checkpoint"
          defaultValue=""
          onChange={(event) => {
            if (!event.target.value) return;
            onRestoreCheckpoint?.(event.target.value);
            event.target.value = "";
          }}
        >
          <option value="">Restore checkpoint</option>
          {checkpoints.map((checkpoint) => (
            <option key={checkpoint.id} value={checkpoint.id}>
              {checkpoint.label}
            </option>
          ))}
        </select>
        </div>

        {remoteUsers.size > 0 ? <PresenceAvatars users={remoteUsers} /> : null}

        <ConnectionStatus status={connectionStatus} />

        {connectionStatus === "disconnected" && onReconnect ? (
          <Button variant="ghost" size="sm" onClick={onReconnect}>
            Reconnect
          </Button>
        ) : null}
      </div>

      <div className={styles.group}>
        <Button variant="ghost" size="sm" title="Export" onClick={onOpenExport}>
          <ExportIcon />
        </Button>
        <Button variant="secondary" size="sm" title="Share">
          Share
        </Button>
      </div>
    </div>
  );
}

// ─── Inline SVG Icons (16x16) ──────────────────────────────────
function UndoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  );
}
function RedoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
    </svg>
  );
}
function LayoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" /><path d="M18 14l.7 2.1L21 17l-2.3.9L18 20l-.7-2.1L15 17l2.3-.9z" />
    </svg>
  );
}
function InspectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" /><path d="M11 8v3l2 2" />
    </svg>
  );
}
function ImportIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
    </svg>
  );
}
function ExportIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
