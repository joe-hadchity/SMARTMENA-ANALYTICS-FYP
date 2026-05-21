"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Download,
  LineChart,
  Share2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import EngagementChart from "@/components/overview/EngagementChart";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardEmpty,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import ChannelSummary from "@/components/overview/ChannelSummary";
import KpiStrip, { type KpiStripItem } from "@/components/overview/KpiStrip";
import HeroBanner from "@/components/overview/HeroBanner";
import PlatformStrip from "@/components/overview/PlatformStrip";
import TodoListCard from "@/components/overview/TodoListCard";
import HashtagRadar from "@/components/overview/HashtagRadar";
import ReminderCard from "@/components/overview/ReminderCard";
import LastPostCard from "@/components/overview/LastPostCard";
import BestTimeStrip from "@/components/overview/BestTimeStrip";
import { EmptyState } from "@/components/ui/EmptyState";
import InsightCaption from "@/components/ui/InsightCaption";
import PageHeader from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useI18n } from "@/i18n/I18nProvider";
import {
  analyticsApi,
  reportsApi,
  socialAccountsApi,
  workspacesApi,
} from "@/lib/api";
import { formatNumber, formatPercent } from "@/lib/format";
import type { Provider } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function OverviewPage() {
  const { t, locale } = useI18n();
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");

  const qc = useQueryClient();
  const workspaceQ = useQuery({
    queryKey: ["workspace", "current"],
    queryFn: workspacesApi.current,
  });
  const seedDemo = useMutation({
    mutationFn: () => workspacesApi.demoBootstrap(workspaceQ.data?.id),
    onSuccess: (result) => {
      toast.success(t("settings.demo.seeded", "Demo data seeded."), {
        description: `${result.accountsConnected.length} accounts - ${result.postsSynced} posts - ${result.insightsGenerated} insights`,
      });
      qc.invalidateQueries();
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : t("settings.demo.error", "Could not seed demo data.");
      toast.error(`${t("settings.demo.error", "Could not seed demo data.")} - ${msg}`);
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

  const rangedSeries = useMemo(() => {
    const pts = timeseries.data?.points ?? [];
    const lookback = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    return pts.slice(-lookback);
  }, [timeseries.data, range]);

  const engagementValues = useMemo(
    () => rangedSeries.map((p) => p.value),
    [rangedSeries],
  );

  const deltaEngagement = useMemo(() => {
    if (engagementValues.length < 4) return null;
    const half = Math.floor(engagementValues.length / 2);
    const prev = engagementValues.slice(0, half).reduce((a, b) => a + b, 0);
    const curr = engagementValues.slice(half).reduce((a, b) => a + b, 0);
    if (prev <= 0) return null;
    return (curr - prev) / prev;
  }, [engagementValues]);

  const totals = overview.data?.totals;
  const averages = overview.data?.averages;

  // Channel rows for ChannelSummary
  const channelRows = useMemo(
    () =>
      (platform.data ?? []).map((p) => ({
        provider: p.provider,
        reach: p.reach,
        engagements: p.engagements,
        posts: p.posts,
        engagementRate:
          p.reach > 0 ? p.engagements / p.reach : null,
      })),
    [platform.data],
  );

  const noData =
    overview.data &&
    totals?.connectedAccounts === 0 &&
    totals?.syncedPosts === 0;

  const primary = "oklch(46% 0.108 320)"; // Deep teal from Claude Design

  return (
    <div className="space-y-6">

      {noData ? (
        <EmptyState
          icon={Sparkles}
          title={t("overview.empty.title", "Welcome to SmartMENA")}
          description={t(
            "overview.empty.description",
            "Connect a social account to start tracking MENA-aware performance, sentiment and ROI - in Arabic, English, or both.",
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
      ) : null}

      {/* Hero banner with gradient, Hijri date, and handwritten tagline */}
      <HeroBanner
        primary={primary}
        workspaceName={workspaceQ.data?.name ?? "SmartMENA"}
        accountHandle={accountsQ.data?.[0]?.handle ?? null}
        accountBio={accountsQ.data?.[0]?.metadata?.bio ?? null}
      />

      {/* Platform strip with per-channel mini-cards */}
      <PlatformStrip primary={primary} />

      {/* KPI strip with inline sparklines */}
      <KpiStrip
        loading={overview.isLoading}
        locale={locale}
        items={
          [
            {
              label: t("overview.kpi.reach"),
              value: formatNumber(totals?.reach ?? 0, locale),
              delta: deltaEngagement,
              hint: t("overview.kpi.vsLastPeriod", "vs. last period"),
              series: engagementValues,
              tone: "primary",
            },
            {
              label: t("overview.kpi.impressions", "Impressions"),
              value: formatNumber(totals?.impressions ?? 0, locale),
              delta: deltaEngagement,
              series: engagementValues,
              tone: "success",
            },
            {
              label: t("overview.kpi.engagements"),
              value: formatNumber(totals?.engagements ?? 0, locale),
              delta: deltaEngagement,
              series: engagementValues,
              tone: "warning",
            },
            {
              label: t("overview.kpi.engagementRate", "Eng. rate"),
              value: formatPercent(averages?.engagementRate, 1, locale),
              delta: null,
              tone: "muted",
            },
          ] satisfies KpiStripItem[]
        }
      />

      {/* Dashboard main column — vertical stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Row 1: Today's To-Dos + right rail (Hashtags / Schedule) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: locale === 'ar' ? '1fr 2fr' : '2fr 1fr',
            gap: 14,
            alignItems: 'stretch',
          }}
        >
          {/* Left (2/3): TodoList */}
          <div style={{ gridColumn: locale === 'ar' ? 2 : 1 }}>
            <TodoListCard primary={primary} />
          </div>

          {/* Right (1/3): Vertical flex stack — Hashtags + Schedule */}
          <div
            style={{
              gridColumn: locale === 'ar' ? 1 : 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <HashtagRadar primary={primary} />
            <ReminderCard primary={primary} />
          </div>
        </div>

        {/* Row 2: Last Post + Engagement Over Time */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: locale === 'ar' ? '2fr 1fr' : '1fr 2fr',
            gap: 14,
            alignItems: 'stretch',
          }}
        >
          {/* Left (1/3): LastPost */}
          <div style={{ gridColumn: locale === 'ar' ? 2 : 1 }}>
            <LastPostCard primary={primary} />
          </div>

          {/* Right (2/3): EngagementChart */}
          <div style={{ gridColumn: locale === 'ar' ? 1 : 2 }}>
            <EngagementChart primary={primary} />
          </div>
        </div>
      </div>

      {/* Best time to post - full width */}
      <BestTimeStrip primary={primary} />

      {/* Channel summary — one row per platform */}
      {!noData ? (
        <ChannelSummary rows={channelRows} />
      ) : null}

    </div>
  );
}
