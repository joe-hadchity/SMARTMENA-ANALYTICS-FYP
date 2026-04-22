import styles from "./Field.module.css";

export default function Field({
  label,
  hint,
  error,
  children,
  inline = false,
  required = false,
  showOptional = false,
}) {
  return (
    <label className={`${styles.field} ${inline ? styles["field--inline"] : ""}`}>
      {label ? (
        <div className={styles.labelRow}>
          <span className={styles.label}>
            {label}
            {required ? <span className={styles.required}>*</span> : null}
          </span>
          {!required && showOptional ? (
            <span className={styles.optional}>optional</span>
          ) : null}
        </div>
      ) : null}
      {children}
      {error ? (
        <span className={styles.error}>{error}</span>
      ) : hint ? (
        <span className={styles.hint}>{hint}</span>
      ) : null}
    </label>
  );
}
