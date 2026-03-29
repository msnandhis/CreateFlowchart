import { forwardRef } from "react";
import styles from "./ui.module.css";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, className, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className={styles.field}>
        {label && (
          <label htmlFor={inputId} className={styles.fieldLabel}>
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
