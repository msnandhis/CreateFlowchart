import type { DiagramEngine } from "@createflowchart/schema";
import type { CanvasRenderer } from "../canvas/renderer";

export class ToolManager {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private engine: DiagramEngine;

  private isDraggingViewport = false;
  private isDraggingNode = false;
  private startClientX = 0;
  private startClientY = 0;
  private startTransformX = 0;
  private startTransformY = 0;
  
  private draggedNodeId: string | null = null;
  private startNodeX = 0;
  private startNodeY = 0;

  constructor(canvas: HTMLCanvasElement, renderer: CanvasRenderer, engine: DiagramEngine) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.engine = engine;

    this.bindEvents();
  }

  public destroy() {
    this.unbindEvents();
  }

  private bindEvents() {
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointerleave", this.onPointerUp);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
  }

  private unbindEvents() {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointerleave", this.onPointerUp);
    this.canvas.removeEventListener("wheel", this.onWheel);
  }

  private onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);

    const worldPoint = this.renderer.screenToWorld(e.clientX, e.clientY);
    const hitId = this.renderer.hitTest(worldPoint.x, worldPoint.y);

    if (e.button === 1 || (e.button === 0 && e.shiftKey) || (!hitId)) {
      // Middle click or shift+click or empty space = Pan
      this.isDraggingViewport = true;
      this.startClientX = e.clientX;
      this.startClientY = e.clientY;
      const t = this.renderer.getTransform();
      this.startTransformX = t.x;
      this.startTransformY = t.y;

      if (!e.shiftKey) {
        this.engine.select([]);
      }
    } else if (e.button === 0 && hitId) {
      // Left click on node = Select & Drag prepare
      this.isDraggingNode = true;
      this.draggedNodeId = hitId;
      this.engine.select([hitId]);

      this.startClientX = e.clientX;
      this.startClientY = e.clientY;
      const node = this.engine.getModel().nodes.find(n => n.id === hitId);
      if (node) {
        this.startNodeX = node.position.x;
        this.startNodeY = node.position.y;
      }
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    e.preventDefault();

    if (this.isDraggingViewport) {
      const dx = e.clientX - this.startClientX;
      const dy = e.clientY - this.startClientY;
      const t = this.renderer.getTransform();
      this.renderer.setTransform({
        x: this.startTransformX + dx,
        y: this.startTransformY + dy,
        scale: t.scale,
      });
    } else if (this.isDraggingNode && this.draggedNodeId) {
      const dx = e.clientX - this.startClientX;
      const dy = e.clientY - this.startClientY;
      const t = this.renderer.getTransform();
      
      const newX = this.startNodeX + dx / t.scale;
      const newY = this.startNodeY + dy / t.scale;

      // Update in engine -> this will trigger modelChanged -> syncs renderer
      this.engine.moveNode(this.draggedNodeId, { x: newX, y: newY });
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    e.preventDefault();
    this.canvas.releasePointerCapture(e.pointerId);
    this.isDraggingViewport = false;
    this.isDraggingNode = false;
    this.draggedNodeId = null;
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    
    // Pinch-to-zoom mapping on trackpads
    const isPinch = e.ctrlKey || e.metaKey;
    const t = this.renderer.getTransform();

    if (isPinch) {
      // Zoom
      const zoomFactor = -e.deltaY * 0.01;
      const scaleBy = 1 + zoomFactor;
      let newScale = t.scale * scaleBy;
      newScale = Math.max(0.1, Math.min(newScale, 5)); // clamp scale

      // Zoom around cursor
      const rect = this.canvas.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;

      const newX = pointerX - (pointerX - t.x) * (newScale / t.scale);
      const newY = pointerY - (pointerY - t.y) * (newScale / t.scale);

      this.renderer.setTransform({ x: newX, y: newY, scale: newScale });
    } else {
      // Pan
      this.renderer.setTransform({
        x: t.x - e.deltaX,
        y: t.y - e.deltaY,
        scale: t.scale,
      });
    }
  };
}
