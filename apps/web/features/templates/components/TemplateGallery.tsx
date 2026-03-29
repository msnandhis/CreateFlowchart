"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { TemplateCard } from "./TemplateCard";
import styles from "../styles/templates.module.css";
import type {
  TemplateWithAuthor,
} from "../services/template-service";

interface TemplateGalleryProps {
  initialTemplates?: TemplateWithAuthor[];
  showCreateButton?: boolean;
  onCreateNew?: () => void;
  onSelectTemplate?: (template: TemplateWithAuthor) => void;
  emptyMessage?: string;
}

export function TemplateGallery({
  initialTemplates = [],
  showCreateButton = true,
  onCreateNew,
  onSelectTemplate,
  emptyMessage = "No templates found",
}: TemplateGalleryProps) {
  const [templates, setTemplates] =
    useState<TemplateWithAuthor[]>(initialTemplates);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "popular" | "likes">(
    "recent",
  );

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("query", searchQuery);
      if (selectedCategory) params.set("category", selectedCategory);
      params.set("sortBy", sortBy);

      const res = await fetch(`/api/templates?${params}`);
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (templateId: string) => {
    try {
      await fetch(`/api/templates/${templateId}/like`, { method: "POST" });
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === templateId
            ? { ...t, likeCount: t.likeCount + 1, userLiked: true }
            : t,
        ),
      );
    } catch (error) {
      console.error("Failed to like template:", error);
    }
  };

  const handleUnlike = async (templateId: string) => {
    try {
      await fetch(`/api/templates/${templateId}/like`, { method: "DELETE" });
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === templateId
            ? {
                ...t,
                likeCount: Math.max(0, t.likeCount - 1),
                userLiked: false,
              }
            : t,
        ),
      );
    } catch (error) {
      console.error("Failed to unlike template:", error);
    }
  };

  return (
    <div className={styles.gallery}>
      <div className={styles.galleryHeader}>
        <div className={styles.searchBar}>
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchTemplates()}
          />
          <Button variant="secondary" onClick={fetchTemplates}>
            Search
          </Button>
        </div>
        <div className={styles.sortSelect}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={styles.select}
          >
            <option value="recent">Most Recent</option>
            <option value="popular">Most Used</option>
            <option value="likes">Most Liked</option>
          </select>
        </div>
        {showCreateButton && onCreateNew && (
          <Button variant="primary" onClick={onCreateNew}>
            Create New
          </Button>
        )}
      </div>

      {loading ? (
        <div className={styles.loading}>Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className={styles.emptyState}>
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              userLiked={template.userLiked}
              onLike={handleLike}
              onUnlike={handleUnlike}
              showActions={!!onSelectTemplate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
