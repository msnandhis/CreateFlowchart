"use client";

import { useEffect } from "react";
import { EditorShell } from "./EditorShell";
import { useSandboxStorage } from "../hooks/use-sandbox-storage";
import { useEditorStore } from "../stores/editorStore";
import { createStarterFlowGraph } from "@createflowchart/core";

export function SandboxEditor() {
  const { initializeSandbox, hasStoredData } = useSandboxStorage();
  const mode = useEditorStore((s) => s.mode);

  useEffect(() => {
    if (mode === "sandbox") {
      initializeSandbox();
    }
  }, [mode, initializeSandbox]);

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        background: "#0a0a0a",
      }}
    >
      <div
        style={{
          background: "#1e222d",
          borderBottom: "1px solid #2d3348",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>🔒</span>
          <span style={{ fontSize: "12px", color: "#9ca3af" }}>
            Sandbox Mode
          </span>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>|</span>
          <span style={{ fontSize: "12px", color: "#f3f4f6" }}>Local only</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>
            Your flow is saved locally
          </span>
          <a
            href="/login"
            style={{
              fontSize: "12px",
              color: "#3A86FF",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Sign in to save to cloud →
          </a>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <EditorShell />
      </div>
    </div>
  );
}
