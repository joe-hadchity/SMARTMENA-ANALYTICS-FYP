"use client";

import { Facebook, Instagram, Music2, Plus, Twitter } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { useI18n } from "@/i18n/I18nProvider";
import { formatNumber, formatPercent } from "@/lib/format";
import type { Provider } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * One row per connected platform with brand-coloured top accent and a
 * consistent four-metric layout (Reach / Engagements / Posts / Eng. rate).
 *
 * Replaces the earlier "donuts + top posts" grid — the row pattern reads
 * better, scales to more platforms, and gives each channel a clear
 * identity through the accent line + icon.
 */

type ProviderMeta = {
  provider: Provider;
  label: string;
  icon: LucideIcon;
  /** Hex used for the top accent line + icon tint. */
  accent: string;
};

const PROVIDER_META: Record<Provider, ProviderMeta> = {
  meta_instagram: {
    provider: "meta_instagram",
    label: "Instagram",
    icon: Instagram,
    accent: "#DD2A7B",
  },
  meta_facebook: {
    provider: "meta_facebook",
    label: "Facebook",
    icon: Facebook,
    accent: "#1877F2",
  },
  tiktok: {
    provider: "tiktok",
    label: "TikTok",
    icon: Music2,
    accent: "#FE2C55",
  },
  x: {
    provider: "x",
    label: "X",
    icon: Twitter,
    accent: "#0F1419",
  },
};

export type ChannelRow = {
  provider: Provider;
  reach: number;
  engagements: number;
  posts: number;
  /** Engagement rate as fraction (0.064 → 6.4%). */
  engagementRate?: number | null;
};

export default function ChannelSummary({
  rows,
  emptyState,
  className,
}: {
  rows: ChannelRow[];
  /** Optional override for the bottom "add connection" CTA. */
  emptyState?: ReactNode;
  className?: string;
}) {
  const { t, locale } = useI18n();

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">
          {t("hub.channels.title", "Channel summary")}
        </h2>
      </div>

      <div className="space-y-3">
        {rows.length === 0 && emptyState ? emptyState : null}
        {rows.map((row) => {
          const meta = PROVIDER_META[row.provider];
          if (!meta) return null;
          const Icon = meta.icon;
          return (
            <article
              key={row.provider}
              className="relative overflow-hidden rounded-md border border-border bg-surface px-5 py-4 shadow-xs"
            >
              {/* Brand accent line at top */}
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-px"
                style={{
                  background: `linear-gradient(90deg, ${meta.accent}88 0%, ${meta.accent}22 60%, transparent 100%)`,
                }}
              />

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className="h-4 w-4 shrink-0"
                    style={{ color: meta.accent }}
                  />
                  <span className="text-sm font-semibold text-fg truncate">
                    {meta.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4 md:gap-x-10 md:flex-1 md:max-w-3xl">
                  <Metric
                    label={t("overview.kpi.reach", "Reach")}
                    value={formatNumber(row.reach, locale)}
                  />
                  <Metric
                    label={t("overview.kpi.engagements", "Engagements")}
                    value={formatNumber(row.engagements, locale)}
                  />
                  <Metric
                    label={t("hub.channels.posts", "Posts")}
                    value={formatNumber(row.posts, locale)}
                  />
                  <Metric
                    label={t("hub.channels.engRate", "Eng. rate")}
                    value={
                      row.engagementRate == null
                        ? "—"
                        : formatPercent(row.engagementRate, 1, locale)
                    }
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Add-connection CTA */}
      <Link
        href="/connections"
        className={cn(
          "flex items-center justify-center gap-2 rounded-md border border-dashed border-border-strong",
          "bg-transparent px-4 py-3 text-sm text-fg-muted",
          "hover:border-primary/60 hover:text-primary hover:bg-primary/5 transition-colors",
        )}
      >
        <Plus className="h-4 w-4" />
        {t("hub.channels.add", "Add a new connection")}
      </Link>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
        {label}
      </div>
      <div className="font-numeric mt-1 text-[1.05rem] font-bold tracking-tight text-fg">
        {value}
      </div>
    </div>
  );
}
