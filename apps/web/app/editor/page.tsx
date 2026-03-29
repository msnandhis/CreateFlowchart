import { EditorShell } from "@/features/editor/components/EditorShell";
import { ToastProvider } from "@/shared/ui/Toast";

export default function EditorPage() {
  return (
    <ToastProvider>
      <EditorShell />
    </ToastProvider>
  );
}
