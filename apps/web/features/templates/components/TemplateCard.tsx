"use client";

import { Badge } from "@/shared/ui/Badge";
import type { TemplateWithAuthor } from "../services/template-service";
import { DocumentCardPreview } from "@/features/diagram/components/DocumentCardPreview";
import { DiagramEntityCard } from "@/features/diagram/components/DiagramEntityCard";
import cardStyles from "@/features/diagram/components/diagram-entity-card.module.css";

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
    <DiagramEntityCard
      href={`/templates/${template.id}`}
      preview={<DocumentCardPreview document={template.document} />}
      title={template.title}
      description={template.description ?? undefined}
      badges={
        <>
          <Badge variant="default">{template.family}</Badge>
          {template.category ? (
            <Badge variant="info">{template.category}</Badge>
          ) : null}
          {template.containerCount > 0 ? (
            <Badge variant="default">{template.containerCount} groups</Badge>
          ) : null}
        </>
      }
      meta={
        <>
          <span className={cardStyles.statPill}>{nodeCount} nodes</span>
          <span className={cardStyles.statPill}>{template.edgeCount} edges</span>
          <span className={cardStyles.statPill}>{template.usageCount} uses</span>
          <span className={cardStyles.statPill}>{template.likeCount} likes</span>
        </>
      }
      metaAside={`By ${template.author.name}`}
      secondaryAction={{ href: `/templates/${template.id}`, label: "Preview" }}
      primaryAction={{
        href: `/editor?template=${template.id}`,
        label: "Use Template",
        tone: "primary",
      }}
      overlayActions={
        showActions ? (
          <button
            className={`${cardStyles.likeButton} ${userLiked ? cardStyles.likeButtonActive : ""}`}
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
        ) : null
      }
    />
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
