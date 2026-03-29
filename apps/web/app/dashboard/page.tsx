"use client";

import { DashboardShell } from "@/features/dashboard/components/DashboardShell";
import { FlowList } from "@/features/dashboard/components/FlowList";
import { AuthGuard } from "@/features/auth/components/AuthGuard";
import { Button } from "@/shared/ui/Button";
import styles from "@/features/dashboard/styles/dashboard.module.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api-client";
import { useRouter } from "next/navigation";
import { useToast } from "@/shared/ui/Toast";

export default function DashboardPage() {
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

  return (
    <AuthGuard>
      <DashboardShell>
        <div className={styles.header}>
          <h1 className={styles.title}>My Flowcharts</h1>
          <Button
            variant="primary"
            size="md"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "New Flowchart"}
          </Button>
        </div>

        <FlowList />
      </DashboardShell>
    </AuthGuard>
  );
}
