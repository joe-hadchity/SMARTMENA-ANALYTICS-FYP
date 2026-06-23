"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Calendar,
  Clock3,
  Download,
  Globe2,
  Heart,
  MapPin,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Card } from "@/components/ui/Card";
import { audienceInsightsApi, type AudienceInsightsPayload } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";
import { useI18n } from "@/i18n/I18nProvider";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

// Consistent palette — restrained 4-color scheme like Stripe / Linear.
const PALETTE = {
  primary: "oklch(46% 0.108 320)",   // plum — brand primary
  accent: "oklch(64% 0.092 320)",    // plum-400
  warning: "oklch(64% 0.135 60)",    // amber-500
  positive: "oklch(58% 0.090 150)",  // sage — no green
  negative: "oklch(54% 0.130 30)",   // terra
  neutral: "oklch(64% 0.012 50)",    // ink-400
  axis: "oklch(64% 0.012 50)",
  grid: "oklch(90% 0.008 50)",
};

const RANGE_OPTIONS = [
  { value: "7", label: "7d" },
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
] as const;
type RangeDays = (typeof RANGE_OPTIONS)[number]["value"];

export default function AudiencePage() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [range, setRange] = useState<RangeDays>("90");

  const audienceQ = useQuery({
    queryKey: ["audience-insights", range],
    queryFn: () => audienceInsightsApi.get({ days: Number(range) }),
  });

  const refreshM = useMutation({
    mutationFn: () => audienceInsightsApi.refresh({ limit: 75 }),
    onSuccess: (data) => {
      qc.setQueryData(["audience-insights", range], data);
      toast.success("Audience refreshed", {
        description: `${data.refresh?.posts_imported ?? 0} Graph posts and ${data.refresh?.comments_imported ?? 0} comments re-checked.`,
      });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Refresh failed"),
  });

  const data = audienceQ.data;
  const isLoading = audienceQ.isLoading;

  const handleExport = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audience-${data.account?.handle ?? "export"}-${range}d.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
            {t("audience.eyebrow", "Audience Intelligence")}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg">{t("audience.title", "Audience")}</h1>
          {data?.account?.handle ? (
            <p className="mt-1 text-sm text-fg-muted">
              @{data.account.handle} ·{" "}
              <span className="text-fg-subtle">
                Last sync {formatDate(data.account.last_synced_at, locale)}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-fg-muted">
              {t("audience.subtitle", "Real-time analytics from your connected account")}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <RangePicker value={range} onChange={setRange} />
          <button
            type="button"
            onClick={handleExport}
            disabled={!data}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg hover:bg-surface-hover disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {t("common.export", "Export")}
          </button>
          <button
            type="button"
            onClick={() => refreshM.mutate()}
            disabled={refreshM.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-fg hover:opacity-90 disabled:opacity-60"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", refreshM.isPending && "animate-spin")}
            />
            {refreshM.isPending ? t("common.loading", "Refreshing") : t("common.retry", "Refresh")}
          </button>
        </div>
      </div>

      {/* AI insights ribbon */}
      <AiInsightsRibbon insights={data?.ai_insights ?? []} loading={isLoading} />

      {/* KPI strip */}
      <KpiStrip data={data} loading={isLoading} locale={locale} t={t} />

      {/* Demographics */}
      <Section title={t("audience.section.demographics", "Demographics")} subtitle={t("audience.section.demographics.sub", "Who follows you, by share of audience")}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard
            title={t("audience.chart.gender", "Gender distribution")}
            icon={<Users className="h-3.5 w-3.5" />}
            insight={genderInsight(data)}
            loading={isLoading}
            empty={!data?.gender_distribution?.length}
          >
            <GenderDonut data={data?.gender_distribution ?? []} />
          </ChartCard>

          <ChartCard
            title={t("audience.chart.age", "Age distribution")}
            icon={<Activity className="h-3.5 w-3.5" />}
            insight={ageInsight(data)}
            loading={isLoading}
            empty={!data?.age_ranges?.length}
          >
            <AgeBars data={data?.age_ranges ?? []} />
          </ChartCard>
        </div>
      </Section>

      {/* Geography */}
      <Section title={t("audience.section.geography", "Geography")} subtitle={t("audience.section.geography.sub", "Where your reach is concentrated")}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard
            title={t("audience.chart.cities", "Top cities")}
            icon={<MapPin className="h-3.5 w-3.5" />}
            insight={cityInsight(data)}
            loading={isLoading}
            empty={!data?.top_cities?.length}
          >
            <RankedBars data={data?.top_cities ?? []} color={PALETTE.primary} />
          </ChartCard>

          <ChartCard
            title={t("audience.chart.countries", "Top countries")}
            icon={<Globe2 className="h-3.5 w-3.5" />}
            insight={countryInsight(data)}
            loading={isLoading}
            empty={!data?.top_countries?.length}
          >
            <RankedBars data={data?.top_countries ?? []} color={PALETTE.accent} />
          </ChartCard>
        </div>
      </Section>

      {/* Activity & growth */}
      <Section title={t("audience.section.activity", "Activity & growth")} subtitle={t("audience.section.activity.sub", "When followers engage and how the audience trends")}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard
            className="lg:col-span-2"
            title={t("audience.chart.growth", "Follower growth")}
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            insight={growthInsight(data)}
            loading={isLoading}
            empty={(data?.follower_growth?.length ?? 0) < 2}
          >
            <FollowerGrowthArea data={data?.follower_growth ?? []} />
          </ChartCard>

          <ChartCard
            title={t("audience.chart.hours", "Active hours")}
            icon={<Clock3 className="h-3.5 w-3.5" />}
            insight={activeInsight(data)}
            loading={isLoading}
            empty={!data?.active_times?.by_hour?.length}
            badge={
              data?.active_times?.source === "meta_graph"
                ? { text: t("audience.badge.live", "Live"), tone: "positive" }
                : { text: t("audience.badge.inferred", "Inferred"), tone: "neutral" }
            }
          >
            <ActiveHoursBars data={data?.active_times?.by_hour ?? []} />
          </ChartCard>
        </div>
      </Section>

      {/* Content & sentiment */}
      <Section title={t("audience.section.content", "Content & audience response")} subtitle={t("audience.section.content.sub", "What you post, how it sounds, and how people react")}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard
            title={t("audience.chart.format", "Format performance")}
            icon={<Sparkles className="h-3.5 w-3.5" />}
            insight={contentInsight(data)}
            loading={isLoading}
            empty={!data?.content_response?.length}
          >
            <FormatBars data={data?.content_response ?? []} />
          </ChartCard>

          <ChartCard
            title={t("audience.chart.sentiment", "Audience response sentiment")}
            icon={<Heart className="h-3.5 w-3.5" />}
            insight={commentSentimentInsight(data)}
            loading={isLoading}
            empty={!data?.comment_sentiment_distribution || data.comment_sentiment_distribution.total === 0}
            badge={
              data?.comment_sentiment_distribution?.total
                ? {
                    text: `${data.comments_analyzed ?? data.comment_sentiment_distribution.total} comments`,
                    tone: "neutral",
                  }
                : undefined
            }
          >
            <SentimentDonut
              data={data?.comment_sentiment_distribution}
              samples={data?.comment_sentiment_samples ?? []}
              source="comments"
            />
          </ChartCard>

          <ChartCard
            title={t("audience.chart.caption", "Caption tone")}
            icon={<Heart className="h-3.5 w-3.5" />}
            insight={captionSentimentInsight(data)}
            loading={isLoading}
            empty={!data?.caption_sentiment_distribution || data.caption_sentiment_distribution.total === 0}
            badge={
              data?.caption_sentiment_distribution?.total
                ? {
                    text: `${data.caption_sentiment_distribution.total} captions`,
                    tone: "neutral",
                  }
                : undefined
            }
          >
            <SentimentDonut
              data={data?.caption_sentiment_distribution}
              samples={data?.caption_sentiment_samples ?? []}
              source="captions"
            />
          </ChartCard>
        </div>
      </Section>

      {data?.warnings?.length ? <DiagnosticPanel warnings={data.warnings} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header controls
// ---------------------------------------------------------------------------

function RangePicker({
  value,
  onChange,
}: {
  value: RangeDays;
  onChange: (v: RangeDays) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded transition-colors",
            value === opt.value
              ? "bg-primary text-primary-fg"
              : "text-fg-muted hover:text-fg",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI insights ribbon
// ---------------------------------------------------------------------------

function AiInsightsRibbon({
  insights,
  loading,
}: {
  insights: AudienceInsightsPayload["ai_insights"];
  loading: boolean;
}) {
  const items = insights ?? [];
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg border border-border bg-surface-muted/40"
          />
        ))}
      </div>
    );
  }
  if (!items.length) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((insight, i) => (
        <div
          key={i}
          className="group relative overflow-hidden rounded-lg border border-border bg-surface p-3 transition-shadow hover:shadow-sm"
        >
          <div className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Sparkles className="h-3 w-3" />
            </span>
            <p className="text-xs leading-relaxed text-fg">{insight.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI strip
// ---------------------------------------------------------------------------

function KpiStrip({
  data,
  loading,
  locale,
  t,
}: {
  data: AudienceInsightsPayload | undefined;
  loading: boolean;
  locale: Locale;
  t: (key: string, fallback?: string) => string;
}) {
  const k = data?.kpis;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Kpi
        label={t("audience.kpi.followers", "Followers")}
        value={k ? formatNumber(k.followers, locale) : "—"}
        delta={k?.follower_delta ?? null}
        unit="abs"
        loading={loading}
      />
      <Kpi
        label={t("audience.kpi.reach", "Reach")}
        value={k ? formatNumber(k.reach, locale) : "—"}
        delta={null}
        loading={loading}
        sublabel={k ? `${formatNumber(k.posts_analyzed, locale)} posts` : undefined}
      />
      <Kpi
        label={t("audience.kpi.engaged", "Engaged accounts")}
        value={k ? formatNumber(k.engaged_accounts, locale) : "—"}
        delta={null}
        loading={loading}
      />
      <Kpi
        label={t("audience.kpi.profileViews", "Profile views")}
        value={k ? formatNumber(k.profile_views, locale) : "—"}
        delta={null}
        loading={loading}
      />
      <Kpi
        label={t("audience.kpi.engRate", "Engagement rate")}
        value={
          k && k.reach
            ? `${((k.engaged_accounts / Math.max(k.reach, 1)) * 100).toFixed(2)}%`
            : "—"
        }
        delta={null}
        loading={loading}
        sublabel={t("audience.kpi.engRateHint", "engaged / reach")}
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  unit,
  loading,
  sublabel,
}: {
  label: string;
  value: string;
  delta: number | null;
  unit?: "abs" | "pct";
  loading: boolean;
  sublabel?: string;
}) {
  if (loading) {
    return <div className="h-24 animate-pulse rounded-lg border border-border bg-surface-muted/40" />;
  }
  const TrendIcon = delta == null ? null : delta >= 0 ? TrendingUp : TrendingDown;
  const trendTone = delta == null ? "" : delta >= 0 ? "text-success-fg" : "text-destructive";

  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3 transition-shadow hover:shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-fg-muted">
        {label}
      </p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-xl font-semibold tracking-tight text-fg">{value}</span>
        {TrendIcon && delta != null ? (
          <span className={cn("inline-flex items-center gap-0.5 text-xs", trendTone)}>
            <TrendIcon className="h-3 w-3" />
            {unit === "pct" ? `${Math.abs(delta).toFixed(1)}%` : `+${delta}`}
          </span>
        ) : null}
      </div>
      {sublabel ? <p className="mt-0.5 text-[11px] text-fg-subtle">{sublabel}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section + ChartCard primitives
// ---------------------------------------------------------------------------

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-fg">{title}</h2>
        {subtitle ? <p className="text-xs text-fg-muted">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ChartCard({
  title,
  icon,
  insight,
  badge,
  loading,
  empty,
  className,
  children,
}: {
  title: string;
  icon: ReactNode;
  insight?: string | null;
  badge?: { text: string; tone: "positive" | "neutral" | "warning" };
  loading?: boolean;
  empty?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card padded={false} className={cn("overflow-hidden", className)}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-surface-muted text-fg-muted">
          {icon}
        </span>
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        {badge ? (
          <span
            className={cn(
              "ms-auto inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
              badge.tone === "positive" && "bg-success/10 text-success-fg",
              badge.tone === "warning" && "bg-warning/10 text-warning-fg",
              badge.tone === "neutral" && "bg-surface-muted text-fg-muted",
            )}
          >
            {badge.text}
          </span>
        ) : null}
      </div>
      <div className="px-4 py-3">
        {loading ? (
          <div className="h-56 animate-pulse rounded-md bg-surface-muted/40" />
        ) : empty ? (
          <EmptyChart />
        ) : (
          <>
            <div className="h-56">{children}</div>
            {insight ? (
              <p className="mt-2 border-t border-border/60 pt-2 text-[11px] leading-relaxed text-fg-muted">
                {insight}
              </p>
            ) : null}
          </>
        )}
      </div>
    </Card>
  );
}

function EmptyChart() {
  const { t } = useI18n();
  return (
    <div className="flex h-56 flex-col items-center justify-center gap-1 text-center text-xs text-fg-subtle">
      <Sparkles className="h-5 w-5 opacity-40" />
      <p>{t("audience.empty.chart", "Not enough Meta data yet for this chart.")}</p>
      <p className="text-[10px]">{t("audience.empty.chartSub", "Refresh after publishing more posts.")}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

function FollowerGrowthArea({
  data,
}: {
  data: AudienceInsightsPayload["follower_growth"];
}) {
  const rows = data
    .map((r) => ({
      date: new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      followers: r.followers,
    }))
    .filter((r) => r.followers > 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={rows} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PALETTE.primary} stopOpacity={0.25} />
            <stop offset="100%" stopColor={PALETTE.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={PALETTE.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          stroke={PALETTE.axis}
          tick={{ fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          stroke={PALETTE.axis}
          tick={{ fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={36}
          domain={["auto", "auto"]}
        />
        <Tooltip
          contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }}
        />
        <Area
          type="monotone"
          dataKey="followers"
          stroke={PALETTE.primary}
          strokeWidth={2}
          fill="url(#growthGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ActiveHoursBars({
  data,
}: {
  data: AudienceInsightsPayload["active_times"]["by_hour"];
}) {
  // Pad to 24 hours so the chart always shows a full day
  const byHour = new Map(data.map((r) => [r.hour, r.score]));
  const rows = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: hour % 6 === 0 ? formatHour(hour) : "",
    value: byHour.get(hour) || 0,
  }));
  const maxVal = Math.max(...rows.map((r) => r.value), 1);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ left: 0, right: 0, top: 8 }}>
        <CartesianGrid stroke={PALETTE.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          stroke={PALETTE.axis}
          tick={{ fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis hide />
        <Tooltip
          contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }}
          formatter={(value: number, _name, p) => [
            value.toFixed(0),
            `${formatHour(p.payload.hour)}`,
          ]}
        />
        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
          {rows.map((r, i) => {
            const intensity = r.value / maxVal;
            const fill =
              intensity > 0.66
                ? PALETTE.primary
                : intensity > 0.33
                  ? PALETTE.accent
                  : PALETTE.neutral;
            return <Cell key={i} fill={fill} fillOpacity={0.4 + intensity * 0.6} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function FormatBars({
  data,
}: {
  data: AudienceInsightsPayload["content_response"];
}) {
  const rows = [...data]
    .sort((a, b) => b.avg_engagement - a.avg_engagement)
    .map((r) => ({
      format: capitalize(r.format),
      reach: Math.round(r.avg_engagement),
      engagement: r.posts,
    }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid stroke={PALETTE.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="format"
          stroke={PALETTE.axis}
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          stroke={PALETTE.axis}
          tick={{ fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }}
          formatter={(_v: number, _n: string, p) => [
            `${p.payload.reach} avg engagement`,
            `${p.payload.engagement} posts`,
          ]}
        />
        <Bar dataKey="reach" fill={PALETTE.primary} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function SentimentDonut({
  data,
  samples,
  source,
}: {
  data?: AudienceInsightsPayload["sentiment_distribution"];
  samples: NonNullable<AudienceInsightsPayload["sentiment_samples"]>;
  source: AudienceInsightsPayload["sentiment_source"];
}) {
  if (!data || data.total === 0) return null;

  const rows = [
    { name: "Positive", value: data.positive, fill: PALETTE.positive },
    { name: "Neutral", value: data.neutral, fill: PALETTE.neutral },
    { name: "Negative", value: data.negative, fill: PALETTE.negative },
  ].filter((r) => r.value > 0);

  return (
    <div className="flex h-full items-center gap-4">
      <div className="h-full w-1/2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={3}
              stroke="none"
            >
              {rows.map((row, i) => (
                <Cell key={i} fill={row.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }}
              formatter={(value: number, name: string) => [
                `${value} (${((value / data.total) * 100).toFixed(0)}%)`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 space-y-1.5 overflow-hidden text-[11px]">
        <li className="mb-1 text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
          {source === "comments" ? "Recent audience comments" : "Caption fallback"}
        </li>
        {samples.slice(0, 4).map((s) => (
          <li key={s.id} className="flex items-start gap-2">
            <span
              className={cn(
                "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                s.sentiment === "positive" && "bg-success",
                s.sentiment === "neutral" && "bg-fg-subtle",
                s.sentiment === "negative" && "bg-destructive",
              )}
            />
            <span className="min-w-0">
              {s.author ? (
                <span className="me-1 font-medium text-fg">@{s.author}</span>
              ) : null}
              <span className="line-clamp-2 text-fg-muted">{s.caption}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Diagnostics + helpers
// ---------------------------------------------------------------------------

function DiagnosticPanel({ warnings }: { warnings: string[] }) {
  const { t } = useI18n();
  return (
    <details className="rounded-lg border border-border bg-surface px-4 py-3 text-xs">
      <summary className="cursor-pointer font-medium text-fg-muted hover:text-fg">
        {t("audience.diagnostics", "Data diagnostics")} ({warnings.length})
      </summary>
      <ul className="mt-2 space-y-1 text-fg-subtle">
        {warnings.map((w, i) => (
          <li key={i} className="font-mono text-[10px]">
            {w}
          </li>
        ))}
      </ul>
    </details>
  );
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function formatHour(h: number): string {
  const hh = Number(h);
  const suffix = hh < 12 ? "AM" : "PM";
  const display = hh % 12 === 0 ? 12 : hh % 12;
  return `${display}${suffix}`;
}

// ---------------------------------------------------------------------------
// AI insight blurbs (one per chart, computed from data)
// ---------------------------------------------------------------------------

function growthInsight(data: AudienceInsightsPayload | undefined): string | null {
  const points = data?.follower_growth ?? [];
  if (points.length < 2) return null;
  const first = points[0].followers;
  const last = points[points.length - 1].followers;
  if (!first || !last) return null;
  const delta = last - first;
  const pct = (delta / first) * 100;
  if (Math.abs(pct) < 0.1) return `Followers held steady at ${formatNumber(last)}.`;
  return `Net change of ${delta >= 0 ? "+" : ""}${delta} followers (${pct.toFixed(1)}%) in window.`;
}

function activeInsight(data: AudienceInsightsPayload | undefined): string | null {
  const peak = data?.active_times?.by_hour?.slice().sort((a, b) => b.score - a.score)[0];
  if (!peak) return null;
  const slot =
    peak.hour < 6 ? "early-morning" : peak.hour < 12 ? "morning" : peak.hour < 18 ? "afternoon" : "evening";
  return `Peak window is ${formatHour(peak.hour)} (${slot}).`;
}

function contentInsight(data: AudienceInsightsPayload | undefined): string | null {
  const top = data?.content_response?.[0];
  if (!top) return null;
  return `${capitalize(top.format)}s drive ${Math.round(top.avg_engagement)} avg engagement.`;
}

function commentSentimentInsight(data: AudienceInsightsPayload | undefined): string | null {
  const s = data?.comment_sentiment_distribution;
  if (!s || !s.total) {
    return "Comment text is not available from Meta yet.";
  }
  const pos = ((s.positive / s.total) * 100).toFixed(0);
  return `${pos}% of recent comments are positive - audience reaction is the primary signal.`;
}

function captionSentimentInsight(data: AudienceInsightsPayload | undefined): string | null {
  const s = data?.caption_sentiment_distribution;
  if (!s || !s.total) return null;
  const pos = ((s.positive / s.total) * 100).toFixed(0);
  return `${pos}% of captions read as positive - this reflects your brand tone.`;
}

function genderInsight(data: AudienceInsightsPayload | undefined): string | null {
  const dist = data?.gender_distribution ?? [];
  if (!dist.length) return null;
  const top = [...dist].sort((a, b) => (b.share ?? 0) - (a.share ?? 0))[0];
  if (!top?.share) return null;
  return `${capitalize(top.gender)} followers make up ${(top.share * 100).toFixed(0)}% of your audience.`;
}

function ageInsight(data: AudienceInsightsPayload | undefined): string | null {
  const ranges = data?.age_ranges ?? [];
  if (!ranges.length) return null;
  const top = [...ranges].sort((a, b) => (b.share ?? 0) - (a.share ?? 0))[0];
  if (!top?.share) return null;
  return `${(top.share * 100).toFixed(0)}% of your audience is aged ${top.range}.`;
}

function cityInsight(data: AudienceInsightsPayload | undefined): string | null {
  const cities = data?.top_cities ?? [];
  if (!cities.length) return null;
  const top = cities[0];
  if (!top?.name || !top?.share) return null;
  return `${top.name} drives ${(top.share * 100).toFixed(0)}% of your audience.`;
}

function countryInsight(data: AudienceInsightsPayload | undefined): string | null {
  const countries = data?.top_countries ?? [];
  if (!countries.length) return null;
  const top = countries[0];
  if (!top?.name || !top?.share) return null;
  return `${top.name} is your largest audience country at ${(top.share * 100).toFixed(0)}%.`;
}

// ---------------------------------------------------------------------------
// Demographics charts
// ---------------------------------------------------------------------------

function GenderDonut({ data }: { data: Array<{ gender: string; share?: number | null; value: number }> }) {
  const rows = data.map((d) => ({ name: capitalize(d.gender), value: d.value }));
  const COLORS = [PALETTE.primary, PALETTE.accent, PALETTE.neutral];
  return (
    <div className="flex items-center gap-4 py-2">
      <ResponsiveContainer width={120} height={120}>
        <PieChart>
          <Pie data={rows} dataKey="value" cx="50%" cy="50%" innerRadius={32} outerRadius={52} strokeWidth={0}>
            {rows.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1.5 text-xs">
        {rows.map((r, i) => (
          <div key={r.name} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-fg-muted">{r.name}</span>
            <span className="ms-auto font-medium text-fg">{((r.value / rows.reduce((s, x) => s + x.value, 0)) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgeBars({ data }: { data: Array<{ range: string; share?: number | null; value: number }> }) {
  const rows = [...data].sort((a, b) => b.value - a.value).slice(0, 6);
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="flex flex-col gap-2 py-2">
      {rows.map((r) => (
        <div key={r.range} className="flex items-center gap-2 text-xs">
          <span className="w-12 shrink-0 text-fg-muted">{r.range}</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: PALETTE.grid }}>
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: PALETTE.primary }} />
          </div>
          <span className="w-8 text-right font-medium text-fg">{((r.share ?? 0) * 100).toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
}

function RankedBars({
  data,
  color,
}: {
  data: Array<{ name: string; share?: number | null; value: number }>;
  color: string;
}) {
  const rows = data.slice(0, 8);
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="flex flex-col gap-2 py-2">
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-2 text-xs">
          <span className="w-24 shrink-0 truncate text-fg-muted">{shortenLocation(r.name)}</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: PALETTE.grid }}>
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </div>
          <span className="w-8 text-right font-medium text-fg">{((r.share ?? 0) * 100).toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
}

function shortenLocation(name: string): string {
  return name.length > 16 ? name.slice(0, 15) + "…" : name;
}
