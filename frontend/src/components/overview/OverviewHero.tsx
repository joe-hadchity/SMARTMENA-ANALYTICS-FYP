"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Editorial banner at the top of the dashboard.
 *
 * Pattern: gradient surface, big eyebrow + headline + supporting line,
 * an oversized faded period label, and a delta pill — adapted from the
 * reference dashboard the user picked. Replaces a generic KPI tile.
 */
export default function OverviewHero({
  eyebrow,
  headline,
  story,
  delta,
  deltaLabel,
  periodLabel,
  className,
}: {
  eyebrow: string;
  headline: ReactNode;
  story?: ReactNode;
  /** Fractional change vs previous period, e.g. 0.18 for +18%. */
  delta?: number | null;
  /** Short label under the delta number, e.g. "REACH". */
  deltaLabel?: string;
  /** Faded period label at the right ("APR 2026", "30 DAYS"). */
  periodLabel?: string;
  className?: string;
}) {
  const pct =
    delta == null || Number.isNaN(delta)
      ? null
      : new Intl.NumberFormat("en-US", {
          style: "percent",
          maximumFractionDigits: 1,
          signDisplay: "always",
        }).format(delta);
  const isUp = (delta ?? 0) >= 0;
  const TrendIcon = isUp ? ArrowUpRight : ArrowDownRight;
  const trendTone = isUp ? "text-success" : "text-danger";

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-md border border-border shadow-xs",
        "px-6 py-7 md:px-10 md:py-10",
        // sage→cream gradient that picks up the cedar primary subtly
        "bg-[linear-gradient(115deg,hsl(var(--primary-soft))_0%,hsl(var(--bg))_60%,hsl(var(--warning-soft))_100%)]",
        className,
      )}
    >
      {/* Faded period label */}
      {periodLabel ? (
        <div
          aria-hidden
          className="pointer-events-none absolute -end-2 top-1/2 -translate-y-1/2 select-none whitespace-nowrap font-numeric text-[5rem] font-bold leading-none tracking-tight text-fg/[0.06] md:text-[7rem]"
        >
          {periodLabel}
        </div>
      ) : null}

      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
        <div className="min-w-0 max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </div>
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-fg md:text-[2.25rem]">
            {headline}
          </h1>
          {story ? (
            <p className="mt-2 text-sm leading-relaxed text-fg-muted md:text-base">
              {story}
            </p>
          ) : null}
        </div>

        {pct ? (
          <div className="relative flex shrink-0 items-baseline gap-3 self-end md:self-auto">
            <span
              className={cn(
                "font-numeric inline-flex items-baseline gap-1 text-3xl font-bold leading-none tracking-tight md:text-4xl",
                trendTone,
              )}
            >
              <TrendIcon className="h-5 w-5 self-center md:h-6 md:w-6" />
              {pct}
            </span>
            {deltaLabel ? (
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
                {deltaLabel}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
