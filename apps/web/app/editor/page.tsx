"use client";

import nextDynamic from "next/dynamic";
import { ToastProvider } from "@/shared/ui/Toast";

const EditorShell = nextDynamic(
  () =>
    import("@/features/editor/components/EditorShell").then(
      (m) => m.EditorShell,
    ),
  { ssr: false },
);

export default function EditorPage() {
  return (
    <ToastProvider>
      <EditorShell />
    </ToastProvider>
  );
}
