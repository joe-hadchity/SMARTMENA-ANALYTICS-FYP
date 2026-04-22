"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { Locale } from "@/lib/types";
import { formatNumber, formatPercent } from "@/lib/format";

const COLORS: Record<string, string> = {
  positive: "hsl(var(--success))",
  neutral: "hsl(var(--fg-subtle))",
  negative: "hsl(var(--danger))",
};

const LABELS = {
  en: { positive: "Positive", neutral: "Neutral", negative: "Negative" },
  ar: { positive: "إيجابي", neutral: "محايد", negative: "سلبي" },
} as const;

export default function SentimentDonut({
  counts,
  locale = "en",
  height = 220,
}: {
  counts: { positive: number; neutral: number; negative: number };
  locale?: Locale;
  height?: number;
}) {
  const data = [
    { name: "positive", value: counts.positive },
    { name: "neutral", value: counts.neutral },
    { name: "negative", value: counts.negative },
  ];
  const total = data.reduce((a, b) => a + b.value, 0) || 0;

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0];
              const name = p.name as keyof typeof LABELS.en;
              const value = p.value as number;
              return (
                <div className="rounded-lg border border-border bg-bg-elevated shadow-md px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 text-fg-muted">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: COLORS[name] }}
                    />
                    {LABELS[locale][name]}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-4">
                    <span className="tabular-nums font-medium text-fg">
                      {formatNumber(value, locale)}
                    </span>
                    <span className="text-fg-subtle">
                      {total ? formatPercent(value / total, 0, locale) : ""}
                    </span>
                  </div>
                </div>
              );
            }}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="60%"
            outerRadius="85%"
            paddingAngle={2}
            stroke="hsl(var(--bg-elevated))"
            strokeWidth={2}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={COLORS[d.name]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div className="absolute inset-0 grid place-items-center pointer-events-none">
        <div className="text-center">
          <div className="text-2xl font-semibold tracking-tight text-fg tabular-nums">
            {formatNumber(total, locale)}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-fg-subtle">
            {locale === "ar" ? "عيّنات" : "samples"}
          </div>
        </div>
      </div>
    </div>
  );
}
