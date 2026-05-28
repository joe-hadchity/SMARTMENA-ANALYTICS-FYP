"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Download,
  LineChart,
  ListFilter,
  Share2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import EngagementLineChart from "@/components/charts/EngagementLineChart";
import PlatformDonut from "@/components/charts/PlatformDonut";
import SentimentDonut from "@/components/charts/SentimentDonut";
import ConnectionsStrip from "@/components/overview/ConnectionsStrip";
import DashboardFilters, {
  type LangFilter,
  type Range,
} from "@/components/overview/DashboardFilters";
import IntelligenceProfilePanel from "@/components/overview/IntelligenceProfilePanel";
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
import OverviewHero from "@/components/overview/OverviewHero";
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

export default function OverviewPage() {
  const { t, locale } = useI18n();
  const [range, setRange] = useState<Range>("30d");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Provider[]>([]);
  const [lang, setLang] = useState<LangFilter>("all");

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
  const sentiment = useQuery({
    queryKey: ["analytics", "sentiment"],
    queryFn: analyticsApi.sentimentBreakdown,
  });
  const topPosts = useQuery({
    queryKey: ["analytics", "top", { limit: 10, sortBy: "engagement" }],
    queryFn: () => analyticsApi.topPosts({ limit: 10, sortBy: "engagement" }),
  });
  const intelligenceProfile = useQuery({
    queryKey: ["workspace", workspaceQ.data?.id, "intelligence-profile"],
    queryFn: () => workspacesApi.intelligenceProfile(workspaceQ.data!.id),
    enabled: Boolean(workspaceQ.data?.id),
  });
  // --- derived state ------------------------------------------------------

  const togglePlatform = (p: Provider) =>
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  const clearFilters = () => {
    setSelectedPlatforms([]);
    setLang("all");
    setRange("30d");
  };

  const accountProviderMap = useMemo(() => {
    const m = new Map<string, Provider>();
    for (const a of accountsQ.data ?? []) m.set(a.id, a.provider);
    return m;
  }, [accountsQ.data]);

  const platformFilterActive = selectedPlatforms.length > 0;

  const filteredPlatformBreakdown = useMemo(() => {
    const list = platform.data ?? [];
    if (!platformFilterActive) return list;
    return list.filter((p) => selectedPlatforms.includes(p.provider));
  }, [platform.data, selectedPlatforms, platformFilterActive]);

  const filteredTopPosts = useMemo(() => {
    const list = topPosts.data ?? [];
    return list.filter((p) => {
      if (platformFilterActive) {
        const prov = accountProviderMap.get(p.social_account_id);
        if (!prov || !selectedPlatforms.includes(prov)) return false;
      }
      if (lang !== "all" && p.caption_lang !== lang) return false;
      return true;
    });
  }, [
    topPosts.data,
    platformFilterActive,
    selectedPlatforms,
    accountProviderMap,
    lang,
  ]);

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

  // Channel rows for the new ChannelSummary block. Engagement-rate is
  // posts > 0 ? engagements / max(reach, 1) — same convention as elsewhere.
  const channelRows = useMemo(
    () =>
      filteredPlatformBreakdown.map((p) => ({
        provider: p.provider,
        reach: p.reach,
        engagements: p.engagements,
        posts: p.posts,
        engagementRate:
          p.reach > 0 ? p.engagements / p.reach : null,
      })),
    [filteredPlatformBreakdown],
  );
  const noData =
    overview.data &&
    totals?.connectedAccounts === 0 &&
    totals?.syncedPosts === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("overview.eyebrow", "Workspace dashboard")}
        title={t("overview.title")}
        subtitle={t("overview.subtitle")}
        breadcrumbs={[{ label: workspaceQ.data?.name ?? "SmartMENA", href: "/" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              leftIcon={<LineChart className="h-4 w-4" />}
            >
              <Link href="/reports/growth">
                {t("reports.growth.title", "Growth Report")}
              </Link>
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                try {
                  const share = await reportsApi.share({ locale });
                  const url =
                    typeof window !== "undefined"
                      ? `${window.location.origin}/r/${share.token}`
                      : `/r/${share.token}`;
                  await navigator.clipboard.writeText(url);
                  toast.success(
                    t("reports.growth.copied", "Share link copied."),
                  );
                } catch (err) {
                  const msg =
                    err instanceof Error ? err.message : "Share failed";
                  toast.error(msg);
                }
              }}
              leftIcon={<Share2 className="h-4 w-4" />}
            >
              {t("reports.growth.share", "Share link")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
            >
              {t("common.export", "Export")}
            </Button>
          </div>
        }
      />

      <IntelligenceProfilePanel
        data={intelligenceProfile.data}
        loading={intelligenceProfile.isLoading}
      />

      {/* Platform connections / digital marketing hub */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-fg">
              {t("hub.connections.title", "Connected platforms")}
            </h2>
            <p className="text-xs text-fg-muted">
              {t(
                "hub.connections.subtitle",
                "Live and planned sources feeding the workspace signal.",
              )}
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/connections">
              {t("hub.connections.manage", "Manage connections")}
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
            </Link>
          </Button>
        </div>
        <ConnectionsStrip
          selected={selectedPlatforms}
          onToggle={togglePlatform}
        />
      </div>

      <DashboardFilters
        platforms={selectedPlatforms}
        onPlatformsChange={setSelectedPlatforms}
        lang={lang}
        onLangChange={setLang}
        range={range}
        onRangeChange={setRange}
        onClear={clearFilters}
      />

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

      {/* Editorial hero banner — gradient surface, headline copy, faded period label */}
      <OverviewHero
        eyebrow={t("overview.hero.eyebrow", "Performance overview")}
        headline={
          deltaEngagement == null || Math.abs(deltaEngagement) < 0.005
            ? t("overview.hero.headline.flat", "Steady as she goes.")
            : deltaEngagement > 0
              ? t("overview.hero.headline.up", "Work smarter, not harder.")
              : t("overview.hero.headline.down", "Time to recalibrate.")
        }
        story={
          deltaEngagement == null
            ? t(
                "overview.hero.story.flat",
                "Reach is holding steady this period.",
              )
            : deltaEngagement >= 0
              ? t(
                  "overview.hero.story.up",
                  "Reach is up — keep the cadence going.",
                ).replace(
                  "{pct}",
                  new Intl.NumberFormat(
                    locale === "ar" ? "ar-EG" : "en-US",
                    { style: "percent", maximumFractionDigits: 0 },
                  ).format(deltaEngagement),
                )
              : t(
                  "overview.hero.story.down",
                  "Reach is softer than last period — review the trend below.",
                )
        }
        delta={deltaEngagement}
        deltaLabel={t("overview.hero.deltaLabel", "Reach")}
        periodLabel={periodLabel(range)}
      />

      {/* Combined KPI strip — single card, vertical dividers, inline sparklines */}
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

      {/* Engagement chart — full width, dominant */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card padded={false} className="lg:col-span-3">
          <CardHeader>
            <div>
              <CardTitle>{t("overview.chart.engagement")}</CardTitle>
              <CardDescription>
                {t(
                  "overview.chart.engagementHint",
                  "Daily engagement across all synced accounts.",
                )}
              </CardDescription>
            </div>
            <Badge tone="brand" size="sm">
              {range}
            </Badge>
          </CardHeader>
          <CardContent>
            {timeseries.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : rangedSeries.length > 0 ? (
              <>
                <EngagementLineChart data={rangedSeries} locale={locale} />
                <InsightCaption className="px-1">
                  {t(
                    "overview.chart.insight",
                    "Most MENA audiences engage between 7-10pm GST — schedule accordingly.",
                  )}
                </InsightCaption>
              </>
            ) : (
              <CardEmpty
                title={t("common.empty")}
                description={t(
                  "overview.chart.engagementEmpty",
                  "Sync a connected account to populate engagement history.",
                )}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Channel summary — one row per platform, brand-coloured top accent */}
      {!noData ? (
        <ChannelSummary rows={channelRows} />
      ) : null}

      {/* Sentiment + platform breakdown + top posts — secondary insights row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card padded={false}>
          <CardHeader>
            <div>
              <CardTitle>{t("overview.chart.sentiment")}</CardTitle>
              <CardDescription>
                {t(
                  "overview.chart.sentimentHint",
                  "Arabic-aware sentiment split.",
                )}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {sentiment.isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : sentiment.data && sentiment.data.total > 0 ? (
              <>
                <SentimentDonut counts={sentiment.data.counts} locale={locale} />
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {(["positive", "neutral", "negative"] as const).map((k) => {
                    const v = sentiment.data!.counts[k];
                    const pct = sentiment.data!.total
                      ? v / sentiment.data!.total
                      : 0;
                    const dotColor =
                      k === "positive"
                        ? "bg-success"
                        : k === "negative"
                          ? "bg-danger"
                          : "bg-fg-subtle";
                    return (
                      <div key={k}>
                        <div className="flex items-center justify-center gap-1.5 text-[11px] text-fg-muted capitalize">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${dotColor}`}
                          />
                          {t(`overview.sentiment.${k}`, k)}
                        </div>
                        <div className="mt-0.5 text-sm font-semibold tabular-nums">
                          {formatPercent(pct, 0, locale)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <CardEmpty title={t("common.empty")} />
            )}
          </CardContent>
        </Card>

        <Card padded={false}>
          <CardHeader>
            <div>
              <CardTitle>{t("overview.chart.platform")}</CardTitle>
              <CardDescription>
                {platformFilterActive
                  ? t(
                      "hub.filtered.platform",
                      "Filtered by selected platforms.",
                    )
                  : t("overview.chart.platformHint", "Engagements by platform.")}
              </CardDescription>
            </div>
            {platformFilterActive ? (
              <Badge tone="brand" size="sm">
                {selectedPlatforms.length}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {platform.isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : filteredPlatformBreakdown.length > 0 ? (
              <>
                <PlatformDonut
                  data={filteredPlatformBreakdown}
                  locale={locale}
                />
                <div className="mt-3 space-y-1.5">
                  {filteredPlatformBreakdown.map((p, i) => {
                    const color = `hsl(var(--viz-${(i % 6) + 1}))`;
                    return (
                      <div
                        key={p.provider}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="flex items-center gap-2 text-fg-muted">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: color }}
                          />
                          {p.provider}
                        </span>
                        <span className="tabular-nums font-medium text-fg">
                          {formatNumber(p.engagements, locale)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <CardEmpty
                title={t("common.empty")}
                description={
                  platformFilterActive
                    ? t(
                        "hub.filtered.none",
                        "No data for the selected filters.",
                      )
                    : undefined
                }
              />
            )}
          </CardContent>
        </Card>

        <Card padded={false}>
          <CardHeader>
            <div>
              <CardTitle>{t("overview.topPosts")}</CardTitle>
              <CardDescription>
                {t(
                  "overview.topPostsHint",
                  "Highest engagement across synced accounts.",
                )}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/posts">
                <ListFilter className="h-3.5 w-3.5" />
                {t("common.viewAll", "View all")}
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {topPosts.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredTopPosts.length > 0 ? (
              <ul className="divide-y divide-border">
                {filteredTopPosts.slice(0, 5).map((p, idx) => {
                  const prov = accountProviderMap.get(p.social_account_id);
                  return (
                    <li
                      key={p.id}
                      className="py-2.5 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex items-start gap-3">
                        <span className="shrink-0 mt-0.5 h-6 w-6 rounded-md bg-surface-muted text-fg-muted grid place-items-center text-[11px] font-semibold tabular-nums">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm line-clamp-2 text-fg">
                            {p.caption || "-"}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            {prov ? (
                              <Badge size="sm" tone="outline">
                                {prov.replace("meta_", "")}
                              </Badge>
                            ) : null}
                            {p.post_type ? (
                              <Badge tone="brand" size="sm">
                                {p.post_type}
                              </Badge>
                            ) : null}
                            {p.caption_lang ? (
                              <Badge size="sm" tone="outline">
                                {p.caption_lang.toUpperCase()}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="text-end shrink-0 tabular-nums">
                        <div className="text-sm font-semibold text-fg">
                          {formatNumber(p.engagement, locale)}
                        </div>
                        <div className="text-[10px] text-fg-subtle">
                          {t("overview.engagementLabel", "engagement")}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <CardEmpty
                title={t("common.empty")}
                description={
                  platformFilterActive || lang !== "all"
                    ? t(
                        "hub.filtered.none",
                        "No data for the selected filters.",
                      )
                    : t(
                        "overview.topPostsEmpty",
                        "Posts will show up as soon as an account is synced.",
                      )
                }
              />
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

/**
 * Big faded label that sits behind the hero — current month for 30/90 day
 * windows, or a "7 DAYS" / "90 DAYS" label otherwise.
 */
function periodLabel(range: Range): string {
  if (range === "7d") return "7 DAYS";
  if (range === "90d") return "90 DAYS";
  const now = new Date();
  return now
    .toLocaleString("en-US", { month: "short", year: "numeric" })
    .toUpperCase();
}

