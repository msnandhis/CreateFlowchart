"use client";

import { useEffect, useState } from "react";
import { EditorShell } from "./EditorShell";
import { useEditorStore } from "../stores/editorStore";
import type { FlowGraph } from "@createflowchart/core";

interface CloudEditorProps {
  flowId: string;
  initialData?: {
    id: string;
    title: string;
    data: FlowGraph | string;
  };
}

export function CloudEditor({ flowId, initialData }: CloudEditorProps) {
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const loadFlow = useEditorStore((s) => s.loadFlow);

  useEffect(() => {
    if (initialData) {
      loadFlow(
        typeof initialData.data === "string"
          ? JSON.parse(initialData.data)
          : initialData.data,
        initialData.id,
        "cloud",
        initialData.title,
      );
      setIsLoading(false);
      return;
    }

    async function loadFlowFromAPI() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/flows/${flowId}`);
        if (!response.ok) {
          throw new Error("Failed to load flow");
        }
        const data = await response.json();
        loadFlow(data.flow, flowId, "cloud", data.title);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setIsLoading(false);
      }
    }

    loadFlowFromAPI();
  }, [flowId, initialData, loadFlow]);

  if (isLoading) {
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#9ca3af",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "8px" }}>⏳</div>
          <div>Loading flow...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#ef4444",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "8px" }}>❌</div>
          <div>{error}</div>
          <a
            href="/dashboard"
            style={{
              color: "#3A86FF",
              textDecoration: "none",
              marginTop: "16px",
              display: "inline-block",
            }}
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
      <EditorShell initialData={initialData} />
    </div>
  );
}
