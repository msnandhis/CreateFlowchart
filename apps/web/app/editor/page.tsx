import nextDynamic from "next/dynamic";
import { ToastProvider } from "@/shared/ui/Toast";

// Disable SSR for the entire editor shell to avoid build-time WebSocket errors
const EditorShell = nextDynamic(
  () => import("@/features/editor/components/EditorShell").then(m => m.EditorShell),
  { ssr: false }
);

export const dynamic = "force-dynamic";


export default function EditorPage() {
  return (
    <ToastProvider>
      <EditorShell />
    </ToastProvider>
  );
}
