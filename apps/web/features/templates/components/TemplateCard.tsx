"use client";

import { Badge } from "@/shared/ui/Badge";
import styles from "../styles/templates.module.css";
import type { TemplateWithAuthor } from "../services/template-service";
import Link from "next/link";
import { DocumentCardPreview } from "@/features/diagram/components/DocumentCardPreview";

interface TemplateCardProps {
  template: TemplateWithAuthor;
  onLike?: (id: string) => void;
  onUnlike?: (id: string) => void;
  userLiked?: boolean;
  showActions?: boolean;
}

export function TemplateCard({
  template,
  onLike,
  onUnlike,
  userLiked = false,
  showActions = true,
}: TemplateCardProps) {
  const nodeCount = template.nodeCount || template.document.nodes.length || 0;

  return (
    <div className={styles.card}>
      <Link href={`/templates/${template.id}`} className={styles.cardLink}>
        <div className={styles.cardPreview}>
          <DocumentCardPreview
            document={template.document}
            className={styles.cardPreviewCanvas}
          />
        </div>
        <div className={styles.cardContent}>
          <h3 className={styles.cardTitle}>{template.title}</h3>
          {template.description && (
            <p className={styles.cardDescription}>{template.description}</p>
          )}
          <div className={styles.cardMeta}>
            <div className={styles.cardStats}>
              <span>{nodeCount} nodes</span>
              <span>{template.usageCount} uses</span>
              <span>{template.likeCount} likes</span>
            </div>
            {template.category && (
              <Badge variant="default">{template.category}</Badge>
            )}
          </div>
        </div>
      </Link>
      {showActions && (
        <div className={styles.cardActions}>
          <button
            className={`${styles.likeButton} ${userLiked ? styles.liked : ""}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (userLiked) {
                onUnlike?.(template.id);
              } else {
                onLike?.(template.id);
              }
            }}
            title={userLiked ? "Unlike" : "Like"}
          >
            <HeartIcon filled={userLiked} />
            <span>{template.likeCount}</span>
          </button>
        </div>
      )}
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
