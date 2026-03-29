"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api-client";
import { Button } from "@/shared/ui/Button";
import styles from "../styles/dashboard.module.css";
import Link from "next/link";
import { FlowCard } from "./FlowCard";
import { ImportModal } from "./ImportModal";

interface Flow {
  id: string;
  title: string;
  data: { nodes: unknown[]; edges: unknown[] };
  isPublic: boolean;
  likeCount: number;
  updatedAt: string;
}

export function FlowList() {
  const [importOpen, setImportOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: flows, isLoading } = useQuery<Flow[]>({
    queryKey: ["flows"],
    queryFn: () => api.get("/api/flows"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/flows/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
  });

  const handleImport = async ({
    title,
    document,
  }: {
    title: string;
    document: unknown;
  }) => {
    await api.post("/api/flows", { title, document });
    queryClient.invalidateQueries({ queryKey: ["flows"] });
    setImportOpen(false);
  };

  if (isLoading) {
    return (
      <div className={styles.grid}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={styles.card}
            style={{
              height: "200px",
              opacity: 0.5,
              background: "var(--color-bg-elevated)",
            }}
          />
        ))}
      </div>
    );
  }

  if (!flows?.length) {
    return (
      <>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            </svg>
          </div>
          <p>No flowcharts yet. Create your first one!</p>
          <div style={{ display: "flex", gap: "12px", marginTop: "1rem" }}>
            <Button variant="primary" size="md">
              <Link
                href="/editor"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                New Flowchart
              </Link>
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setImportOpen(true)}
            >
              Import JSON
            </Button>
          </div>
        </div>
        <ImportModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImport={handleImport}
        />
      </>
    );
  }

  return (
    <>
      <div className={styles.grid}>
        {flows.map((flow) => (
          <FlowCard
            key={flow.id}
            id={flow.id}
            title={flow.title}
            isPublic={flow.isPublic}
            likeCount={flow.likeCount}
            updatedAt={flow.updatedAt}
            nodeCount={flow.data?.nodes?.length ?? 0}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
      </div>
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
      />
    </>
  );
}
