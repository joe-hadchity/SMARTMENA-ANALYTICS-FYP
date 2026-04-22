"use client";

import type { TooltipProps } from "recharts";

import type { Locale } from "@/lib/types";
import { formatNumber } from "@/lib/format";

/**
 * Custom recharts tooltip that uses the app's theme tokens (so it works
 * correctly in dark mode without inline style tweaks).
 */
export function ChartTooltip({
  active,
  payload,
  label,
  valueLabel,
  locale = "en",
}: TooltipProps<number, string> & { valueLabel?: string; locale?: Locale }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-bg-elevated shadow-md px-3 py-2 min-w-[140px]">
      {label ? (
        <div className="text-[11px] text-fg-subtle mb-1">{label}</div>
      ) : null}
      <div className="space-y-0.5">
        {payload.map((p, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 text-xs"
          >
            <span className="flex items-center gap-1.5 text-fg-muted">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: p.color }}
              />
              {valueLabel ?? p.name ?? ""}
            </span>
            <span className="font-medium text-fg tabular-nums">
              {typeof p.value === "number"
                ? formatNumber(p.value, locale)
                : String(p.value ?? "")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
