import styles from "./ui.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: boolean;
}

const variantMap: Record<ButtonVariant, string> = {
  primary: styles.btnPrimary,
  secondary: styles.btnSecondary,
  ghost: styles.btnGhost,
  danger: styles.btnDanger,
};

const sizeMap: Record<ButtonSize, string> = {
  sm: styles.btnSm,
  md: styles.btnMd,
  lg: styles.btnLg,
};

export function Button({
  variant = "primary",
  size = "md",
  icon = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = [
    styles.btn,
    variantMap[variant],
    sizeMap[size],
    icon && styles.btnIcon,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
