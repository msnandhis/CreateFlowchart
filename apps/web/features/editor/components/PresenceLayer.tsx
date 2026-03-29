"use client";

import { useEffect, useState } from "react";
import type { WebsocketProvider } from "y-websocket";

interface CursorData {
  x: number;
  y: number;
  name: string;
  color: string;
}

/**
 * Renders remote cursors based on Yjs awareness state.
 */
export function PresenceLayer({ provider }: { provider: WebsocketProvider | null }) {
  const [awareness, setAwareness] = useState<Map<number, any>>(new Map());

  useEffect(() => {
    if (!provider) return;

    const handleUpdate = () => {
      const states = provider.awareness.getStates();
      setAwareness(new Map(states));
    };

    provider.awareness.on("change", handleUpdate);
    return () => provider.awareness.off("change", handleUpdate);
  }, [provider]);

  return (
    <>
      {Array.from(awareness.entries()).map(([clientId, state]) => {
        if (clientId === provider?.awareness.clientID || !state.cursor) return null;

        const { x, y, name, color } = state.cursor as CursorData;
        return (
          <div
            key={clientId}
            style={{
              position: "absolute",
              left: x,
              top: y,
              pointerEvents: "none",
              zIndex: 1000,
              transition: "all 0.1s ease-out",
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderTop: `12px solid ${color}`,
                transform: "rotate(45deg)",
              }}
            />
            <div
              style={{
                marginTop: 4,
                padding: "2px 6px",
                background: color,
                color: "white",
                fontSize: 10,
                borderRadius: 4,
                fontWeight: "bold",
                whiteSpace: "nowrap",
              }}
            >
              {name || "Anonymous User"}
            </div>
          </div>
        );
      })}
    </>
  );
}
