"use client";

export const LIVE_SIGNALS_ENABLED_KEY = "smartmena.liveSignals.enabled";
export const LIVE_SIGNALS_CHANGED_EVENT = "smartmena.liveSignals.changed";

export function readLiveSignalsEnabled() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(LIVE_SIGNALS_ENABLED_KEY) !== "false";
}

export function writeLiveSignalsEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LIVE_SIGNALS_ENABLED_KEY, String(enabled));
  window.dispatchEvent(new Event(LIVE_SIGNALS_CHANGED_EVENT));
}
