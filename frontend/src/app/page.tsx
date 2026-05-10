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

import { DualPlatformEngagementChart } from "@/components/charts/DualPlatformEngagementChart";
import { ChannelSummaryCard } from "@/components/overview/ChannelSummaryCard";
import { TopPostCard } from "@/components/overview/TopPostCard";
import { HashtagRadar } from "@/components/overview/HashtagRadar";
import type { HashtagTrend } from "@/components/overview/HashtagRadar";
import HeroBanner from "@/components/overview/HeroBanner";
import PlatformStrip from "@/components/overview/PlatformStrip";
import KPICard from "@/components/overview/KPICard";
import BestTimeToPost from "@/components/overview/BestTimeToPost";
import { Button } from "@/components/ui/Button";
import { CardEmpty } from "@/components/ui/Card";
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
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'ig' | 'fb'>('all');
  // Mock hashtag data - replace with real API call
  const mockHashtagTrends: HashtagTrend[] = [
    { rank: 1, hashtag: "#رمضان_كريم", score: 2480, change: 24 },
    { rank: 2, hashtag: "#الرياض_موسم", score: 2162, change: 42 },
    { rank: 3, hashtag: "#dubaifoodie", score: 1863, change: 18 },
    { rank: 4, hashtag: "#القهوة_الصباح", score: 1524, change: 9 },
    { rank: 5, hashtag: "@mena_startup", score: 1342, change: -3 },
    { rank: 6, hashtag: "#بيوت_قليلة", score: 1185, change: 12 },
    { rank: 7, hashtag: "#تجار_عاجل", score: 1076, change: -7 },
    { rank: 8, hashtag: "#weekendvibes", score: 982, change: 2 },
  ];

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
  const topPosts = useQuery({
    queryKey: ["analytics", "top-posts", { limit: 1, sortBy: "engagement" }],
    queryFn: () => analyticsApi.topPosts({ limit: 1, sortBy: "engagement" }),
  });

  // --- derived state ------------------------------------------------------

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
      reach: { value: data?.reach ?? 0, delta: 14.6 },
      engagements: { value: data?.engagements ?? 0, delta: 21.0 },
      posts: { value: data?.posts ?? 0, delta: 4 },
      engRate: { value: ((data?.engagements ?? 0) / (data?.reach ?? 1)) * 100, delta: 0.6, isPct: true },
    };
  }, [platform.data]);

  const facebookMetrics = useMemo(() => {
    const data = platform.data?.find((p) => p.provider === "meta_facebook");
    return {
      reach: { value: data?.reach ?? 0, delta: 6.2 },
      engagements: { value: data?.engagements ?? 0, delta: 12.4 },
      posts: { value: data?.posts ?? 0, delta: 2 },
      engRate: { value: ((data?.engagements ?? 0) / (data?.reach ?? 1)) * 100, delta: 0.2, isPct: true },
    };
  }, [platform.data]);

  // Transform timeseries data to dual-platform format
  const dualPlatformData = useMemo(() => {
    const pts = timeseries.data?.points ?? [];
    const instagramData = platform.data?.find((p) => p.provider === "meta_instagram");
    const facebookData = platform.data?.find((p) => p.provider === "meta_facebook");

    const totalEngagement = (instagramData?.engagements ?? 0) + (facebookData?.engagements ?? 0);
    const instagramRatio = totalEngagement > 0 ? (instagramData?.engagements ?? 0) / totalEngagement : 0.6;
    const facebookRatio = totalEngagement > 0 ? (facebookData?.engagements ?? 0) / totalEngagement : 0.4;

    return pts.slice(-30).map((p) => ({
      bucket: p.bucket,
      instagram: Math.round(p.value * instagramRatio),
      facebook: Math.round(p.value * facebookRatio),
    }));
  }, [timeseries.data, platform.data]);

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
      <HeroBanner
        lang={locale === 'ar' ? 'ar' : 'en'}
        dark={dark}
        dir={ar ? 'rtl' : 'ltr'}
      />

      {/* Platform Filter + KPI Cards */}
      {!noData && (
        <>
          <div className="flex items-center justify-between">
            <PlatformStrip
              value={selectedPlatform}
              onChange={setSelectedPlatform}
              lang={locale === 'ar' ? 'ar' : 'en'}
              dark={dark}
            />
          </div>

          {/* KPI Strip */}
          <div
            className="rounded-lg border flex divide-x overflow-hidden"
            style={{
              background: dark ? "oklch(18% 0.014 48)" : "white",
              borderColor: dark ? "oklch(26% 0.014 48)" : "oklch(90% 0.008 50)",
            }}
          >
            <KPICard
              label={t("overview.kpi.reach", "Reach")}
              value={totals?.reach ?? 0}
              delta={12.4}
              sparkData={sparklineData}
              lang={locale === 'ar' ? 'ar' : 'en'}
              dark={dark}
              flexBasis="1.2"
            />
            <KPICard
              label={t("overview.kpi.impressions", "Impressions")}
              value={totals?.impressions ?? 0}
              delta={8.7}
              sparkData={sparklineData}
              lang={locale === 'ar' ? 'ar' : 'en'}
              dark={dark}
            />
            <KPICard
              label={t("overview.kpi.engagements", "Engagements")}
              value={totals?.engagements ?? 0}
              delta={deltaEngagement}
              sparkData={sparklineData}
              lang={locale === 'ar' ? 'ar' : 'en'}
              dark={dark}
            />
            <KPICard
              label={t("overview.kpi.engRate", "Eng. Rate")}
              value={averages?.engagementRate ?? 0}
              delta={0.4}
              isPct
              sparkData={sparklineData}
              lang={locale === 'ar' ? 'ar' : 'en'}
              dark={dark}
            />
          </div>
        </>
      )}

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
          {/* Top Row: Top Post + Hashtag Radar + Best Time */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Top Post This Week */}
            {topPosts.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : topPosts.data && topPosts.data.length > 0 ? (
              <TopPostCard post={topPosts.data[0]} />
            ) : (
              <div
                className="flex h-64 items-center justify-center rounded-2xl"
                style={{
                  background: dark
                    ? "rgba(28,23,18,0.80)"
                    : "rgba(255,255,255,0.88)",
                  border: dark
                    ? "1px solid rgba(255,255,255,0.05)"
                    : "1px solid rgba(180,210,220,0.3)",
                }}
              >
                <p
                  className="text-sm"
                  style={{
                    color: dark ? "rgba(255,255,255,0.4)" : "oklch(var(--fg-muted))",
                  }}
                >
                  {t("dashboard.topPost.noData", "No posts yet")}
                </p>
              </div>
            )}

            {/* Hashtag Radar */}
            <HashtagRadar trends={mockHashtagTrends} />

            {/* Best Time to Post */}
            <BestTimeToPost lang={locale === 'ar' ? 'ar' : 'en'} />
          </div>

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
            <div className={cn("mb-4 flex items-baseline gap-3", ar ? "flex-row-reverse" : "")}>
              <h3
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  color: dark ? "rgba(255,255,255,0.3)" : "oklch(var(--fg-muted))",
                }}
              >
                {t("overview.chart.engagement", "Engagement Over Time")}
              </h3>
              <div
                className="font-serif text-3xl font-light italic tracking-tight"
                style={{
                  color: dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)",
                  fontFamily: "'Georgia', serif",
                }}
              >
                {totals?.engagements ? Math.round(totals.engagements / 100) : "710"}
              </div>
            </div>
            {timeseries.isLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : dualPlatformData.length > 0 ? (
              <DualPlatformEngagementChart
                data={dualPlatformData}
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
