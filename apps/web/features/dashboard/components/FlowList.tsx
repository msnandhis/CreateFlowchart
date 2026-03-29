"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api-client";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import styles from "../styles/dashboard.module.css";
import Link from "next/link";

interface Flow {
  id: string;
  title: string;
  isPublic: boolean;
  updatedAt: string;
}

export function FlowList() {
  const { data: flows, isLoading } = useQuery({
    queryKey: ["flows"],
    queryFn: () => api.get<Flow[]>("/api/flows"),
  });

  if (isLoading) {
    return (
      <div className={styles.grid}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.card} style={{ height: "200px", opacity: 0.5, background: "var(--color-bg-elevated)" }} />
        ))}
      </div>
    );
  }

  if (!flows?.length) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
          </svg>
        </div>
        <p>No flowcharts yet. Create your first one!</p>
        <Button variant="primary" size="md" style={{ marginTop: "1rem" }}>
          <Link href="/editor" style={{ color: "inherit", textDecoration: "none" }}>New Flowchart</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {flows.map((flow) => (
        <Link key={flow.id} href={`/editor/${flow.id}`} style={{ textDecoration: "none" }}>
          <div className={styles.card}>
            <div className={styles.cardPreview}>
              {/* This will be replaced by a generated thumbnail or actual node preview */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
              </svg>
            </div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>{flow.title}</h3>
              <div className={styles.cardMeta}>
                <span>{new Date(flow.updatedAt).toLocaleDateString()}</span>
                {flow.isPublic && <Badge variant="success">Public</Badge>}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
