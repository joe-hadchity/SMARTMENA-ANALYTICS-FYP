import { useCallback, useEffect, useState } from "react";
import { health } from "../services/api.js";

export function useHealth() {
  const [state, setState] = useState({ status: "loading", error: null });

  const check = useCallback(() => {
    setState({ status: "loading", error: null });
    let cancelled = false;
    health()
      .then(() => {
        if (!cancelled) setState({ status: "ok", error: null });
      })
      .catch((err) => {
        if (!cancelled)
          setState({ status: "down", error: err?.message || "unreachable" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cancel = check();
    return cancel;
  }, [check]);

  return { ...state, retry: check };
}
