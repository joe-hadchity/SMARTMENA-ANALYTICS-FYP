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
  primary: "#1a7a6e",
  accent: "#0ea5e9",
  warning: "#f59e0b",
  positive: "#16a34a",
  negative: "#dc2626",
  neutral: "#94a3b8",
  axis: "#94a3b8",
  grid: "#e2e8f0",
};

const RANGE_OPTIONS = [
  { value: "7", label: "7d" },
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
] as const;
type RangeDays = (typeof RANGE_OPTIONS)[number]["value"];

export default function AudiencePage() {
  const { locale } = useI18n() as { locale: Locale };
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
            Audience intelligence
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg">Audience</h1>
          {data?.account?.handle ? (
            <p className="mt-1 text-sm text-fg-muted">
              @{data.account.handle} ·{" "}
              <span className="text-fg-subtle">
                Last sync {formatDate(data.account.last_synced_at, locale)}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-fg-muted">
              Real-time analytics from Instagram Graph
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
            Export
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
            {refreshM.isPending ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </div>

      {/* AI insights ribbon */}
      <AiInsightsRibbon insights={data?.ai_insights ?? []} loading={isLoading} />

      {/* KPI strip */}
      <KpiStrip data={data} loading={isLoading} locale={locale} />

      {/* Demographics */}
      <Section title="Demographics" subtitle="Who follows you, by share of audience">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard
            title="Gender distribution"
            icon={<Users className="h-3.5 w-3.5" />}
            insight={genderInsight(data)}
            loading={isLoading}
            empty={!data?.gender_distribution?.length}
          >
            <GenderDonut data={data?.gender_distribution ?? []} />
          </ChartCard>

          <ChartCard
            title="Age distribution"
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
      <Section title="Geography" subtitle="Where your reach is concentrated">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard
            title="Top cities"
            icon={<MapPin className="h-3.5 w-3.5" />}
            insight={cityInsight(data)}
            loading={isLoading}
            empty={!data?.top_cities?.length}
          >
            <RankedBars data={data?.top_cities ?? []} color={PALETTE.primary} />
          </ChartCard>

          <ChartCard
            title="Top countries"
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
      <Section title="Activity & growth" subtitle="When followers engage and how the audience trends">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard
            className="lg:col-span-2"
            title="Follower growth"
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            insight={growthInsight(data)}
            loading={isLoading}
            empty={(data?.follower_growth?.length ?? 0) < 2}
          >
            <FollowerGrowthArea data={data?.follower_growth ?? []} />
          </ChartCard>

          <ChartCard
            title="Active hours"
            icon={<Clock3 className="h-3.5 w-3.5" />}
            insight={activeInsight(data)}
            loading={isLoading}
            empty={!data?.active_times?.by_hour?.length}
            badge={
              data?.active_times?.source === "meta_graph"
                ? { text: "Live", tone: "positive" }
                : { text: "Inferred", tone: "neutral" }
            }
          >
            <ActiveHoursBars data={data?.active_times?.by_hour ?? []} />
          </ChartCard>
        </div>
      </Section>

      {/* Content & sentiment */}
      <Section title="Content & audience response" subtitle="What you post, how it sounds, and how people react">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard
            title="Format performance"
            icon={<Sparkles className="h-3.5 w-3.5" />}
            insight={contentInsight(data)}
            loading={isLoading}
            empty={!data?.content_response?.length}
          >
            <FormatBars data={data?.content_response ?? []} />
          </ChartCard>

          <ChartCard
            title="Audience response sentiment"
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
            title="Caption tone"
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
}: {
  data: AudienceInsightsPayload | undefined;
  loading: boolean;
  locale: Locale;
}) {
  const k = data?.kpis;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Kpi
        label="Followers"
        value={k ? formatNumber(k.followers, locale) : "—"}
        delta={k?.follower_delta ?? null}
        unit="abs"
        loading={loading}
      />
      <Kpi
        label="Reach"
        value={k ? formatNumber(k.reach, locale) : "—"}
        delta={null}
        loading={loading}
        sublabel={k ? `${formatNumber(k.posts_analyzed, locale)} posts` : undefined}
      />
      <Kpi
        label="Engaged accounts"
        value={k ? formatNumber(k.engaged_accounts, locale) : "—"}
        delta={null}
        loading={loading}
      />
      <Kpi
        label="Profile views"
        value={k ? formatNumber(k.profile_views, locale) : "—"}
        delta={null}
        loading={loading}
      />
      <Kpi
        label="Engagement rate"
        value={
          k && k.reach
            ? `${((k.engaged_accounts / Math.max(k.reach, 1)) * 100).toFixed(2)}%`
            : "—"
        }
        delta={null}
        loading={loading}
        sublabel="engaged / reach"
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
  return (
    <div className="flex h-56 flex-col items-center justify-center gap-1 text-center text-xs text-fg-subtle">
      <Sparkles className="h-5 w-5 opacity-40" />
      <p>Not enough Meta data yet for this chart.</p>
      <p className="text-[10px]">Refresh after publishing more posts.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

function GenderDonut({
  data,
}: {
  data: AudienceInsightsPayload["gender_distribution"];
}) {
  const colors = [PALETTE.primary, PALETTE.accent, PALETTE.warning];
  const rows = data.map((row, i) => ({
    name: row.gender || "Unknown",
    value: row.value || (row.share ?? 0),
    fill: colors[i % colors.length],
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={rows}
          dataKey="value"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          stroke="none"
        >
          {rows.map((row, i) => (
            <Cell key={i} fill={row.fill} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
            fontSize: 12,
          }}
          formatter={(value: number, name: string) => [`${value.toLocaleString()}`, name]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function AgeBars({ data }: { data: AudienceInsightsPayload["age_ranges"] }) {
  const sorted = [...data].sort(
    (a, b) => (b.value || (b.share ?? 0)) - (a.value || (a.share ?? 0)),
  );
  const rows = sorted.map((r) => ({
    range: r.range,
    value: r.value || (r.share ?? 0),
    sharePct: ((r.share ?? 0) * 100).toFixed(1),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 12 }}>
        <CartesianGrid horizontal={false} stroke={PALETTE.grid} strokeDasharray="3 3" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="range"
          stroke={PALETTE.axis}
          tick={{ fontSize: 11 }}
          width={50}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }}
          formatter={(_v: number, _n: string, p) => [`${p.payload.sharePct}%`, "Share"]}
        />
        <Bar dataKey="value" fill={PALETTE.primary} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function RankedBars({
  data,
  color,
}: {
  data: Array<{ name: string; value?: number | null; share?: number | null }>;
  color: string;
}) {
  const valueOf = (r: { value?: number | null; share?: number | null }) =>
    r.value || (r.share ?? 0);
  const sorted = [...data]
    .filter((r) => r.name)
    .sort((a, b) => valueOf(b) - valueOf(a))
    .slice(0, 8);
  const rows = sorted.map((r) => ({
    name: shortenLocation(r.name),
    fullName: r.name,
    value: valueOf(r),
    sharePct: ((r.share ?? 0) * 100).toFixed(1),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 12 }}>
        <CartesianGrid horizontal={false} stroke={PALETTE.grid} strokeDasharray="3 3" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          stroke={PALETTE.axis}
          tick={{ fontSize: 11 }}
          width={110}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }}
          formatter={(_v: number, _n: string, p) => [`${p.payload.sharePct}%`, p.payload.fullName]}
        />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

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
  return (
    <details className="rounded-lg border border-border bg-surface px-4 py-3 text-xs">
      <summary className="cursor-pointer font-medium text-fg-muted hover:text-fg">
        Data diagnostics ({warnings.length})
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

function shortenLocation(name: string): string {
  if (!name) return "";
  // "Beirut, Beirut Governorate" -> "Beirut"
  const first = name.split(",")[0]?.trim();
  return first.length > 20 ? `${first.slice(0, 18)}…` : first;
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

function genderInsight(data: AudienceInsightsPayload | undefined): string | null {
  const top = data?.gender_distribution
    ?.slice()
    .sort((a, b) => (b.share ?? 0) - (a.share ?? 0))[0];
  if (!top || !top.share) return null;
  return `${capitalize(top.gender)} make up ${(top.share * 100).toFixed(0)}% of your audience.`;
}

function ageInsight(data: AudienceInsightsPayload | undefined): string | null {
  const top = data?.age_ranges
    ?.slice()
    .sort((a, b) => (b.share ?? 0) - (a.share ?? 0))[0];
  if (!top || top.share == null) return null;
  return `${(top.share * 100).toFixed(0)}% of followers fall in the ${top.range} band.`;
}

function cityInsight(data: AudienceInsightsPayload | undefined): string | null {
  const top = data?.top_cities?.[0];
  if (!top?.name || top.share == null) return null;
  return `${shortenLocation(top.name)} alone accounts for ${(top.share * 100).toFixed(0)}% of your reach.`;
}

function countryInsight(data: AudienceInsightsPayload | undefined): string | null {
  const top = data?.top_countries?.[0];
  if (!top?.name || top.share == null) return null;
  return `${top.name} leads at ${(top.share * 100).toFixed(0)}%, the rest is diaspora and travelers.`;
}

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
