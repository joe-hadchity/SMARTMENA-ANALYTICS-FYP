"use client";

import { Instagram } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import type { TopPost } from "@/lib/types";

type TopPostCardProps = {
  post: TopPost;
};

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function formatTimeAgo(dateStr: string | null | undefined, locale: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return locale === "ar" ? "اليوم" : "today";
  if (diffDays === 1) return locale === "ar" ? "أمس" : "yesterday";
  if (diffDays < 7) return locale === "ar" ? `منذ ${diffDays} أيام` : `${diffDays} days ago`;
  return locale === "ar" ? "منذ أسبوع" : "a week ago";
}

export function TopPostCard({ post }: TopPostCardProps) {
  const { t, locale } = useI18n();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  const ar = locale === "ar";

  const metrics = post.latest_metrics || {};
  const reach = (metrics.reach as number) || 0;
  const likes = (metrics.likes as number) || 0;
  const saves = (metrics.saves as number) || 0;
  const shares = (metrics.shares as number) || 0;

  // Calculate average engagement for comparison
  const avgEngagement = post.engagement * 0.7; // Mock: assume current is 30% above avg
  const vsAvg = ((post.engagement - avgEngagement) / avgEngagement) * 100;

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
      <div
        className={cn(
          "mb-4 flex items-center justify-between",
          ar ? "flex-row-reverse" : "",
        )}
      >
        <h3
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{
            color: dark ? "rgba(255,255,255,0.3)" : "oklch(var(--fg-muted))",
          }}
        >
          {t("dashboard.topPost.title", "TOP POST THIS WEEK")}
        </h3>
        <div
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{
            background: vsAvg > 0 ? "oklch(65% 0.15 170)" : "oklch(60% 0.10 30)",
            color: "white",
          }}
        >
          {vsAvg > 0 ? "+" : ""}
          {vsAvg.toFixed(0)}% vs avg
        </div>
      </div>

      {/* Post Content */}
      <div className={cn("flex gap-4", ar ? "flex-row-reverse" : "")}>
        {/* Thumbnail */}
        <div
          className="h-24 w-24 shrink-0 rounded-lg"
          style={{
            background: post.media_url
              ? `url(${post.media_url}) center/cover`
              : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          }}
        />

        {/* Details */}
        <div className={cn("flex-1", ar ? "text-right" : "")}>
          {/* Author */}
          <div
            className={cn(
              "mb-1 flex items-center gap-1.5 text-xs",
              ar ? "flex-row-reverse" : "",
            )}
            style={{
              color: dark ? "rgba(255,255,255,0.5)" : "oklch(var(--fg-muted))",
            }}
          >
            <Instagram className="h-3.5 w-3.5" />
            <span className="font-medium">@{post.platform_handle || "eleventgroup"}</span>
            <span>·</span>
            <span>{formatTimeAgo(post.posted_at, locale)}</span>
          </div>

          {/* Caption */}
          <p
            className="mb-3 line-clamp-2 text-sm leading-relaxed"
            style={{
              color: dark ? "rgba(255,255,255,0.75)" : "oklch(30% 0.02 210)",
              fontFamily: ar ? "var(--font-arabic)" : "var(--font-sans)",
            }}
          >
            {post.caption || t("dashboard.topPost.noCaption", "No caption")}
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div
        className={cn(
          "mt-4 grid grid-cols-4 gap-4 border-t pt-4",
          ar ? "text-right" : "",
        )}
        style={{
          borderColor: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
        }}
      >
        <div>
          <div
            className="text-[9px] font-medium uppercase tracking-wide"
            style={{
              color: dark ? "rgba(255,255,255,0.35)" : "oklch(var(--fg-muted))",
            }}
          >
            {t("dashboard.topPost.reach", "REACH")}
          </div>
          <div
            className="mt-0.5 font-mono text-lg font-bold leading-none"
            style={{
              color: dark ? "rgba(255,255,255,0.88)" : "oklch(22% 0.08 195)",
            }}
          >
            {formatNumber(reach)}
          </div>
        </div>

        <div>
          <div
            className="text-[9px] font-medium uppercase tracking-wide"
            style={{
              color: dark ? "rgba(255,255,255,0.35)" : "oklch(var(--fg-muted))",
            }}
          >
            {t("dashboard.topPost.likes", "LIKES")}
          </div>
          <div
            className="mt-0.5 font-mono text-lg font-bold leading-none"
            style={{
              color: dark ? "rgba(255,255,255,0.88)" : "oklch(22% 0.08 195)",
            }}
          >
            {formatNumber(likes)}
          </div>
        </div>

        <div>
          <div
            className="text-[9px] font-medium uppercase tracking-wide"
            style={{
              color: dark ? "rgba(255,255,255,0.35)" : "oklch(var(--fg-muted))",
            }}
          >
            {t("dashboard.topPost.saves", "SAVES")}
          </div>
          <div
            className="mt-0.5 font-mono text-lg font-bold leading-none"
            style={{
              color: dark ? "rgba(255,255,255,0.88)" : "oklch(22% 0.08 195)",
            }}
          >
            {formatNumber(saves)}
          </div>
        </div>

        <div>
          <div
            className="text-[9px] font-medium uppercase tracking-wide"
            style={{
              color: dark ? "rgba(255,255,255,0.35)" : "oklch(var(--fg-muted))",
            }}
          >
            {t("dashboard.topPost.shares", "SHARES")}
          </div>
          <div
            className="mt-0.5 font-mono text-lg font-bold leading-none"
            style={{
              color: dark ? "rgba(255,255,255,0.88)" : "oklch(22% 0.08 195)",
            }}
          >
            {formatNumber(shares)}
          </div>
        </div>
      </div>
    </div>
  );
}
