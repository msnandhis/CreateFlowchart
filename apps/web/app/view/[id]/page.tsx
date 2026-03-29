"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/shared/ui/Button";
import type { DiagramDocument } from "@createflowchart/schema";
import { DocumentPreview } from "@/features/diagram/components/DocumentPreview";

interface FlowData {
  id: string;
  title: string;
  document: DiagramDocument;
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
          <DocumentPreview document={flow.document} minHeight={520} />
        </div>
      </main>

      <footer style={styles.footer}>
        <p>Created with CreateFlowchart</p>
      </footer>
    </div>
  );
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
    width: "min(1100px, 100%)",
  },
  footer: {
    padding: "var(--space-4)",
    textAlign: "center",
    fontSize: "var(--font-size-xs)",
    color: "var(--color-text-muted)",
    borderTop: "1px solid var(--color-border)",
  },
};
