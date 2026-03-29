"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { FlowGraph } from "@createflowchart/core";

interface FlowData {
  id: string;
  title: string;
  data: FlowGraph;
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
        <EmbedPreview data={flow.data} />
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

function EmbedPreview({ data }: { data: FlowGraph }) {
  const nodes = data.nodes || [];
  const edges = data.edges || [];

  return (
    <div style={embedStyles.previewContainer}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 400 300"
        style={embedStyles.svg}
      >
        {edges.map((edge, i) => {
          const sourceNode = nodes.find((n) => n.id === edge.source);
          const targetNode = nodes.find((n) => n.id === edge.target);
          if (!sourceNode || !targetNode) return null;

          const x1 = (sourceNode.position?.x || 0) + 50;
          const y1 = (sourceNode.position?.y || 0) + 25;
          const x2 = (targetNode.position?.x || 0) + 50;
          const y2 = (targetNode.position?.y || 0) + 25;

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#6b7280"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          );
        })}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
          </marker>
        </defs>
        {nodes.map((node, i) => (
          <g
            key={node.id || i}
            transform={`translate(${node.position?.x || 0}, ${node.position?.y || 0})`}
          >
            <rect
              width="100"
              height="50"
              rx="8"
              fill={getNodeColor(node.type)}
              opacity="0.9"
            />
            <text
              x="50"
              y="30"
              textAnchor="middle"
              fill="white"
              fontSize="12"
              fontWeight="500"
            >
              {node.data?.label?.slice(0, 12) ||
                node.type?.slice(0, 8) ||
                "Node"}
            </text>
          </g>
        ))}
      </svg>
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
  previewContainer: {
    background: "#0f0f23",
    borderRadius: "8px",
    width: "100%",
    height: "100%",
    minHeight: "200px",
  },
  svg: {
    minWidth: "200px",
    minHeight: "150px",
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
