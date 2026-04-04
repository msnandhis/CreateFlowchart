import type { DiagramModel } from "@createflowchart/schema";
import { drawEdge, drawGroup, drawNode } from "./draw";

export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private model: DiagramModel | null = null;
  private transform: CanvasTransform = { x: 0, y: 0, scale: 1 };
  private selectedIds: Set<string> = new Set();
  private isRendering = false;
  private animationFrameId = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not initialize 2D context");
    this.ctx = context;

    this.resize();
    window.addEventListener("resize", this.resize);
  }

  public setModel(model: DiagramModel) {
    this.model = model;
    this.requestRender();
  }

  public setTransform(transform: CanvasTransform) {
    this.transform = transform;
    this.requestRender();
  }

  public getTransform(): CanvasTransform {
    return { ...this.transform };
  }

  public setSelection(ids: string[]) {
    this.selectedIds = new Set(ids);
    this.requestRender();
  }

  public destroy() {
    window.removeEventListener("resize", this.resize);
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private resize = () => {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    this.ctx.scale(dpr, dpr);
    this.requestRender();
  };

  private requestRender = () => {
    if (!this.isRendering) {
      this.isRendering = true;
      this.animationFrameId = requestAnimationFrame(this.render);
    }
  };

  private render = () => {
    this.isRendering = false;
    
    // Clear canvas
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);

    if (!this.model) return;

    // Apply viewport transform
    this.ctx.save();
    this.ctx.translate(this.transform.x, this.transform.y);
    this.ctx.scale(this.transform.scale, this.transform.scale);

    // Draw grid background (optional pattern, skipping for MVP performance)

    // Render layers: Groups -> Edges -> Nodes
    for (const group of this.model.groups) {
      drawGroup(this.ctx, group, this.selectedIds.has(group.id));
    }

    for (const edge of this.model.edges) {
      drawEdge(this.ctx, this.model, edge, this.selectedIds.has(edge.id));
    }

    for (const node of this.model.nodes) {
      drawNode(this.ctx, node, this.selectedIds.has(node.id));
    }

    this.ctx.restore();
  };

  // Convert screen coordinates (from mouse event) to world coordinates (in DiagramModel)
  public screenToWorld(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    return {
      x: (x - this.transform.x) / this.transform.scale,
      y: (y - this.transform.y) / this.transform.scale,
    };
  }

  // Basic Hit Testing
  public hitTest(worldX: number, worldY: number): string | null {
    if (!this.model) return null;

    // Hit test nodes (reverse order -> top down)
    for (let i = this.model.nodes.length - 1; i >= 0; i--) {
      const node = this.model.nodes[i];
      if (
        worldX >= node.position.x &&
        worldX <= node.position.x + node.size.width &&
        worldY >= node.position.y &&
        worldY <= node.position.y + node.size.height
      ) {
        return node.id;
      }
    }

    // Edge hit testing is more complex, skipped for MVP
    return null;
  }
}
