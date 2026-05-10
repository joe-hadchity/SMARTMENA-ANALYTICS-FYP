"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import type { Locale } from "@/lib/types";
import { TOKENS } from "@/lib/design-tokens";

type DataPoint = {
  bucket: string;
  instagram: number;
  facebook: number;
};

type DualPlatformEngagementChartProps = {
  data: DataPoint[];
  locale?: Locale;
  height?: number;
};

export function DualPlatformEngagementChart({
  data,
  locale = "en",
  height = 320,
}: DualPlatformEngagementChartProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";

  const formatted = data.map((p) => ({
    ...p,
    label: new Date(p.bucket).toLocaleDateString(
      locale === "ar" ? "ar-EG" : "en-US",
      { month: "short", day: "numeric" },
    ),
  }));

  // Calculate max value for axis
  const maxValue = Math.max(
    ...data.flatMap((d) => [d.instagram, d.facebook]),
  );
  const yMax = Math.ceil(maxValue * 1.1);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={formatted}
          margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
        >
          <defs>
            {/* Instagram gradient (pink) */}
            <linearGradient id="instagram-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TOKENS.ig} stopOpacity={0.15} />
              <stop offset="100%" stopColor={TOKENS.ig} stopOpacity={0} />
            </linearGradient>

            {/* Facebook gradient (blue) */}
            <linearGradient id="facebook-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TOKENS.fb} stopOpacity={0.15} />
              <stop offset="100%" stopColor={TOKENS.fb} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            stroke={dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
            vertical={false}
            strokeDasharray="3 3"
          />

          <XAxis
            dataKey="label"
            tick={{
              fill: dark ? "rgba(255,255,255,0.4)" : "oklch(var(--fg-muted))",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
            tickLine={false}
            axisLine={false}
            dy={6}
          />

          <YAxis
            domain={[0, yMax]}
            tick={{
              fill: dark ? "rgba(255,255,255,0.4)" : "oklch(var(--fg-muted))",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
            tickLine={false}
            axisLine={false}
            width={50}
          />

          <Tooltip
            cursor={{ stroke: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", strokeDasharray: "3 3" }}
            contentStyle={{
              background: dark ? "rgba(28,23,18,0.95)" : "rgba(255,255,255,0.95)",
              border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
              borderRadius: "8px",
              padding: "8px 12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
            labelStyle={{
              color: dark ? "rgba(255,255,255,0.7)" : "oklch(var(--fg-muted))",
              fontSize: "11px",
              fontWeight: 600,
              marginBottom: "4px",
            }}
            itemStyle={{
              fontSize: "12px",
              fontWeight: 500,
              padding: "2px 0",
            }}
          />

          <Legend
            verticalAlign="top"
            align="right"
            height={36}
            iconType="line"
            wrapperStyle={{
              fontSize: "11px",
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
              paddingBottom: "8px",
            }}
          />

          {/* Instagram Area */}
          <Area
            type="monotone"
            dataKey="instagram"
            name="Instagram"
            stroke="#E1306C"
            strokeWidth={2.5}
            fill="url(#instagram-grad)"
            activeDot={{
              r: 5,
              strokeWidth: 2,
              stroke: dark ? "rgba(28,23,18,0.9)" : "rgba(255,255,255,0.9)",
              fill: "#E1306C",
            }}
          />

          {/* Facebook Area */}
          <Area
            type="monotone"
            dataKey="facebook"
            name="Facebook"
            stroke="#1877F2"
            strokeWidth={2.5}
            fill="url(#facebook-grad)"
            activeDot={{
              r: 5,
              strokeWidth: 2,
              stroke: dark ? "rgba(28,23,18,0.9)" : "rgba(255,255,255,0.9)",
              fill: "#1877F2",
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
