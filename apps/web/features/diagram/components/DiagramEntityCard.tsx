import Link from "next/link";
import styles from "./diagram-entity-card.module.css";

interface CardAction {
  href: string;
  label: string;
  tone?: "default" | "primary";
}

interface DiagramEntityCardProps {
  href: string;
  preview: React.ReactNode;
  title: string;
  description?: string;
  badges?: React.ReactNode;
  meta?: React.ReactNode;
  metaAside?: React.ReactNode;
  primaryAction: CardAction;
  secondaryAction?: CardAction;
  overlayActions?: React.ReactNode;
}

export function DiagramEntityCard({
  href,
  preview,
  title,
  description,
  badges,
  meta,
  metaAside,
  primaryAction,
  secondaryAction,
  overlayActions,
}: DiagramEntityCardProps) {
  return (
    <div className={styles.card}>
      {overlayActions ? (
        <div className={styles.overlayActions}>{overlayActions}</div>
      ) : null}
      <Link href={href} className={styles.interactiveArea}>
        <div className={styles.previewShell}>{preview}</div>
        <div className={styles.content}>
          <div className={styles.titleBlock}>
            <h3 className={styles.title}>{title}</h3>
            {description ? (
              <p className={styles.description}>{description}</p>
            ) : null}
          </div>
          {badges ? <div className={styles.badges}>{badges}</div> : null}
          {(meta || metaAside) ? (
            <div className={styles.metaRow}>
              {meta ? <div className={styles.metaMain}>{meta}</div> : <span />}
              {metaAside ? <div className={styles.metaAside}>{metaAside}</div> : null}
            </div>
          ) : null}
        </div>
      </Link>
      <div className={styles.footer}>
        <div className={styles.footerLinks}>
          {secondaryAction ? (
            <Link href={secondaryAction.href} className={styles.footerLink}>
              {secondaryAction.label}
            </Link>
          ) : null}
          <Link
            href={primaryAction.href}
            className={
              primaryAction.tone === "default"
                ? styles.footerLink
                : styles.footerLinkPrimary
            }
          >
            {primaryAction.label}
          </Link>
        </div>
      </div>
    </div>
  );
}
