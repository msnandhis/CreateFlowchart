import { useEffect } from "react";
import { useEditorStore } from "../stores/editorStore";

/**
 * Hook to register global keyboard shortcuts for the editor.
 * Supports Undo (Ctrl+Z), Redo (Ctrl+Shift+Z), Delete (Back/Del).
 */
export function useShortcuts() {
  const { undo, redo, deleteSelected, canUndo, canRedo } = useEditorStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 1. Check if the user is typing in an input/textarea
      const isInput = ["INPUT", "TEXTAREA"].includes((event.target as HTMLElement).tagName);
      if (isInput) return;

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdKey = isMac ? event.metaKey : event.ctrlKey;

      // ─── Undo (Cmd/Ctrl + Z) ──────────────────────────────────
      if (cmdKey && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        if (canUndo()) undo();
      }

      // ─── Redo (Cmd/Ctrl + Shift + Z) ──────────────────────────
      if (cmdKey && event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        if (canRedo()) redo();
      }

      // ─── Delete (Backspace or Delete) ─────────────────────────
      if (event.key === "Delete" || event.key === "Backspace") {
        // Only delete if NO input is focused
        deleteSelected();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, deleteSelected, canUndo, canRedo]);
}
