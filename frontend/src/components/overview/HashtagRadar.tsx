"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

export type HashtagTrend = {
  rank: number;
  hashtag: string;
  score: number;
  change: number; // percentage change
};

type HashtagRadarProps = {
  trends: HashtagTrend[];
};

export function HashtagRadar({ trends }: HashtagRadarProps) {
  const { t, locale } = useI18n();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  const ar = locale === "ar";

  // Normalize scores to 0-100 range for bar width
  const maxScore = Math.max(...trends.map((t) => t.score));
  const normalize = (score: number) => (score / maxScore) * 100;

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: dark ? "rgba(28,23,18,0.80)" : "rgba(255,255,255,0.88)",
        border: dark
          ? "1px solid rgba(255,255,255,0.05)"
          : "1px solid rgba(180,210,220,0.3)",
        boxShadow: dark
          ? "0 8px 40px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.12)"
          : "0 8px 40px rgba(20,50,80,0.07), 0 2px 8px rgba(20,50,80,0.04)",
      }}
    >
      {/* Header */}
      <div className="mb-4">
        <h3
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{
            color: dark ? "rgba(255,255,255,0.3)" : "oklch(var(--fg-muted))",
          }}
        >
          {t("dashboard.hashtags.title", "HASHTAG RADAR")}
        </h3>
        <p
          className="mt-1 text-xs"
          style={{
            color: dark ? "rgba(255,255,255,0.4)" : "oklch(var(--fg-muted))",
          }}
        >
          {t("dashboard.hashtags.subtitle", "Trending in your audience this week")}
        </p>
      </div>

      {/* Trends List */}
      <div className="space-y-3">
        {trends.map((trend) => (
          <div key={trend.hashtag} className={cn("flex items-center gap-3", ar ? "flex-row-reverse" : "")}>
            {/* Rank */}
            <div
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold"
              style={{
                background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                color: dark ? "rgba(255,255,255,0.5)" : "oklch(var(--fg-muted))",
              }}
            >
              {String(trend.rank).padStart(2, "0")}
            </div>

            {/* Hashtag name */}
            <div
              className="w-28 shrink-0 font-mono text-xs font-medium"
              style={{
                color: dark ? "rgba(255,255,255,0.75)" : "oklch(30% 0.02 210)",
                textAlign: ar ? "right" : "left",
              }}
            >
              {trend.hashtag}
            </div>

            {/* Bar */}
            <div className="relative h-2 flex-1 overflow-hidden rounded-full" style={{
              background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
            }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${normalize(trend.score)}%`,
                  background: "linear-gradient(90deg, oklch(58% 0.15 195), oklch(52% 0.13 180))",
                }}
              />
            </div>

            {/* Change */}
            <div
              className={cn(
                "w-12 shrink-0 text-right font-mono text-xs font-semibold",
                ar ? "text-left" : "text-right",
              )}
              style={{
                color:
                  trend.change > 0
                    ? "oklch(65% 0.15 170)"
                    : trend.change < 0
                      ? "oklch(60% 0.15 30)"
                      : dark
                        ? "rgba(255,255,255,0.4)"
                        : "oklch(var(--fg-muted))",
              }}
            >
              {trend.change > 0 ? "+" : ""}
              {trend.change}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
