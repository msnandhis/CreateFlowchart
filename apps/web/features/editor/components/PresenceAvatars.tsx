"use client";

import styles from "../styles/presence.module.css";

interface PresenceUser {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  lastActive: number;
}

interface PresenceAvatarsProps {
  users: Map<number, PresenceUser>;
  maxDisplay?: number;
}

export function PresenceAvatars({
  users,
  maxDisplay = 5,
}: PresenceAvatarsProps) {
  const userList = Array.from(users.values());
  const displayUsers = userList.slice(0, maxDisplay);
  const remainingCount = userList.length - maxDisplay;

  if (userList.length === 0) {
    return null;
  }

  return (
    <div className={styles.avatars}>
      {displayUsers.map((user) => (
        <div
          key={user.id}
          className={styles.avatar}
          style={{ backgroundColor: user.color }}
          title={user.name}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {remainingCount > 0 && (
        <div className={styles.avatarMore}>+{remainingCount}</div>
      )}
    </div>
  );
}
