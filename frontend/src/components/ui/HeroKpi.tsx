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

/**
 * Dominant headline metric for the dashboard. One per page, max — its job
 * is to give the user the single number that tells them how things are
 * going *right now*. Secondary KPIs go in a compact strip beneath this.
 *
 * Pattern adapted from Mercury / Linear / Stripe — let one number breathe
 * instead of presenting eight at equal weight.
 */
export default function HeroKpi({
  label,
  value,
  story,
  delta,
  series,
  loading,
  icon: Icon,
  locale = "en",
  className,
}: {
  label: string;
  value: ReactNode;
  /** Editorial one-liner that gives the number meaning. */
  story?: ReactNode;
  delta?: number | null;
  series?: number[];
  loading?: boolean;
  icon?: LucideIcon;
  locale?: "en" | "ar";
  className?: string;
}) {
  const trend = inferTrend(delta);
  const isUp = trend === "up";
  const isDown = trend === "down";
  const TrendIcon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
  const trendTone = isUp
    ? "text-success"
    : isDown
      ? "text-danger"
      : "text-fg-muted";

  const formattedDelta =
    delta == null || Number.isNaN(delta)
      ? null
      : new Intl.NumberFormat(
          locale === "ar" ? "ar-EG" : "en-US",
          { style: "percent", maximumFractionDigits: 1 },
        ).format(Math.abs(delta));

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border border-border bg-surface p-6 shadow-xs",
        "md:p-8",
        className,
      )}
    >
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between md:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-muted">
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            {label}
          </div>

          {loading ? (
            <Skeleton className="mt-3 h-14 w-48" />
          ) : (
            <div className="mt-2 flex items-baseline gap-3 flex-wrap">
              <span className="font-numeric text-5xl font-bold leading-none tracking-tight text-fg md:text-6xl">
                {value}
              </span>
              {formattedDelta ? (
                <span
                  className={cn(
                    "font-numeric inline-flex items-center gap-0.5 text-sm font-semibold",
                    trendTone,
                  )}
                >
                  <TrendIcon className="h-4 w-4" />
                  {formattedDelta}
                </span>
              ) : null}
            </div>
          )}

          {story ? (
            <p className="mt-3 max-w-md text-sm leading-relaxed text-fg-muted">
              {story}
            </p>
          ) : null}
        </div>

        {series && series.length > 1 ? (
          <div className="text-primary md:w-72 md:shrink-0">
            <Sparkline data={series} width={320} height={72} className="w-full" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
