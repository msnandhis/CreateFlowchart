"use client";

import { useState, useCallback } from "react";
import { Modal } from "@/shared/ui/Modal";
import { Button } from "@/shared/ui/Button";
import { useEditorStore } from "../stores/editorStore";
import { exportAsJSON, exportAsMermaid, exportAsSVG, type ExportFormat } from "@/shared/lib/export-renderer";
import styles from "../styles/export.module.css";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

export function ExportModal({ open, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>("svg");
  const [exporting, setExporting] = useState(false);
  const getFlowGraph = useEditorStore((s) => s.getFlowGraph);

  const svgToImage = useCallback(async (svgString: string, mimeType: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      img.onload = () => {
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Could not convert to blob"));
          }
        }, mimeType);
      };

      img.onerror = () => {
        reject(new Error("Could not load SVG image"));
      };

      const blob = new Blob([svgString], { type: "image/svg+xml" });
      img.src = URL.createObjectURL(blob);
    });
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const flowGraph = getFlowGraph();

      if (format === "json") {
        const result = exportAsJSON(flowGraph);
        if (result.content) {
          downloadText(result.content, "flowchart.json");
        }
      } else if (format === "mermaid") {
        const result = exportAsMermaid(flowGraph);
        if (result.content) {
          downloadText(result.content, "flowchart.mmd");
        }
      } else if (format === "svg") {
        const result = exportAsSVG(flowGraph);
        if (result.content) {
          downloadText(result.content, "flowchart.svg");
        }
      } else if (format === "png") {
        const result = exportAsSVG(flowGraph);
        if (result.content) {
          const blob = await svgToImage(result.content, "image/png");
          downloadBlob(blob, "flowchart.png");
        }
      } else if (format === "pdf") {
        const result = exportAsSVG(flowGraph);
        if (result.content) {
          const blob = await svgToImage(result.content, "image/png");
          const pdfUrl = await createPdfFromImage(blob, result.content);
          downloadBlob(pdfUrl, "flowchart.pdf");
        }
      }
    } catch (e) {
      console.error("[Export] Error:", e);
    } finally {
      setExporting(false);
      onClose();
    }
  };

  const createPdfFromImage = async (imageBlob: Blob, svgContent: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        ctx.scale(2, 2);

        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
        const svgString = new XMLSerializer().serializeToString(svgDoc.documentElement);
        const svgBlob = new Blob([svgString], { type: "image/svg+xml" });
        const svgUrl = URL.createObjectURL(svgBlob);

        const bgImg = new Image();
        bgImg.onload = () => {
          ctx.drawImage(bgImg, 0, 0);
          URL.revokeObjectURL(svgUrl);

          const pdfCanvas = document.createElement("canvas");
          pdfCanvas.width = canvas.width;
          pdfCanvas.height = canvas.height;
          const pdfCtx = pdfCanvas.getContext("2d");
          if (!pdfCtx) {
            reject(new Error("Could not get PDF canvas context"));
            return;
          }
          pdfCtx.fillStyle = "#0a0a0a";
          pdfCtx.fillRect(0, 0, pdfCanvas.width, pdfCanvas.height);
          pdfCtx.drawImage(canvas, 0, 0);

          const imgData = pdfCanvas.toDataURL("image/png");
          const pdfWidth = 612;
          const pdfHeight = (pdfCanvas.height / pdfCanvas.width) * pdfWidth;

          const pdfContent = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${pdfWidth}" height="${pdfHeight}">
              <image href="${imgData}" width="${pdfWidth}" height="${pdfHeight}"/>
            </svg>
          `;

          const blob = new Blob([pdfContent], { type: "application/pdf" });
          resolve(blob);
        };
        bgImg.src = svgUrl;
      };
      img.src = URL.createObjectURL(imageBlob);
    });
  };

  const downloadText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formats = [
    { value: "svg", label: "SVG", desc: "Scalable Vector Graphics" },
    { value: "png", label: "PNG", desc: "Raster image (converted from SVG)" },
    { value: "pdf", label: "PDF", desc: "PDF document (converted from SVG)" },
    { value: "json", label: "JSON", desc: "Raw flowchart data" },
    { value: "mermaid", label: "Mermaid", desc: "Mermaid diagram code" },
  ] as const;

  return (
    <Modal open={open} onClose={onClose} title="Export Flowchart">
      <div className={styles.content}>
        <div className={styles.section}>
          <label className={styles.label}>Select Format</label>
          <div className={styles.formatGrid}>
            {formats.map((f) => (
              <button
                key={f.value}
                className={`${styles.formatOption} ${format === f.value ? styles.selected : ""}`}
                onClick={() => setFormat(f.value)}
              >
                <span className={styles.formatLabel}>{f.label}</span>
                <span className={styles.formatDesc}>{f.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleExport} disabled={exporting}>
            {exporting ? "Exporting..." : `Download ${format.toUpperCase()}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}