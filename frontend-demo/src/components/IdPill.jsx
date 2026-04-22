import { useState } from "react";

export default function IdPill({ label, value, tone = "neutral" }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard may be unavailable over non-secure origins; silently ignore
      // so the demo never breaks on-stage.
    }
  }

  const empty = !value;
  return (
    <div className={`id-pill id-pill--${tone} ${empty ? "id-pill--empty" : ""}`}>
      <span className="id-pill__label">{label}</span>
      <code className="id-pill__value" title={value || ""}>
        {value || "not yet"}
      </code>
      <button
        type="button"
        className="id-pill__copy"
        onClick={handleCopy}
        disabled={empty}
        aria-label={`Copy ${label}`}
      >
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}
