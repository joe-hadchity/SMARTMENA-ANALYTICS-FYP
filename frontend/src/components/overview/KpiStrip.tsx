"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/Skeleton";
import { Sparkline } from "@/components/ui/Sparkline";
import { cn } from "@/lib/utils";

export type KpiStripItem = {
  label: string;
  value: ReactNode;
  /** Fractional delta vs previous period, e.g. 0.184. */
  delta?: number | null;
  /** Subtitle line under the value ("vs last period"). */
  hint?: string;
  series?: number[];
  /** Force a sparkline tone irrespective of delta direction. */
  tone?: "primary" | "success" | "warning" | "danger" | "muted";
  /** When down-is-good (e.g. CPC, bounce rate). */
  invertDelta?: boolean;
};

/**
 * Single horizontal card that holds the row of headline KPIs.
 *
 * Replaces a grid of individual cards — pulls the metrics into one
 * editorial unit with vertical dividers, mirroring the reference dashboard.
 * Sparklines sit inside each cell so the trend reads at-a-glance.
 */
export default function KpiStrip({
  items,
  loading,
  locale = "en",
  className,
}: {
  items: KpiStripItem[];
  loading?: boolean;
  locale?: "en" | "ar";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 overflow-hidden rounded-xl bg-white",
        // grow to as many columns as items provided (max 6)
        items.length === 2 && "md:grid-cols-2",
        items.length === 3 && "md:grid-cols-3",
        items.length === 4 && "md:grid-cols-4",
        items.length === 5 && "md:grid-cols-5",
        items.length >= 6 && "md:grid-cols-6",
        className,
      )}
      style={{
        border: "1px solid oklch(88% 0.022 320)",
        boxShadow: "0 1px 3px rgba(30,22,12,0.06)",
      }}
    >
      {items.map((item, i) => (
        <Cell
          key={`${item.label}-${i}`}
          item={item}
          loading={loading}
          locale={locale}
          isFirst={i === 0}
        />
      ))}
    </div>
  );
}

function Cell({
  item,
  loading,
  locale,
  isFirst,
}: {
  item: KpiStripItem;
  loading?: boolean;
  locale: "en" | "ar";
  isFirst: boolean;
}) {
  const trend =
    item.delta == null || Number.isNaN(item.delta)
      ? "flat"
      : item.delta > 0.0005
        ? "up"
        : item.delta < -0.0005
          ? "down"
          : "flat";

  const isGood =
    (trend === "up" && !item.invertDelta) ||
    (trend === "down" && item.invertDelta);
  const isBad =
    (trend === "down" && !item.invertDelta) ||
    (trend === "up" && item.invertDelta);

  const trendTone = isGood
    ? "text-success"
    : isBad
      ? "text-danger"
      : "text-fg-muted";

  const seriesTone =
    item.tone === "primary"
      ? "text-primary"
      : item.tone === "success"
        ? "text-success"
        : item.tone === "warning"
          ? "text-warning"
          : item.tone === "danger"
            ? "text-danger"
            : item.tone === "muted"
              ? "text-fg-subtle"
              : isGood
                ? "text-success"
                : isBad
                  ? "text-danger"
                  : "text-primary";

  const TrendIcon =
    trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;

  const formattedDelta =
    item.delta == null || Number.isNaN(item.delta)
      ? null
      : new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
          style: "percent",
          maximumFractionDigits: 1,
          signDisplay: "always",
        }).format(item.delta);

  return (
    <div
      className={cn(
        "relative flex items-center gap-4 px-5 py-5 md:px-6 md:py-6",
        // vertical divider on every cell except the first (and on mobile, horizontal between rows)
        !isFirst &&
          "border-t md:border-t-0 md:border-s",
      )}
      style={{
        borderColor: !isFirst ? "oklch(92% 0.015 320)" : undefined,
      }}
    >
      <div className="min-w-0 flex-1">
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-2"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            color: "oklch(52% 0.050 320)",
          }}
        >
          {item.label}
        </div>
        {loading ? (
          <Skeleton className="mt-2 h-8 w-24" />
        ) : (
          <div
            className="text-[2rem] font-bold leading-none mb-2"
            style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              color: "oklch(15% 0.014 50)",
              letterSpacing: "-0.02em",
            }}
          >
            {item.value}
          </div>
        )}
        {formattedDelta ? (
          <div className="flex items-center gap-1.5">
            <span
              className="text-[10px] font-semibold"
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                color: isGood ? "oklch(40% 0.090 150)" : isBad ? "oklch(50% 0.150 25)" : "oklch(52% 0.050 320)",
              }}
            >
              {trend === "up" ? "▲" : trend === "down" ? "▼" : "—"} {formattedDelta}
            </span>
            {item.hint ? (
              <span
                className="text-[10px]"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: "oklch(52% 0.050 320)",
                }}
              >
                {item.hint}
              </span>
            ) : null}
          </div>
        ) : item.hint ? (
          <div
            className="text-[10px]"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              color: "oklch(52% 0.050 320)",
            }}
          >
            {item.hint}
          </div>
        ) : null}
      </div>

      {item.series && item.series.length > 1 ? (
        <div className="w-20 shrink-0 md:w-28">
          <Sparkline
            data={item.series}
            width={120}
            height={40}
            className="w-full"
            color={
              item.tone === "primary"
                ? "oklch(46% 0.108 320)"
                : item.tone === "success"
                  ? "oklch(40% 0.090 150)"
                  : item.tone === "warning"
                    ? "oklch(54% 0.130 60)"
                    : item.tone === "danger"
                      ? "oklch(50% 0.150 25)"
                      : isGood
                        ? "oklch(40% 0.090 150)"
                        : isBad
                          ? "oklch(50% 0.150 25)"
                          : "oklch(46% 0.108 320)"
            }
          />
        </div>
      ) : null}
    </div>
  );
}
