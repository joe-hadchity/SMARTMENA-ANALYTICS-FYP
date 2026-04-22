import { useState } from "react";
import { useHealth } from "../hooks/useHealth.js";
import styles from "./HealthBanner.module.css";

export default function HealthBanner() {
  const { status, error, retry } = useHealth();
  const [dismissed, setDismissed] = useState(false);

  if (status === "ok" || status === "loading" || dismissed) return null;

  const baseURL = import.meta.env.VITE_API_BASE_URL || "(unset)";

  return (
    <div className={styles.banner} role="alert">
      <span className={styles.dot} />
      <div className={styles.message}>
        <strong className={styles.title}>Backend unreachable</strong>
        <div className={styles.detail}>
          Tried <code>{baseURL}</code>
          {error ? ` - ${error}` : ""}. Start it with{" "}
          <code>npm run dev</code> in <code>../backend</code>, then retry.
        </div>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.btn} ${styles["btn--primary"]}`}
          onClick={retry}
        >
          Retry
        </button>
        <button
          type="button"
          className={styles.btn}
          onClick={() => setDismissed(true)}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
