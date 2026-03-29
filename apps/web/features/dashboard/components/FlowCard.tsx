"use client";

import { Badge } from "@/shared/ui/Badge";
import type { DiagramDocument } from "@createflowchart/schema";
import { DocumentCardPreview } from "@/features/diagram/components/DocumentCardPreview";
import { DiagramEntityCard } from "@/features/diagram/components/DiagramEntityCard";
import cardStyles from "@/features/diagram/components/diagram-entity-card.module.css";

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
    <DiagramEntityCard
      href={`/editor/${id}`}
      preview={
        document ? (
          <DocumentCardPreview document={document} />
        ) : (
          <DocumentFallbackPreview />
        )
      }
      title={title}
      badges={
        <>
          {family ? <Badge variant="default">{family}</Badge> : null}
          {containerCount > 0 ? (
            <Badge variant="default">{containerCount} groups</Badge>
          ) : null}
          {isPublic ? <Badge variant="success">Public</Badge> : null}
        </>
      }
      meta={
        <>
          <span className={cardStyles.statPill}>{nodeCount} nodes</span>
          <span className={cardStyles.statPill}>{edgeCount} edges</span>
          {likeCount > 0 ? (
            <span className={cardStyles.statPill}>{likeCount} likes</span>
          ) : null}
        </>
      }
      metaAside={formattedDate}
      secondaryAction={isPublic ? { href: `/view/${id}`, label: "Preview" } : undefined}
      primaryAction={{ href: `/editor/${id}`, label: "Open", tone: "primary" }}
      overlayActions={
        showLikeButton ? (
          <button
            className={`${cardStyles.likeButton} ${userLiked ? cardStyles.likeButtonActive : ""}`}
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
        ) : (
          <button
            className={cardStyles.iconButton}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (confirm("Are you sure you want to delete this flow?")) {
                onDelete?.(id);
              }
            }}
            title="Delete flow"
          >
            <TrashIcon />
          </button>
        )
      }
    />
  );
}

function DocumentFallbackPreview() {
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(226,232,240,0.72)"
      strokeWidth="1.2"
    >
      <rect x="3" y="3" width="7" height="7" rx="1.4" />
      <rect x="14" y="3" width="7" height="7" rx="1.4" />
      <rect x="3" y="14" width="7" height="7" rx="1.4" />
      <rect x="14" y="14" width="7" height="7" rx="1.4" />
      <path d="M10 6.5h4M6.5 10v4M17.5 10v4M10 17.5h4" />
    </svg>
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

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
