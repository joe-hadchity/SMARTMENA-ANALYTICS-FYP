"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { Locale } from "@/lib/types";
import { formatNumber } from "@/lib/format";

const COLORS = [
  "hsl(var(--viz-1))",
  "hsl(var(--viz-2))",
  "hsl(var(--viz-3))",
  "hsl(var(--viz-4))",
  "hsl(var(--viz-5))",
  "hsl(var(--viz-6))",
];

export default function PlatformDonut({
  data,
  locale = "en",
  height = 220,
}: {
  data: { provider: string; engagements: number }[];
  locale?: Locale;
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0];
              return (
                <div className="rounded-lg border border-border bg-bg-elevated shadow-md px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 text-fg-muted">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: p.color }}
                    />
                    {String(p.name ?? "")}
                  </div>
                  <div className="mt-0.5 tabular-nums font-medium text-fg">
                    {formatNumber(p.value as number, locale)}
                  </div>
                </div>
              );
            }}
          />
          <Pie
            data={data}
            dataKey="engagements"
            nameKey="provider"
            innerRadius="60%"
            outerRadius="85%"
            paddingAngle={2}
            stroke="hsl(var(--bg-elevated))"
            strokeWidth={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
