import { forwardRef } from "react";
import styles from "./ui.module.css";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, className, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div>
        {label && (
          <label htmlFor={inputId} style={{ display: "block", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", marginBottom: "4px", fontWeight: "var(--font-weight-medium)" }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`${styles.input} ${className ?? ""}`}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = "Input";
