"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { DiagramDocument } from "@createflowchart/schema";
import { DocumentPreview } from "@/features/diagram/components/DocumentPreview";

interface FlowData {
  id: string;
  title: string;
  document: DiagramDocument;
}

export default function EmbedPage() {
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
          setError("Flow not found or is private");
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
      <div style={embedStyles.loading}>
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !flow) {
    return (
      <div style={embedStyles.error}>
        <p>{error || "Flow not found"}</p>
      </div>
    );
  }

  return (
    <div style={embedStyles.container}>
      <div style={embedStyles.header}>
        <span style={embedStyles.title}>{flow.title}</span>
      </div>
      <div style={embedStyles.content}>
        <DocumentPreview document={flow.document} minHeight="100%" />
      </div>
      <div style={embedStyles.footer}>
        <a
          href={`${process.env.NEXT_PUBLIC_APP_URL || ""}/view/${flow.id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={embedStyles.brandLink}
        >
          CreateFlowchart
        </a>
      </div>
    </div>
  );
}

const embedStyles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#1a1a2e",
    color: "white",
    overflow: "hidden",
  },
  loading: {
    width: "100%",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#1a1a2e",
    color: "#9ca3af",
  },
  error: {
    width: "100%",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#1a1a2e",
    color: "#ef4444",
  },
  header: {
    padding: "8px 16px",
    background: "#16213e",
    borderBottom: "1px solid #0f3460",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: "14px",
    fontWeight: 500,
    color: "#e5e7eb",
  },
  content: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    overflow: "auto",
  },
  footer: {
    padding: "6px 16px",
    background: "#16213e",
    borderTop: "1px solid #0f3460",
    textAlign: "center",
  },
  brandLink: {
    fontSize: "11px",
    color: "#6b7280",
    textDecoration: "none",
  },
};
