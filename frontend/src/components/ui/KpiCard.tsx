"use client";

import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Skeleton } from "./Skeleton";
import { Sparkline } from "./Sparkline";

type Trend = "up" | "down" | "flat";

function inferTrend(delta?: number | null): Trend {
  if (delta == null || Number.isNaN(delta)) return "flat";
  if (delta > 0.0005) return "up";
  if (delta < -0.0005) return "down";
  return "flat";
}

function DeltaPill({
  delta,
  invert,
  locale = "en",
}: {
  delta?: number | null;
  invert?: boolean;
  locale?: "en" | "ar";
}) {
  if (delta == null || Number.isNaN(delta)) return null;
  const trend = inferTrend(delta);
  // For KPIs where "down is good" (e.g. bounce rate), invert the colour.
  const isGood =
    (trend === "up" && !invert) || (trend === "down" && invert);
  const isBad =
    (trend === "down" && !invert) || (trend === "up" && invert);

  const tone = trend === "flat"
    ? "bg-surface-muted text-fg-muted"
    : isGood
      ? "bg-success-soft text-success"
      : isBad
        ? "bg-danger-soft text-danger"
        : "bg-surface-muted text-fg-muted";

  const Icon =
    trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;

  const pct = Math.abs(delta);
  const formatted = new Intl.NumberFormat(
    locale === "ar" ? "ar-EG" : "en-US",
    { style: "percent", maximumFractionDigits: 1 },
  ).format(pct);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
        tone,
      )}
    >
      <Icon className="h-3 w-3" />
      {formatted}
    </span>
  );
}

export default function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  delta,
  deltaInvert,
  series,
  trendColor,
  loading,
  className,
  footer,
  locale = "en",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  /** Fractional change versus previous period, e.g. 0.12 for +12%. */
  delta?: number | null;
  /** Set true when down-is-good (bounce rate, CPA). */
  deltaInvert?: boolean;
  /** Optional sparkline series (length >= 2). */
  series?: number[];
  /** Force a sparkline colour regardless of delta direction. */
  trendColor?: "primary" | "success" | "danger" | "muted";
  loading?: boolean;
  className?: string;
  footer?: ReactNode;
  locale?: "en" | "ar";
}) {
  const trend = inferTrend(delta);
  const autoColor: "primary" | "success" | "danger" | "muted" =
    trendColor ||
    (trend === "up"
      ? deltaInvert
        ? "danger"
        : "success"
      : trend === "down"
        ? deltaInvert
          ? "success"
          : "danger"
        : "primary");

  const seriesColor = {
    primary: "text-primary",
    success: "text-success",
    danger: "text-danger",
    muted: "text-fg-muted",
  }[autoColor];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-surface shadow-sm",
        "transition-[box-shadow,transform] hover:shadow-md",
        "p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-fg-muted">
            {label}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
            {loading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <span className="text-2xl font-semibold tracking-tight text-fg">
                {value}
              </span>
            )}
            <DeltaPill delta={delta} invert={deltaInvert} locale={locale} />
          </div>
          {hint ? (
            <div className="mt-1 text-[11px] text-fg-subtle">{hint}</div>
          ) : null}
        </div>
        {Icon ? (
          <div className="h-8 w-8 shrink-0 rounded-lg bg-primary-soft text-primary grid place-items-center">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>

      {series && series.length > 1 ? (
        <div className={cn("mt-3 -mx-1", seriesColor)}>
          <Sparkline data={series} width={240} height={36} className="w-full" />
        </div>
      ) : null}

      {footer ? (
        <div className="mt-3 text-[11px] text-fg-subtle">{footer}</div>
      ) : null}
    </div>
  );
}
