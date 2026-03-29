"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { WebsocketProvider } from "y-websocket";

interface PresenceUser {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  lastActive: number;
}

interface UsePresenceOptions {
  provider: WebsocketProvider | null;
  userId: string;
  userName: string;
  userColor: string;
}

export function usePresence({
  provider,
  userId,
  userName,
  userColor,
}: UsePresenceOptions) {
  const [users, setUsers] = useState<Map<number, PresenceUser>>(new Map());
  const [localUser, setLocalUser] = useState<{ x: number; y: number } | null>(
    null,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const awarenessRef = useRef<any>(null);

  useEffect(() => {
    if (!provider) return;

    const awareness = provider.awareness;
    awarenessRef.current = awareness;

    awareness.setLocalStateField("user", {
      id: userId,
      name: userName,
      color: userColor,
      cursor: null,
      lastActive: Date.now(),
    });

    const handleChange = () => {
      const states = awareness.getStates();
      const newUsers = new Map<number, PresenceUser>();

      states.forEach((state: any, clientId: number) => {
        if (clientId === awareness.clientID) return;
        if (state.user) {
          newUsers.set(clientId, {
            ...state.user,
            cursor: state.cursor,
          });
        }
      });

      setUsers(newUsers);
    };

    awareness.on("change", handleChange);
    handleChange();

    return () => {
      awareness.off("change", handleChange);
    };
  }, [provider, userId, userName, userColor]);

  const updateCursor = useCallback(
    (x: number, y: number) => {
      if (!awarenessRef.current) return;

      setLocalUser({ x, y });
      awarenessRef.current.setLocalStateField("cursor", { x, y });
      awarenessRef.current.setLocalStateField("user", {
        id: userId,
        name: userName,
        color: userColor,
        cursor: { x, y },
        lastActive: Date.now(),
      });
    },
    [userId, userName, userColor],
  );

  const clearCursor = useCallback(() => {
    if (!awarenessRef.current) return;

    setLocalUser(null);
    awarenessRef.current.setLocalStateField("cursor", null);
    awarenessRef.current.setLocalStateField("user", {
      id: userId,
      name: userName,
      color: userColor,
      cursor: null,
      lastActive: Date.now(),
    });
  }, [userId, userName, userColor]);

  const updateName = useCallback(
    (name: string) => {
      if (!awarenessRef.current) return;

      awarenessRef.current.setLocalStateField("user", {
        id: userId,
        name,
        color: userColor,
        cursor: localUser,
        lastActive: Date.now(),
      });
    },
    [userId, userColor, localUser],
  );

  return {
    users,
    localUser,
    updateCursor,
    clearCursor,
    updateName,
  };
}
