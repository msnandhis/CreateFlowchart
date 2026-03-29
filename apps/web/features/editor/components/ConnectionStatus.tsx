"use client";

import styles from "../styles/presence.module.css";

type ConnectionStatusType = "disconnected" | "connecting" | "connected";

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  showLabel?: boolean;
}

export function ConnectionStatus({
  status,
  showLabel = true,
}: ConnectionStatusProps) {
  const getStatusInfo = () => {
    switch (status) {
      case "connected":
        return { icon: "🟢", label: "Connected" };
      case "connecting":
        return { icon: "🟡", label: "Connecting..." };
      case "disconnected":
        return { icon: "🔴", label: "Disconnected" };
    }
  };

  const { icon, label } = getStatusInfo();

  return (
    <div className={`${styles.connectionStatus} ${styles[status]}`}>
      <span className={styles.statusIcon}>{icon}</span>
      {showLabel && <span className={styles.statusLabel}>{label}</span>}
    </div>
  );
}
