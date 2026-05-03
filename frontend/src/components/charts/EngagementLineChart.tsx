"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Locale } from "@/lib/types";

import { ChartTooltip } from "./ChartTooltip";

/**
 * Gradient-filled engagement trend. We use Area with a thin stroke for a
 * refined SaaS feel; values hug the top and the fill fades to transparent.
 */
export default function EngagementLineChart({
  data,
  locale = "en",
  height = 288,
}: {
  data: { bucket: string; value: number }[];
  locale?: Locale;
  height?: number;
}) {
  const formatted = data.map((p) => ({
    ...p,
    label: new Date(p.bucket).toLocaleDateString(
      locale === "ar" ? "ar-EG" : "en-US",
      { month: "short", day: "numeric" },
    ),
  }));

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={formatted}
          margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="engagement-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(var(--primary))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="oklch(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="oklch(var(--border) / 0.6)"
            vertical={false}
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "oklch(var(--fg-muted))", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            dy={6}
          />
          <YAxis
            tick={{ fill: "oklch(var(--fg-muted))", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            cursor={{ stroke: "oklch(var(--border-strong))", strokeDasharray: "3 3" }}
            content={<ChartTooltip valueLabel="Engagement" locale={locale} />}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="oklch(var(--primary))"
            strokeWidth={2}
            fill="url(#engagement-grad)"
            activeDot={{
              r: 4,
              strokeWidth: 2,
              stroke: "oklch(var(--bg-elevated))",
              fill: "oklch(var(--primary))",
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
