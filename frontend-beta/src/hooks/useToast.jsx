import { createContext, useCallback, useContext, useMemo, useState } from "react";
import styles from "./toast.module.css";

const ToastContext = createContext(null);

let seq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast) => {
      const id = ++seq;
      const t = { id, tone: "info", timeout: 4000, ...toast };
      setToasts((list) => [...list, t]);
      if (t.timeout > 0) {
        setTimeout(() => dismiss(id), t.timeout);
      }
      return id;
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      push,
      dismiss,
      success: (message, opts) => push({ tone: "success", message, ...opts }),
      error: (message, opts) => push({ tone: "error", message, timeout: 6000, ...opts }),
      info: (message, opts) => push({ tone: "info", message, ...opts }),
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.stack} role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles[`toast--${t.tone}`]}`}>
            <span className={styles.message}>{t.message}</span>
            <button
              type="button"
              className={styles.close}
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const NOOP_TOAST = {
  push: () => 0,
  dismiss: () => {},
  success: () => 0,
  error: () => 0,
  info: () => 0,
};

export function useToast({ optional = false } = {}) {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    if (optional) return NOOP_TOAST;
    throw new Error("useToast must be used inside <ToastProvider>.");
  }
  return ctx;
}
