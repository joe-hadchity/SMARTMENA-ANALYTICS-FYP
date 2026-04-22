import { useState } from "react";
import styles from "./ResultCard.module.css";

export default function ResultCard({
  title = "Response",
  tone = "success",
  summary,
  data,
  error,
}) {
  const [open, setOpen] = useState(false);
  const isError = tone === "error" || Boolean(error);
  const hasRaw = isError ? Boolean(error?.details) : data !== undefined;

  return (
    <div
      className={`${styles.card} ${styles[`card--${isError ? "error" : "success"}`]}`}
    >
      <header className={styles.header}>
        <span className={styles.title}>
          {isError ? errorHeadline(error) : title}
        </span>
        {hasRaw ? (
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Hide raw" : "Show raw"}
          </button>
        ) : null}
      </header>

      {isError ? (
        <div className={styles.errorBody}>
          <div className={styles.message}>
            {error?.message || "Something went wrong."}
          </div>
          {error?.fieldErrors && error.fieldErrors.length > 0 ? (
            <ul className={styles.fieldList}>
              {error.fieldErrors.map((f, i) => (
                <li key={`${f.field}:${i}`} className={styles.fieldItem}>
                  <code className={styles.fieldName}>{f.field}</code>
                  <span className={styles.fieldMessage}>{f.message}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : summary ? (
        <div className={styles.summary}>{summary}</div>
      ) : null}

      {open ? (
        <pre className={styles.pre}>
          {isError
            ? JSON.stringify(error?.details ?? {}, null, 2)
            : JSON.stringify(data ?? null, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function errorHeadline(error) {
  if (!error) return "Something went wrong";
  if (error.isNetwork) return "Backend unreachable";
  if (error.isTimeout) return "Request timed out";
  if (error.status === 400) return "Validation failed";
  if (error.status === 404) return "Not found";
  if (error.status === 500) return "Server error";
  if (error.status) return `Request failed (${error.status})`;
  return "Something went wrong";
}
