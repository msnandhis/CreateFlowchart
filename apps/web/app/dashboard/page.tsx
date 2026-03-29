"use client";

import { useState } from "react";
import { DashboardShell } from "@/features/dashboard/components/DashboardShell";
import { FlowList } from "@/features/dashboard/components/FlowList";
import { ImportModal } from "@/features/dashboard/components/ImportModal";
import { AuthGuard } from "@/features/auth/components/AuthGuard";
import { Button } from "@/shared/ui/Button";
import styles from "@/features/dashboard/styles/dashboard.module.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api-client";
import { useRouter } from "next/navigation";
import { useToast } from "@/shared/ui/Toast";

export default function DashboardPage() {
  const [importOpen, setImportOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: () => api.post("/api/flows", { title: "Untitled Flow" }),
    onSuccess: (newFlow: any) => {
      queryClient.invalidateQueries({ queryKey: ["flows"] });
      toast("Flowchart created!", "success");
      router.push(`/editor/${newFlow.id}`);
    },
    onError: () => {
      toast("Failed to create flowchart.", "error");
    },
  });

  const handleImport = async ({
    title,
    flowGraph,
  }: {
    title: string;
    flowGraph: unknown;
  }) => {
    const newFlow = await api.post<{ id: string }>("/api/flows", {
      title,
      data: flowGraph,
    });
    queryClient.invalidateQueries({ queryKey: ["flows"] });
    toast("Flowchart imported!", "success");
    router.push(`/editor/${newFlow.id}`);
    setImportOpen(false);
  };

  return (
    <AuthGuard>
      <DashboardShell>
        <div className={styles.header}>
          <h1 className={styles.title}>My Flowcharts</h1>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setImportOpen(true)}
            >
              Import
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "New Flowchart"}
            </Button>
          </div>
        </div>

        <FlowList />
        <ImportModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImport={handleImport}
        />
      </DashboardShell>
    </AuthGuard>
  );
}
