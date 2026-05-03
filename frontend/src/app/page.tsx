"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";

import EngagementLineChart from "@/components/charts/EngagementLineChart";
import { ChannelSummaryCard } from "@/components/overview/ChannelSummaryCard";
import { HeroKpiCard } from "@/components/overview/HeroKpiCard";
import { PlatformFilterStrip } from "@/components/overview/PlatformFilterStrip";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardEmpty,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useI18n } from "@/i18n/I18nProvider";
import {
  analyticsApi,
  socialAccountsApi,
  workspacesApi,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export default function OverviewPage() {
  const { t, locale } = useI18n();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";

  const qc = useQueryClient();
  const workspaceQ = useQuery({
    queryKey: ["workspace", "current"],
    queryFn: workspacesApi.current,
  });
  const seedDemo = useMutation({
    mutationFn: () => workspacesApi.demoBootstrap(workspaceQ.data?.id),
    onSuccess: (result) => {
      toast.success(t("settings.demo.seeded", "Demo data seeded."), {
        description: `${result.accountsConnected.length} accounts · ${result.postsSynced} posts · ${result.insightsGenerated} insights`,
      });
      qc.invalidateQueries();
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : t("settings.demo.error", "Could not seed demo data.");
      toast.error(`${t("settings.demo.error", "Could not seed demo data.")} · ${msg}`);
    },
  });
  const accountsQ = useQuery({
    queryKey: ["social-accounts"],
    queryFn: socialAccountsApi.list,
  });
  const overview = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: analyticsApi.overview,
  });
  const timeseries = useQuery({
    queryKey: ["analytics", "timeseries", { metric: "engagement", groupBy: "day" }],
    queryFn: () =>
      analyticsApi.timeseries({ metric: "engagement", groupBy: "day" }),
  });
  const platform = useQuery({
    queryKey: ["analytics", "platform"],
    queryFn: analyticsApi.platformBreakdown,
  });

  // --- derived state ------------------------------------------------------

  const handlePlatformChange = (platformId: string) => {
    if (platformId === "all") {
      setSelectedPlatforms([]);
    } else {
      setSelectedPlatforms((prev) =>
        prev.includes(platformId)
          ? prev.filter((x) => x !== platformId)
          : [...prev, platformId],
      );
    }
  };

  const engagementValues = useMemo(() => {
    const pts = timeseries.data?.points ?? [];
    return pts.slice(-30).map((p) => p.value);
  }, [timeseries.data]);

  const sparklineData = useMemo(() => {
    if (engagementValues.length < 12) {
      return Array(12).fill(0);
    }
    return engagementValues.slice(-12);
  }, [engagementValues]);

  const deltaEngagement = useMemo(() => {
    if (engagementValues.length < 4) return 0;
    const half = Math.floor(engagementValues.length / 2);
    const prev = engagementValues.slice(0, half).reduce((a, b) => a + b, 0);
    const curr = engagementValues.slice(half).reduce((a, b) => a + b, 0);
    if (prev <= 0) return 0;
    return ((curr - prev) / prev) * 100;
  }, [engagementValues]);

  // Get platform-specific metrics for channel summary
  const instagramMetrics = useMemo(() => {
    const data = platform.data?.find((p) => p.provider === "meta_instagram");
    return {
      reach: data?.reach ?? 0,
      engagements: data?.engagements ?? 0,
      posts: data?.posts ?? 0,
      engagementRate: ((data?.engagements ?? 0) / (data?.reach ?? 1)) * 100,
    };
  }, [platform.data]);

  const facebookMetrics = useMemo(() => {
    const data = platform.data?.find((p) => p.provider === "meta_facebook");
    return {
      reach: data?.reach ?? 0,
      engagements: data?.engagements ?? 0,
      posts: data?.posts ?? 0,
      engagementRate: ((data?.engagements ?? 0) / (data?.reach ?? 1)) * 100,
    };
  }, [platform.data]);

  const totals = overview.data?.totals;
  const averages = overview.data?.averages;
  const noData =
    overview.data &&
    totals?.connectedAccounts === 0 &&
    totals?.syncedPosts === 0;

  const ar = locale === "ar";

  return (
    <div className="space-y-4">
      {/* Hero Banner */}
      <div
        className="relative overflow-hidden rounded-[14px] p-6 shadow-md"
        style={{
          background: dark
            ? "linear-gradient(135deg, oklch(22% 0.08 195) 0%, oklch(18% 0.06 220) 100%)"
            : "linear-gradient(135deg, oklch(96% 0.025 195) 0%, oklch(97% 0.015 210) 60%, oklch(97% 0.02 60) 100%)",
          border: dark
            ? "1px solid rgba(255,255,255,0.07)"
            : "1px solid rgba(120,180,200,0.18)",
        }}
      >
        {/* Watermark */}
        <div
          className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 select-none whitespace-nowrap font-mono text-7xl font-extrabold leading-none tracking-tight"
          style={{
            color: dark
              ? "rgba(255,255,255,0.04)"
              : "oklch(60% 0.09 195 / 0.08)",
            letterSpacing: "-0.04em",
          }}
        >
          APR 2026
        </div>

        {/* Left accent bar */}
        <div
          className="absolute bottom-0 left-0 top-0 w-[3px] rounded-tl-[14px] rounded-bl-[14px]"
          style={{
            background:
              "linear-gradient(180deg, oklch(52% 0.13 195), oklch(46% 0.12 210))",
          }}
        />

        {/* Content */}
        <div
          className={cn(
            "relative z-10 flex items-center justify-between",
            ar ? "flex-row-reverse" : "",
          )}
        >
          <div>
            <div
              className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wider"
              style={{
                color: dark ? "rgba(255,255,255,0.45)" : "oklch(50% 0.10 195)",
              }}
            >
              {t("overview.hero.label", "Performance Overview")}
            </div>
            <div
              className="mb-1 text-xl font-bold leading-tight tracking-tight"
              style={{
                color: dark ? "rgba(255,255,255,0.88)" : "oklch(22% 0.08 195)",
                fontFamily: ar ? "var(--font-arabic)" : "var(--font-sans)",
              }}
            >
              {t("overview.hero.title", "Work smarter, not harder.")}
            </div>
            <div
              className="text-xs"
              style={{
                color: dark ? "rgba(255,255,255,0.4)" : "oklch(48% 0.08 195)",
                fontFamily: ar ? "var(--font-arabic)" : "var(--font-sans)",
              }}
            >
              {t(
                "overview.hero.subtitle",
                `Your reach is up ${Math.abs(deltaEngagement).toFixed(0)}% — keep it going.`,
              )}
            </div>
          </div>

          {/* Right stat */}
          <div
            className={cn(
              "flex shrink-0 flex-col gap-0.5",
              ar ? "items-start" : "items-end",
            )}
          >
            <div
              className="font-mono text-3xl font-bold leading-none tracking-tight"
              style={{
                color: dark ? "rgba(255,255,255,0.88)" : "oklch(34% 0.11 195)",
              }}
            >
              {deltaEngagement > 0 ? "+" : ""}
              {deltaEngagement.toFixed(0)}%
            </div>
            <div
              className="font-sans text-[10px] uppercase tracking-wider"
              style={{
                color: dark ? "rgba(255,255,255,0.35)" : "oklch(52% 0.09 195)",
              }}
            >
              {t("overview.kpi.reach", "Reach")}
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {noData ? (
        <EmptyState
          icon={Sparkles}
          title={t("overview.empty.title", "Welcome to SmartMENA")}
          description={t(
            "overview.empty.description",
            "Connect a social account to start tracking MENA-aware performance, sentiment and ROI — in Arabic, English, or both.",
          )}
          cta={
            <Button asChild size="lg">
              <Link href="/connections">
                {t("overview.empty.cta", "Connect your first account")}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </Button>
          }
          secondary={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => seedDemo.mutate()}
                loading={seedDemo.isPending}
                leftIcon={<Sparkles className="h-4 w-4" />}
              >
                {t("settings.demo.tryCta", "Try with demo data")}
              </Button>
              <Button variant="ghost" size="lg" asChild>
                <Link href="/recommendations">
                  {t("overview.empty.secondary", "Explore MENA playbook")}
                </Link>
              </Button>
            </div>
          }
        />
      ) : (
        <>
          {/* Platform Filter Strip */}
          <PlatformFilterStrip
            active={selectedPlatforms}
            onChange={handlePlatformChange}
          />

          {/* Hero KPI Card */}
          {overview.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <HeroKpiCard
              hero={{
                label: t("overview.kpi.reach", "Reach"),
                value: totals?.reach ?? 0,
                delta: deltaEngagement,
                sparkline: sparklineData,
              }}
              secondary={[
                {
                  label: t("overview.kpi.impressions", "Impressions"),
                  value: totals?.impressions ?? 0,
                  delta: deltaEngagement,
                  sparkline: sparklineData,
                  format: "compact",
                },
                {
                  label: t("overview.kpi.engagements", "Engagements"),
                  value: totals?.engagements ?? 0,
                  delta: deltaEngagement,
                  sparkline: sparklineData,
                  format: "compact",
                },
                {
                  label: t("overview.kpi.engagementRate", "Eng. Rate"),
                  value: averages?.engagementRate ?? 0,
                  delta: deltaEngagement * 0.8,
                  sparkline: sparklineData,
                  format: "percent",
                },
              ]}
            />
          )}

          {/* Full-Width Engagement Chart */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: dark
                ? "rgba(28,23,18,0.80)"
                : "rgba(255,255,255,0.88)",
              border: dark
                ? "1px solid rgba(255,255,255,0.05)"
                : "1px solid rgba(180,210,220,0.3)",
              boxShadow: dark
                ? "0 8px 40px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.12)"
                : "0 8px 40px rgba(20,50,80,0.07), 0 2px 8px rgba(20,50,80,0.04)",
              backdropFilter: "blur(20px) saturate(1.8) brightness(1.02)",
              WebkitBackdropFilter:
                "blur(20px) saturate(1.8) brightness(1.02)",
            }}
          >
            <h3
              className="mb-4 text-[10px] font-semibold uppercase tracking-wider"
              style={{
                color: dark ? "rgba(255,255,255,0.3)" : "oklch(var(--fg-muted))",
              }}
            >
              {t("overview.chart.engagement", "Engagement Over Time")}
            </h3>
            {timeseries.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : timeseries.data?.points && timeseries.data.points.length > 0 ? (
              <EngagementLineChart
                data={timeseries.data.points.slice(-30)}
                locale={locale}
              />
            ) : (
              <CardEmpty
                title={t("common.empty")}
                description={t(
                  "overview.chart.engagementEmpty",
                  "Sync a connected account to populate engagement history.",
                )}
              />
            )}
          </div>

          {/* Channel Summary Section */}
          <div>
            <h3
              className="mb-3 text-[10px] font-semibold uppercase tracking-wider"
              style={{
                color: dark ? "rgba(255,255,255,0.3)" : "oklch(var(--fg-muted))",
              }}
            >
              {t("dashboard.sections.channelSummary", "Channel Summary")}
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {/* Instagram Card */}
              {platform.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <ChannelSummaryCard
                  platform="meta_instagram"
                  metrics={instagramMetrics}
                />
              )}

              {/* Facebook Card */}
              {platform.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <ChannelSummaryCard
                  platform="meta_facebook"
                  metrics={facebookMetrics}
                />
              )}

              {/* Add Connection Button */}
              <button
                className={cn(
                  "w-full p-3 rounded-lg border-2 border-dashed",
                  "flex items-center justify-center gap-2",
                  "text-sm font-medium transition-all duration-150",
                  ar ? "flex-row-reverse" : "",
                )}
                style={{
                  borderColor: "oklch(var(--border))",
                  color: "oklch(var(--fg-muted))",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "oklch(var(--primary))";
                  e.currentTarget.style.color = "oklch(var(--primary))";
                  e.currentTarget.style.backgroundColor = "oklch(var(--primary-soft))";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "oklch(var(--border))";
                  e.currentTarget.style.color = "oklch(var(--fg-muted))";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
                onClick={() => {
                  window.location.href = "/connections";
                }}
              >
                <Plus className="w-4 h-4" />
                {t("dashboard.actions.addConnection", "Add a new connection")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
