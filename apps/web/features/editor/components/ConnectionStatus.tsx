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
        return { label: "Connected" };
      case "connecting":
        return { label: "Connecting..." };
      case "disconnected":
        return { label: "Disconnected" };
    }
  };

  const { label } = getStatusInfo();

  return (
    <div className={`${styles.connectionStatus} ${styles[status]}`}>
      <span className={styles.statusIcon} aria-hidden="true" />
      {showLabel && <span className={styles.statusLabel}>{label}</span>}
    </div>
  );
}
