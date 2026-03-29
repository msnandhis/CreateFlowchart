"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/shared/ui/Button";
import type { FlowGraph } from "@createflowchart/core";

interface FlowData {
  id: string;
  title: string;
  data: FlowGraph;
  author: {
    name: string;
  };
}

export default function ViewPage() {
  const params = useParams();
  const id = params.id as string;
  const [flow, setFlow] = useState<FlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlow = async () => {
      try {
        const res = await fetch(`/api/flows/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Flow not found or is private");
          } else {
            setError("Failed to load flow");
          }
          return;
        }
        const data = await res.json();
        setFlow(data);
      } catch (err) {
        setError("Failed to load flow");
      } finally {
        setLoading(false);
      }
    };

    fetchFlow();
  }, [id]);

  if (loading) {
    return (
      <div style={styles.loading}>
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !flow) {
    return (
      <div style={styles.error}>
        <h1>404</h1>
        <p>{error || "Flow not found"}</p>
        <Link href="/">
          <Button variant="primary">Go Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <Link href="/" style={styles.logo}>
          CreateFlowchart
        </Link>
        <div style={styles.flowInfo}>
          <h1 style={styles.title}>{flow.title}</h1>
          <span style={styles.author}>by {flow.author.name}</span>
        </div>
        <Link href={`/editor/${flow.id}`}>
          <Button variant="primary" size="sm">
            Open in Editor
          </Button>
        </Link>
      </nav>

      <main style={styles.main}>
        <div style={styles.flowPreview}>
          <FlowPreview data={flow.data} />
        </div>
      </main>

      <footer style={styles.footer}>
        <p>Created with CreateFlowchart</p>
      </footer>
    </div>
  );
}

function FlowPreview({ data }: { data: FlowGraph }) {
  const nodes = data.nodes || [];
  const nodeCount = nodes.length;

  return (
    <div style={styles.previewContainer}>
      <div style={styles.nodeCount}>
        {nodeCount} node{nodeCount !== 1 ? "s" : ""}
      </div>
      <div style={styles.minimap}>
        {nodes.map((node, i) => (
          <div
            key={node.id || i}
            style={{
              ...styles.miniNode,
              backgroundColor: getNodeColor(node.type),
            }}
          />
        ))}
      </div>
      <p style={styles.previewHint}>Open in editor to see the full flowchart</p>
    </div>
  );
}

function getNodeColor(type?: string): string {
  switch (type) {
    case "start":
    case "end":
      return "#10b981";
    case "decision":
      return "#f59e0b";
    case "action":
      return "#3b82f6";
    default:
      return "#6b7280";
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "var(--color-bg)",
  },
  loading: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--color-text-muted)",
  },
  error: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-4)",
    color: "var(--color-text-primary)",
  },
  nav: {
    height: "64px",
    background: "var(--color-surface)",
    borderBottom: "1px solid var(--color-border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 var(--space-8)",
  },
  logo: {
    fontSize: "var(--font-size-lg)",
    fontWeight: "bold",
    color: "var(--color-text-primary)",
    textDecoration: "none",
  },
  flowInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  title: {
    fontSize: "var(--font-size-lg)",
    fontWeight: "var(--font-weight-semibold)",
    color: "var(--color-text-primary)",
  },
  author: {
    fontSize: "var(--font-size-xs)",
    color: "var(--color-text-muted)",
  },
  main: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--space-10)",
  },
  flowPreview: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-xl)",
    padding: "var(--space-10)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "var(--space-6)",
  },
  previewContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "var(--space-4)",
  },
  nodeCount: {
    fontSize: "var(--font-size-sm)",
    color: "var(--color-text-muted)",
  },
  minimap: {
    display: "flex",
    flexWrap: "wrap",
    gap: "var(--space-2)",
    maxWidth: "300px",
    justifyContent: "center",
  },
  miniNode: {
    width: "12px",
    height: "12px",
    borderRadius: "var(--radius-sm)",
    opacity: 0.7,
  },
  previewHint: {
    fontSize: "var(--font-size-xs)",
    color: "var(--color-text-muted)",
  },
  footer: {
    padding: "var(--space-4)",
    textAlign: "center",
    fontSize: "var(--font-size-xs)",
    color: "var(--color-text-muted)",
    borderTop: "1px solid var(--color-border)",
  },
};
