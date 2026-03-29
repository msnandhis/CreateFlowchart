"use client";

import Link from "next/link";
import { Badge } from "@/shared/ui/Badge";
import styles from "../styles/dashboard.module.css";
import type { DiagramDocument } from "@createflowchart/schema";
import { DocumentCardPreview } from "@/features/diagram/components/DocumentCardPreview";

interface FlowCardProps {
  id: string;
  title: string;
  isPublic: boolean;
  likeCount: number;
  updatedAt: string;
  nodeCount?: number;
  edgeCount?: number;
  containerCount?: number;
  family?: DiagramDocument["family"];
  document?: DiagramDocument;
  onDelete?: (id: string) => void;
  onLike?: (id: string) => void;
  onUnlike?: (id: string) => void;
  userLiked?: boolean;
  showLikeButton?: boolean;
}

export function FlowCard({
  id,
  title,
  isPublic,
  likeCount,
  updatedAt,
  nodeCount = 0,
  edgeCount = 0,
  containerCount = 0,
  family,
  document,
  onDelete,
  onLike,
  onUnlike,
  userLiked = false,
  showLikeButton = false,
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
          {document ? (
            <DocumentCardPreview
              document={document}
              className={styles.cardPreviewCanvas}
            />
          ) : (
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
          )}
        </div>
        <div className={styles.cardContent}>
          <h3 className={styles.cardTitle}>{title}</h3>
          <div className={styles.cardMetaBadges}>
            {family ? <Badge variant="default">{family}</Badge> : null}
            {containerCount > 0 ? (
              <Badge variant="default">{containerCount} groups</Badge>
            ) : null}
          </div>
          <div className={styles.cardMeta}>
            <span>{formattedDate}</span>
            <span>
              {nodeCount} nodes / {edgeCount} edges
            </span>
            {isPublic && <Badge variant="success">Public</Badge>}
          </div>
        </div>
      </Link>
      <div className={styles.cardFooter}>
        <Link href={`/editor/${id}`} className={styles.cardActionLink}>
          Open
        </Link>
        {isPublic ? (
          <Link href={`/view/${id}`} className={styles.cardActionLinkMuted}>
            Preview
          </Link>
        ) : null}
      </div>
      <div className={styles.cardActions}>
        {showLikeButton && (
          <button
            className={`${styles.likeButton} ${userLiked ? styles.liked : ""}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (userLiked) {
                onUnlike?.(id);
              } else {
                onLike?.(id);
              }
            }}
            title={userLiked ? "Unlike" : "Like"}
          >
            <HeartIcon filled={userLiked} />
            <span>{likeCount}</span>
          </button>
        )}
        {!showLikeButton && (
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
        )}
      </div>
    </div>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
