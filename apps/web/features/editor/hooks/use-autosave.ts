import { useEffect, useRef } from "react";
import { useEditorStore } from "../stores/editorStore";

/**
 * Hook to automatically persist flow changes to the database.
 * Debounces updates by 3 seconds when 'isDirty' is true.
 */
export function useAutosave() {
  const { flowGraph, document, flowId, mode, isDirty, title, markClean } = useEditorStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only auto-save in cloud mode for authenticated users
    if (mode !== "cloud" || !flowId || !isDirty) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        console.log(`[Autosave] Persisting flow ${flowId}...`);
        const response = await fetch(`/api/flows/${flowId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            data: flowGraph,
            document,
            formatVersion: "flowgraph-v1+document-v2",
          }),
        });

        if (response.ok) {
          markClean();
          console.log(`[Autosave] Successfully saved flow ${flowId}.`);
        } else {
          console.error("[Autosave] Failed to persist:", await response.text());
        }
      } catch (e) {
        console.error("[Autosave] Error:", e);
      }
    }, 3000); // 3-second debounce

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [flowGraph, document, title, isDirty, flowId, mode, markClean]);
}
