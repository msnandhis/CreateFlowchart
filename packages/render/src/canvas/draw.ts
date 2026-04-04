import type { DiagramModel, DiagramNode, DiagramEdge, DiagramGroup } from "@createflowchart/schema";

// ═══════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════

function inferToneColors(node: DiagramNode): { fill: string; stroke: string } {
  const s = node.shape.toLowerCase();
  if (s.includes("start")) return { fill: "rgba(16,185,129,0.14)", stroke: "#10b981" };
  if (s.includes("end") || s.includes("terminal")) return { fill: "rgba(239,68,68,0.14)", stroke: "#ef4444" };
  if (s.includes("decision") || s.includes("gateway")) return { fill: "rgba(167,139,250,0.14)", stroke: "#a78bfa" };
  if (s.includes("action") || s.includes("service") || s.includes("automation")) return { fill: "rgba(251,146,60,0.14)", stroke: "#fb923c" };
  return { fill: "rgba(58,134,255,0.14)", stroke: "#3a86ff" }; // process
}

// ═══════════════════════════════════════════════════════════════════
// Nodes
// ═══════════════════════════════════════════════════════════════════

export function drawNode(ctx: CanvasRenderingContext2D, node: DiagramNode, isSelected: boolean) {
  const { x, y } = node.position;
  const { width: w, height: h } = node.size;
  const { fill, stroke } = inferToneColors(node);

  ctx.save();
  ctx.translate(x, y);

  // Draw Shape
  ctx.beginPath();
  buildShapePath(ctx, node.shape, w, h);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = isSelected ? 3 : 2;
  ctx.strokeStyle = isSelected ? "#0ea5e9" : stroke;
  ctx.stroke();

  // Draw Selection Halo
  if (isSelected) {
    ctx.beginPath();
    ctx.rect(-5, -5, w + 10, h + 10);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(14, 165, 233, 0.4)";
    ctx.setLineDash([4, 4]);
    ctx.stroke();
  }
  
  // Draw Label
  ctx.fillStyle = "#f8fafc";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "600 14px Inter, system-ui, sans-serif";
  const textY = node.subtitle ? h / 2 - 8 : h / 2;
  ctx.fillText(node.label, w / 2, textY);

  if (node.subtitle) {
    ctx.fillStyle = "rgba(226,232,240,0.6)";
    ctx.font = "400 10px Inter, system-ui, sans-serif";
    ctx.fillText(node.subtitle.toUpperCase(), w / 2, h / 2 + 12);
  }

  ctx.restore();
}

function buildShapePath(ctx: CanvasRenderingContext2D, shape: string, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;

  if (shape.includes("start") || shape.includes("end") || shape.includes("terminal")) {
    ctx.roundRect(0, 0, w, h, h / 2);
  } else if (shape.includes("diamond") || shape.includes("decision") || shape.includes("gateway")) {
    ctx.moveTo(cx, 0);
    ctx.lineTo(w, cy);
    ctx.lineTo(cx, h);
    ctx.lineTo(0, cy);
    ctx.closePath();
  } else if (shape.includes("circle") || shape.includes("event")) {
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else if (shape.includes("parallelogram") || shape.includes("io")) {
    ctx.moveTo(w * 0.12, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w * 0.88, h);
    ctx.lineTo(0, h);
    ctx.closePath();
  } else if (shape.includes("hexagon")) {
    ctx.moveTo(w * 0.12, 0);
    ctx.lineTo(w * 0.88, 0);
    ctx.lineTo(w, cy);
    ctx.lineTo(w * 0.88, h);
    ctx.lineTo(w * 0.12, h);
    ctx.lineTo(0, cy);
    ctx.closePath();
  } else if (shape.includes("cylinder") || shape.includes("database")) {
    // Top ellipse
    ctx.ellipse(cx, 12, w / 2, 12, 0, 0, Math.PI * 2);
    ctx.moveTo(0, 12);
    ctx.lineTo(0, h - 12);
    ctx.ellipse(cx, h - 12, w / 2, 12, 0, Math.PI, 0, true);
    ctx.lineTo(w, 12);
  } else {
    // Default rounded rect
    ctx.roundRect(0, 0, w, h, 14);
  }
}

// ═══════════════════════════════════════════════════════════════════
// Groups
// ═══════════════════════════════════════════════════════════════════

export function drawGroup(ctx: CanvasRenderingContext2D, group: DiagramGroup, isSelected: boolean) {
  const { x, y } = group.position;
  const { width: w, height: h } = group.size;

  ctx.save();
  ctx.translate(x, y);

  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 16);
  ctx.fillStyle = group.style.fill ?? "rgba(148, 163, 184, 0.06)";
  ctx.fill();

  ctx.lineWidth = isSelected ? 2 : 1.5;
  ctx.strokeStyle = isSelected ? "#0ea5e9" : (group.style.stroke ?? "rgba(148, 163, 184, 0.35)");
  if (!isSelected && group.style.strokeDash) {
    ctx.setLineDash(group.style.strokeDash.split(",").map(Number));
  }
  ctx.stroke();

  if (group.label) {
    ctx.fillStyle = "#cbd5e1";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "600 13px Inter, system-ui, sans-serif";
    ctx.fillText(group.label, 16, 16);
  }

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════
// Edges
// ═══════════════════════════════════════════════════════════════════

export function drawEdge(
  ctx: CanvasRenderingContext2D,
  model: DiagramModel,
  edge: DiagramEdge,
  isSelected: boolean
) {
  const sourceNode = model.nodes.find((n) => n.id === edge.source);
  const targetNode = model.nodes.find((n) => n.id === edge.target);
  if (!sourceNode || !targetNode) return;

  const sp = getAnchorPoint(sourceNode, edge.sourcePort, "source");
  const tp = getAnchorPoint(targetNode, edge.targetPort, "target");

  ctx.save();
  ctx.beginPath();

  const routing = edge.routing ?? "orthogonal";
  if (routing === "straight") {
    ctx.moveTo(sp.x, sp.y);
    ctx.lineTo(tp.x, tp.y);
  } else if (routing === "bezier" || routing === "smooth") {
    const mx = (sp.x + tp.x) / 2;
    ctx.moveTo(sp.x, sp.y);
    ctx.bezierCurveTo(mx, sp.y, mx, tp.y, tp.x, tp.y);
  } else {
    const my = (sp.y + tp.y) / 2;
    ctx.moveTo(sp.x, sp.y);
    ctx.lineTo(sp.x, my);
    ctx.lineTo(tp.x, my);
    ctx.lineTo(tp.x, tp.y);
  }

  ctx.lineWidth = isSelected ? 3 : (edge.style.strokeWidth ?? 2);
  ctx.strokeStyle = isSelected ? "#0ea5e9" : (edge.style.stroke ?? "rgba(203, 213, 225, 0.75)");
  if (edge.style.strokeDash) {
    ctx.setLineDash(edge.style.strokeDash.split(",").map(Number));
  }
  ctx.stroke();

  // Draw arrow marker
  if (edge.targetMarker !== "none") {
    drawArrow(ctx, sp, tp, routing);
  }

  // Draw Label
  const labelText = edge.label || (edge.labels && edge.labels[0]?.text);
  if (labelText) {
    const mx = (sp.x + tp.x) / 2;
    const my = (sp.y + tp.y) / 2;

    ctx.fillStyle = "#1e293b";
    const width = ctx.measureText(labelText).width + 12;
    ctx.fillRect(mx - width/2, my - 10, width, 20);

    ctx.fillStyle = "#e2e8f0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "500 11px Inter, system-ui, sans-serif";
    ctx.fillText(labelText, mx, my);
  }

  ctx.restore();
}

function drawArrow(ctx: CanvasRenderingContext2D, sp: any, tp: any, routing: string) {
  let angle = 0;
  if (routing === "straight") {
    angle = Math.atan2(tp.y - sp.y, tp.x - sp.x);
  } else {
    // For orthogonal/bezier curving into top/bottom
    angle = tp.y > sp.y ? Math.PI / 2 : -Math.PI / 2;
  }

  ctx.save();
  ctx.translate(tp.x, tp.y);
  ctx.rotate(angle);
  
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-10, -5);
  ctx.lineTo(-10, 5);
  ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fill();
  
  ctx.restore();
}

// Copied from v3.ts
function getAnchorPoint(node: DiagramNode, portId: string | undefined, role: "source" | "target") {
  if (portId && node.ports) {
    const port = node.ports.find((p) => p.id === portId);
    if (port) {
      const { width: w, height: h } = node.size;
      const { x, y } = node.position;
      switch (port.side) {
        case "top":    return { x: x + w * port.offset, y };
        case "bottom": return { x: x + w * port.offset, y: y + h };
        case "left":   return { x, y: y + h * port.offset };
        case "right":  return { x: x + w, y: y + h * port.offset };
      }
    }
  }
  const { x, y } = node.position;
  const { width: w, height: h } = node.size;
  if (role === "source") return { x: x + w / 2, y: y + h };
  return { x: x + w / 2, y };
}
