"use client";

import Link from "next/link";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import styles from "../styles/dashboard.module.css";

interface FlowCardProps {
  id: string;
  title: string;
  isPublic: boolean;
  likeCount: number;
  updatedAt: string;
  nodeCount?: number;
  onDelete?: (id: string) => void;
}

export function FlowCard({
  id,
  title,
  isPublic,
  likeCount,
  updatedAt,
  nodeCount = 0,
  onDelete,
}: FlowCardProps) {
  const formattedDate = new Date(updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className={styles.card}>
      <Link href={`/editor/${id}`} className={styles.cardLink}>
        <div className={styles.cardPreview}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-text-muted)"
            strokeWidth="1"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <path d="M10 6.5h4M6.5 10v4M17.5 10v4M10 17.5h4" />
          </svg>
        </div>
        <div className={styles.cardContent}>
          <h3 className={styles.cardTitle}>{title}</h3>
          <div className={styles.cardMeta}>
            <span>{formattedDate}</span>
            <span>{nodeCount} nodes</span>
            {isPublic && <Badge variant="success">Public</Badge>}
          </div>
        </div>
      </Link>
      <div className={styles.cardActions}>
        <button
          className={styles.iconButton}
          onClick={(e) => {
            e.preventDefault();
            if (confirm("Are you sure you want to delete this flow?")) {
              onDelete?.(id);
            }
          }}
          title="Delete flow"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
