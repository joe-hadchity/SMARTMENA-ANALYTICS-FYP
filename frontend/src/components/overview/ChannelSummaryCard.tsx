"use client";

import { Facebook, Instagram } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { useI18n } from "@/i18n/I18nProvider";

interface ChannelSummaryCardProps {
  platform: "meta_instagram" | "meta_facebook";
  metrics: {
    reach: number;
    engagements: number;
    posts: number;
    engagementRate: number;
  };
}

const PLATFORM_CONFIG = {
  meta_instagram: {
    icon: Instagram,
    color: "#E1306C",
    label: "Instagram",
    labelAr: "انستغرام",
  },
  meta_facebook: {
    icon: Facebook,
    color: "#1877F2",
    label: "Facebook",
    labelAr: "فيسبوك",
  },
};

function formatCompact(value: number): string {
  if (value >= 1e6) return (value / 1e6).toFixed(1) + "M";
  if (value >= 1e3) return (value / 1e3).toFixed(0) + "K";
  return value.toLocaleString();
}

function MetricItem({
  label,
  value,
  ar,
}: {
  label: string;
  value: string | number;
  ar: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1 ${ar ? "items-end" : "items-start"}`}>
      <span
        className="text-[9px] uppercase tracking-wider font-semibold"
        style={{ color: "oklch(var(--fg-muted))" }}
      >
        {label}
      </span>
      <span className="font-mono text-base font-bold tracking-tight">
        {value}
      </span>
    </div>
  );
}

export function ChannelSummaryCard({
  platform,
  metrics,
}: ChannelSummaryCardProps) {
  const { t, locale } = useI18n();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const ar = locale === "ar";
  const config = PLATFORM_CONFIG[platform];
  const Icon = config.icon;
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: isDark
          ? "rgba(28,23,18,0.80)"
          : "rgba(255,255,255,0.88)",
        border: isDark
          ? "1px solid rgba(255,255,255,0.05)"
          : "1px solid rgba(180,210,220,0.3)",
        boxShadow: isDark
          ? "0 4px 20px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.08)"
          : "0 4px 20px rgba(20,50,80,0.05), 0 1px 4px rgba(20,50,80,0.03)",
        backdropFilter: "blur(20px) saturate(1.8) brightness(1.02)",
        WebkitBackdropFilter: "blur(20px) saturate(1.8) brightness(1.02)",
      }}
    >
        {/* Platform header */}
        <div
          className={`flex items-center gap-2 mb-3 ${
            ar ? "flex-row-reverse" : ""
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center">
            <Icon className="w-4 h-4" style={{ color: config.color }} />
          </div>
          <span className="text-sm font-semibold">
            {ar ? config.labelAr : config.label}
          </span>
          {/* Color pill accent */}
          <div
            className="flex-1 h-0.5 rounded-full opacity-25"
            style={{ backgroundColor: config.color }}
          />
        </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-4 gap-2">
        <MetricItem
          label={t("dashboard.metrics.reach", "Reach")}
          value={formatCompact(metrics.reach)}
          ar={ar}
        />
        <MetricItem
          label={t("dashboard.metrics.engagements", "Engagements")}
          value={formatCompact(metrics.engagements)}
          ar={ar}
        />
        <MetricItem
          label={t("dashboard.metrics.posts", "Posts")}
          value={metrics.posts}
          ar={ar}
        />
        <MetricItem
          label={t("dashboard.metrics.engRate", "Eng. Rate")}
          value={`${metrics.engagementRate.toFixed(1)}%`}
          ar={ar}
        />
      </div>
    </div>
  );
}
