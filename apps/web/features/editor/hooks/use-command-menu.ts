"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { NodeType } from "@createflowchart/core";
import { flowchartPalette } from "../lib/flowchart-shapes";

interface Command {
  id: string;
  label: string;
  description: string;
  icon: string;
  action: () => void;
  category: "add" | "edit" | "view" | "ai" | "file";
}

export interface UseCommandMenuOptions {
  onAddNode: (type: NodeType) => void;
  onAutoLayout: () => void;
  onGenerate: () => void;
  onAnalyze: () => void;
  onExport: () => void;
  onImport: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useCommandMenu({
  onAddNode,
  onAutoLayout,
  onGenerate,
  onAnalyze,
  onExport,
  onImport,
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: UseCommandMenuOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const addCommands: Command[] = flowchartPalette.map((item) => ({
    id: `add-${item.legacyType}`,
    label: `Add ${item.label}`,
    description: item.description,
    icon: item.icon,
    category: "add",
    action: () => onAddNode(item.legacyType),
  }));

  const commands: Command[] = [
    ...addCommands,
    {
      id: "undo",
      label: "Undo",
      description: "Undo last change",
      icon: "↩️",
      category: "edit",
      action: () => canUndo && onUndo(),
    },
    {
      id: "redo",
      label: "Redo",
      description: "Redo last change",
      icon: "↪️",
      category: "edit",
      action: () => canRedo && onRedo(),
    },
    {
      id: "auto-layout",
      label: "Auto Layout",
      description: "Automatically arrange nodes",
      icon: "📐",
      category: "view",
      action: onAutoLayout,
    },
    {
      id: "generate",
      label: "Generate Flow",
      description: "Generate a flow using AI",
      icon: "🤖",
      category: "ai",
      action: onGenerate,
    },
    {
      id: "analyze",
      label: "Analyze Flow",
      description: "Analyze flow for issues",
      icon: "🔍",
      category: "ai",
      action: onAnalyze,
    },
    {
      id: "import",
      label: "Import JSON",
      description: "Import from JSON file",
      icon: "📁",
      category: "file",
      action: onImport,
    },
    {
      id: "export",
      label: "Export",
      description: "Export flow to PNG/SVG/JSON",
      icon: "📤",
      category: "file",
      action: onExport,
    },
    {
      id: "save",
      label: "Save to Cloud",
      description: "Save flow to your account",
      icon: "💾",
      category: "file",
      action: onSave,
    },
  ];

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description.toLowerCase().includes(search.toLowerCase()),
  );

  const open = useCallback(() => {
    setIsOpen(true);
    setSearch("");
    setSelectedIndex(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearch("");
  }, []);

  const execute = useCallback(
    (index: number) => {
      const cmd = filteredCommands[index];
      if (cmd) {
        cmd.action();
        close();
      }
    },
    [filteredCommands, close],
  );

  const moveSelection = useCallback(
    (direction: "up" | "down") => {
      setSelectedIndex((prev) => {
        if (direction === "up") {
          return prev > 0 ? prev - 1 : filteredCommands.length - 1;
        }
        return prev < filteredCommands.length - 1 ? prev + 1 : 0;
      });
    },
    [filteredCommands.length],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !isOpen && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        open();
      }
      if (e.key === "Escape" && isOpen) {
        close();
      }
      if (isOpen) {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          moveSelection("up");
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          moveSelection("down");
        }
        if (e.key === "Enter") {
          e.preventDefault();
          execute(selectedIndex);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, open, close, moveSelection, execute, selectedIndex]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  return {
    isOpen,
    search,
    setSearch,
    selectedIndex,
    filteredCommands,
    inputRef,
    open,
    close,
    execute,
  };
}
