"use client";

import { useState } from "react";
import { Modal } from "@/shared/ui/Modal";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import styles from "../styles/share.module.css";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  flowId: string;
  flowTitle: string;
  isPublic: boolean;
  onVisibilityChange: (isPublic: boolean) => void;
}

export function ShareModal({
  open,
  onClose,
  flowId,
  flowTitle,
  isPublic,
  onVisibilityChange,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [makingPublic, setMakingPublic] = useState(false);

  const viewUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/view/${flowId}`;
  const embedUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/embed/${flowId}`;
  const editorUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/editor/${flowId}`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleVisibilityToggle = async () => {
    setMakingPublic(true);
    try {
      await fetch(`/api/flows/${flowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !isPublic }),
      });
      onVisibilityChange(!isPublic);
    } catch (err) {
      console.error("Failed to update visibility:", err);
    } finally {
      setMakingPublic(false);
    }
  };

  const embedCode = `<iframe src="${embedUrl}" width="100%" height="400" frameborder="0"></iframe>`;

  return (
    <Modal open={open} onClose={onClose} title="Share Flow">
      <div className={styles.content}>
        <div className={styles.visibilitySection}>
          <div className={styles.visibilityInfo}>
            <h3 className={styles.sectionTitle}>
              {isPublic ? "Public" : "Private"}
            </h3>
            <p className={styles.visibilityDesc}>
              {isPublic
                ? "Anyone with the link can view this flow"
                : "Only you can access this flow"}
            </p>
          </div>
          <Button
            variant={isPublic ? "secondary" : "primary"}
            onClick={handleVisibilityToggle}
            disabled={makingPublic}
          >
            {makingPublic
              ? "Updating..."
              : isPublic
                ? "Make Private"
                : "Make Public"}
          </Button>
        </div>

        {isPublic && (
          <>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Share Link</h3>
              <div className={styles.linkRow}>
                <Input value={viewUrl} readOnly className={styles.linkInput} />
                <Button
                  variant="secondary"
                  onClick={() => copyToClipboard(viewUrl)}
                >
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Embed</h3>
              <div className={styles.linkRow}>
                <Input
                  value={embedCode}
                  readOnly
                  className={styles.linkInput}
                />
                <Button
                  variant="secondary"
                  onClick={() => copyToClipboard(embedCode)}
                >
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
              <p className={styles.hint}>
                Paste this code to embed the flowchart in your website or blog
              </p>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Editor Link</h3>
              <div className={styles.linkRow}>
                <Input
                  value={editorUrl}
                  readOnly
                  className={styles.linkInput}
                />
                <Button
                  variant="secondary"
                  onClick={() => copyToClipboard(editorUrl)}
                >
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
              <p className={styles.hint}>
                Share this link to let others edit a copy of this flowchart
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
