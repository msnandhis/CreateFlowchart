"use client";

import styles from "../styles/presence.module.css";

interface RemoteCursorProps {
  x: number;
  y: number;
  name: string;
  color: string;
}

export function RemoteCursor({ x, y, name, color }: RemoteCursorProps) {
  return (
    <div
      className={styles.remoteCursor}
      style={{
        transform: `translate(${x}px, ${y}px)`,
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        style={{ color }}
      >
        <path
          d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L5.87 2.36a.5.5 0 0 0-.37.85z"
          fill="currentColor"
        />
      </svg>
      <span className={styles.cursorLabel} style={{ backgroundColor: color }}>
        {name}
      </span>
    </div>
  );
}

interface RemoteCursorsProps {
  users: Map<
    number,
    {
      id: string;
      name: string;
      color: string;
      cursor?: { x: number; y: number };
    }
  >;
}

export function RemoteCursors({ users }: RemoteCursorsProps) {
  return (
    <div className={styles.cursorsContainer}>
      {Array.from(users.entries()).map(([clientId, user]) => {
        if (!user.cursor) return null;
        return (
          <RemoteCursor
            key={clientId}
            x={user.cursor.x}
            y={user.cursor.y}
            name={user.name}
            color={user.color}
          />
        );
      })}
    </div>
  );
}
