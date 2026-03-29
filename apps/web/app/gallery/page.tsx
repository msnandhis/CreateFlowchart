"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { FlowCard } from "@/features/dashboard/components/FlowCard";
import styles from "./gallery.module.css";

interface FlowWithAuthor {
  id: string;
  title: string;
  data: unknown;
  isPublic: boolean;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    image: string | null;
  };
  userLiked?: boolean;
}

export default function GalleryPage() {
  const router = useRouter();
  const [flows, setFlows] = useState<FlowWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<"recent" | "likes">("recent");

  const fetchFlows = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("sortBy", sortBy);
      const res = await fetch(`/api/flows/public?${params}`);
      const data = await res.json();
      setFlows(data.flows || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch flows:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, [sortBy]);

  const handleLike = async (flowId: string) => {
    try {
      await fetch(`/api/flows/${flowId}/like`, { method: "POST" });
      setFlows((prev) =>
        prev.map((f) =>
          f.id === flowId
            ? { ...f, likeCount: f.likeCount + 1, userLiked: true }
            : f,
        ),
      );
    } catch (error) {
      console.error("Failed to like flow:", error);
    }
  };

  const handleUnlike = async (flowId: string) => {
    try {
      await fetch(`/api/flows/${flowId}/like`, { method: "DELETE" });
      setFlows((prev) =>
        prev.map((f) =>
          f.id === flowId
            ? {
                ...f,
                likeCount: Math.max(0, f.likeCount - 1),
                userLiked: false,
              }
            : f,
        ),
      );
    } catch (error) {
      console.error("Failed to unlike flow:", error);
    }
  };

  return (
    <div className={styles.gallery}>
      <nav className={styles.nav}>
        <Link href="/dashboard" className={styles.logo}>
          CreateFlowchart
        </Link>
        <div className={styles.navLinks}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/gallery" className={styles.active}>
            Gallery
          </Link>
          <Link href="/templates">Templates</Link>
        </div>
        <div className={styles.navActions}>
          <Link href="/editor">
            <Button variant="primary" size="sm">
              New Flow
            </Button>
          </Link>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>Public Flow Gallery</h1>
          <p className={styles.subtitle}>
            Explore {total} flowcharts created by the community
          </p>
        </div>

        <div className={styles.controls}>
          <div className={styles.sortSelect}>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as typeof sortBy);
                fetchFlows();
              }}
              className={styles.select}
            >
              <option value="recent">Most Recent</option>
              <option value="likes">Most Liked</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading flows...</div>
        ) : flows.length === 0 ? (
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
            <p>No public flows yet</p>
            <Link href="/editor">
              <Button variant="primary">Create the first one</Button>
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {flows.map((flow) => (
              <FlowCard
                key={flow.id}
                id={flow.id}
                title={flow.title}
                isPublic={flow.isPublic}
                likeCount={flow.likeCount}
                updatedAt={flow.updatedAt}
                nodeCount={(flow.data as any)?.nodes?.length || 0}
                userLiked={flow.userLiked}
                showLikeButton
                onLike={handleLike}
                onUnlike={handleUnlike}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
