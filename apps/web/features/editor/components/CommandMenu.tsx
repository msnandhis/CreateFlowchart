"use client";

import {
  useCommandMenu,
  type UseCommandMenuOptions,
} from "../hooks/use-command-menu";
import { useEditorStore } from "../stores/editorStore";
import styles from "../styles/command-menu.module.css";
import {
  createLegacyPaletteNode,
  createPaletteContainer,
} from "../lib/flowchart-shapes";

interface CommandMenuProps extends Omit<
  UseCommandMenuOptions,
  "onAddNode" | "onAddContainer" | "canUndo" | "canRedo"
> {
  onOpenGenerate?: () => void;
  onOpenAnalyze?: () => void;
  onOpenExport?: () => void;
  onOpenImport?: () => void;
}

export function CommandMenu({
  onOpenGenerate,
  onOpenAnalyze,
  onOpenExport,
  onOpenImport,
  onAutoLayout,
  onSave,
  onUndo,
  onRedo,
}: CommandMenuProps) {
  const {
    isOpen,
    search,
    setSearch,
    selectedIndex,
    filteredCommands,
    inputRef,
    close,
    execute,
  } = useCommandMenu({
    onAddNode: (typeOrShapeId: string) => {
      addNodeByType(typeOrShapeId);
      close();
    },
    onAddContainer: (containerId: string) => {
      addContainerByType(containerId);
      close();
    },
    onAutoLayout: () => {
      onAutoLayout?.();
      close();
    },
    onGenerate: () => {
      onOpenGenerate?.();
      close();
    },
    onAnalyze: () => {
      onOpenAnalyze?.();
      close();
    },
    onExport: () => {
      onOpenExport?.();
      close();
    },
    onImport: () => {
      onOpenImport?.();
      close();
    },
    onSave: () => {
      onSave?.();
      close();
    },
    onUndo: () => {
      onUndo();
      close();
    },
    onRedo: () => {
      onRedo();
      close();
    },
    canUndo: useEditorStore((s) => s.canUndo()),
    canRedo: useEditorStore((s) => s.canRedo()),
  });

  const addNodeByType = (typeOrShapeId: string) => {
    useEditorStore.getState().addNode(createLegacyPaletteNode(typeOrShapeId));
  };

  const addContainerByType = (containerId: string) => {
    useEditorStore.getState().addContainer(createPaletteContainer(containerId));
  };

  if (!isOpen) return null;

  const categoryIcons: Record<string, string> = {
    add: "➕",
    edit: "✏️",
    view: "👁️",
    ai: "🤖",
    file: "📁",
  };

  return (
    <div className={styles.overlay} onClick={close}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <div className={styles.inputWrapper}>
          <span className={styles.prefix}>/</span>
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder="Type a command..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.results}>
          {filteredCommands.length === 0 ? (
            <div className={styles.empty}>No commands found</div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <div
                key={cmd.id}
                className={`${styles.command} ${index === selectedIndex ? styles.selected : ""}`}
                onClick={() => execute(index)}
                onMouseEnter={() => {}}
              >
                <span className={styles.icon}>{cmd.icon}</span>
                <div className={styles.content}>
                  <span className={styles.label}>{cmd.label}</span>
                  <span className={styles.description}>{cmd.description}</span>
                </div>
                <span className={styles.category}>
                  {categoryIcons[cmd.category]}
                </span>
              </div>
            ))
          )}
        </div>
        <div className={styles.footer}>
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
