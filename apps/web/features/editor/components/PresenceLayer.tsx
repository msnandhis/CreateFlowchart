"use client";

import { RemoteCursors } from "./RemoteCursor";

interface PresenceLayerProps {
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

export function PresenceLayer({ users }: PresenceLayerProps) {
  return <RemoteCursors users={users} />;
}
