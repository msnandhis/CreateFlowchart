import styles from "./ui.module.css";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantMap: Record<BadgeVariant, string> = {
  default: styles.badgeDefault,
  success: styles.badgeSuccess,
  warning: styles.badgeWarning,
  error: styles.badgeError,
  info: styles.badgeInfo,
};

export function Badge({ variant = "default", children }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${variantMap[variant]}`}>
      {children}
    </span>
  );
}
