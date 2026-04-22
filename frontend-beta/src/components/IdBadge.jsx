import { useState } from "react";
import { shortId } from "../utils/format.js";
import { useToast } from "../hooks/useToast.jsx";
import styles from "./IdBadge.module.css";

export default function IdBadge({ label, value, size = "md" }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast({ optional: true });

  async function handleCopy(e) {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label ? label : "ID"} copied`, { timeout: 1500 });
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  }

  return (
    <div className={`${styles.badge} ${styles[`badge--${size}`]}`}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <code className={styles.value} title={value || ""}>
        {value ? shortId(value) : "-"}
      </code>
      <button
        type="button"
        className={styles.copy}
        onClick={handleCopy}
        disabled={!value}
        aria-label="Copy"
      >
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}
