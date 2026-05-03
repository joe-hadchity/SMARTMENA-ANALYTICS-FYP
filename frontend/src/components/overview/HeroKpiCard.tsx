"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import { Sparkline } from "@/components/ui/Sparkline";
import { useI18n } from "@/i18n/I18nProvider";

interface HeroKpiCardProps {
  hero: {
    label: string;
    value: number;
    delta: number;
    sparkline: number[];
  };
  secondary: Array<{
    label: string;
    value: number;
    delta: number;
    sparkline: number[];
    format?: "compact" | "percent" | "integer";
  }>;
}

function formatValue(value: number, format?: "compact" | "percent" | "integer"): string {
  if (format === "compact") {
    if (value >= 1e6) return (value / 1e6).toFixed(1) + "M";
    if (value >= 1e3) return (value / 1e3).toFixed(0) + "K";
    return value.toLocaleString();
  }
  if (format === "percent") return value.toFixed(1) + "%";
  if (format === "integer") return value.toLocaleString();
  return value.toLocaleString();
}

function Delta({ value }: { value: number }) {
  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold"
      style={{
        color: isPositive ? "oklch(var(--success))" : "oklch(var(--danger))",
      }}
    >
      <Icon className="h-3 w-3" />
      {value > 0 ? "+" : ""}
      {value}%
    </span>
  );
}

export function HeroKpiCard({ hero, secondary }: HeroKpiCardProps) {
  const { t, locale } = useI18n();
  const ar = locale === "ar";

  return (
    <Card>
      <CardContent className="p-0 flex flex-col md:flex-row">
        {/* Hero stat - left side, large */}
        <div
          className={`p-7 flex flex-col gap-2 min-w-[180px] ${
            ar ? "border-l" : "border-r"
          } border-border`}
        >
          <span
            className="text-[10px] uppercase tracking-wider font-semibold"
            style={{ color: "oklch(var(--fg-muted))" }}
          >
            {hero.label}
          </span>
          <div className="font-mono text-4xl font-bold tracking-tight leading-none">
            {formatValue(hero.value, "compact")}
          </div>
          <div className={`flex items-center gap-2 ${ar ? "flex-row-reverse" : ""}`}>
            <Delta value={hero.delta} />
            <span
              className="text-[10px]"
              style={{ color: "oklch(var(--fg-muted))" }}
            >
              {t("dashboard.vsLastPeriod", "vs. last period")}
            </span>
          </div>
        </div>

        {/* Secondary stats - right side, grid of 3 */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
          {secondary.map((stat, i) => (
            <div key={i} className="p-5 flex flex-col gap-3">
              <div
                className={`flex justify-between items-center ${
                  ar ? "flex-row-reverse" : ""
                }`}
              >
                <span
                  className="text-[10px] uppercase tracking-wider font-semibold"
                  style={{ color: "oklch(var(--fg-muted))" }}
                >
                  {stat.label}
                </span>
                <Delta value={stat.delta} />
              </div>
              <div
                className={`flex justify-between items-end ${
                  ar ? "flex-row-reverse" : ""
                }`}
              >
                <div className="font-mono text-2xl font-bold tracking-tight leading-none">
                  {formatValue(stat.value, stat.format)}
                </div>
                <div style={{ color: "oklch(52% 0.13 195)" }}>
                  <Sparkline
                    data={stat.sparkline}
                    width={52}
                    height={22}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
