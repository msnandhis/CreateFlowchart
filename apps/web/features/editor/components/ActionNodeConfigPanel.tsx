"use client";

import { useState, useEffect } from "react";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import styles from "../styles/action-node.module.css";
import type { ActionConfig } from "@createflowchart/legacy";

interface ActionNodeConfigPanelProps {
  nodeId: string;
  config: ActionConfig | undefined;
  onSave: (config: ActionConfig) => void;
  onCancel: () => void;
}

export function ActionNodeConfigPanel({
  nodeId,
  config,
  onSave,
  onCancel,
}: ActionNodeConfigPanelProps) {
  const [webhookUrl, setWebhookUrl] = useState(config?.webhook_url || "");
  const [method, setMethod] = useState<"GET" | "POST" | "PUT" | "PATCH" | "DELETE">(
    config?.method || "POST",
  );
  const [headers, setHeaders] = useState<Record<string, string>>(
    config?.headers || {},
  );
  const [payloadTemplate, setPayloadTemplate] = useState(
    config?.payload_template || "",
  );
  const [newHeaderKey, setNewHeaderKey] = useState("");
  const [newHeaderValue, setNewHeaderValue] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!webhookUrl.trim()) {
      newErrors.webhookUrl = "Webhook URL is required";
    } else {
      try {
        new URL(webhookUrl);
      } catch {
        newErrors.webhookUrl = "Invalid URL format";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    onSave({
      webhook_url: webhookUrl.trim(),
      method,
      headers,
      payload_template: payloadTemplate.trim() || undefined,
    });
  };

  const handleAddHeader = () => {
    if (!newHeaderKey.trim()) return;
    setHeaders((prev) => ({
      ...prev,
      [newHeaderKey.trim()]: newHeaderValue,
    }));
    setNewHeaderKey("");
    setNewHeaderValue("");
  };

  const handleRemoveHeader = (key: string) => {
    setHeaders((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Configure Action</h3>
        <button className={styles.closeButton} onClick={onCancel}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <label className={styles.label}>Webhook URL *</label>
          <Input
            placeholder="https://api.example.com/webhook"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
          {errors.webhookUrl && (
            <span className={styles.errorText}>{errors.webhookUrl}</span>
          )}
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as typeof method)}
            className={styles.select}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Headers</label>
          <div className={styles.headersList}>
            {Object.entries(headers).map(([key, value]) => (
              <div key={key} className={styles.headerItem}>
                <span className={styles.headerKey}>{key}</span>
                <span className={styles.headerValue}>{value}</span>
                <button
                  className={styles.removeButton}
                  onClick={() => handleRemoveHeader(key)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className={styles.headerInput}>
            <Input
              placeholder="Key"
              value={newHeaderKey}
              onChange={(e) => setNewHeaderKey(e.target.value)}
              className={styles.headerKeyInput}
            />
            <Input
              placeholder="Value"
              value={newHeaderValue}
              onChange={(e) => setNewHeaderValue(e.target.value)}
              className={styles.headerValueInput}
            />
            <Button variant="ghost" size="sm" onClick={handleAddHeader}>
              Add
            </Button>
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Payload Template</label>
          <textarea
            placeholder='{"key": "{{variable}}"}'
            value={payloadTemplate}
            onChange={(e) => setPayloadTemplate(e.target.value)}
            className={styles.textarea}
            rows={4}
          />
          <p className={styles.hint}>
            Use {"{{variable}}"} syntax for dynamic values
          </p>
        </div>
      </div>

      <div className={styles.actions}>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
