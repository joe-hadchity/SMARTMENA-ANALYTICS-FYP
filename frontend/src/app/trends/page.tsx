"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ExternalLink,
  Flame,
  Hash,
  Image as ImageIcon,
  Music2,
  RefreshCcw,
  Search,
  Tag,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import PageHeader from "@/components/ui/PageHeader";
import { useI18n } from "@/i18n/I18nProvider";
import { trendsApi, type TrendsListParams } from "@/lib/api";
import { formatDate, relativeDate } from "@/lib/format";
import type { TrendKind, TrendRow, TrendSortBy } from "@/lib/types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

const TABS: Array<{
  value: TrendKind;
  labelKey: string;
  Icon: typeof Hash;
}> = [
  { value: "hashtag", labelKey: "trends.tab.hashtag", Icon: Hash },
  { value: "topic", labelKey: "trends.tab.topic", Icon: Tag },
  { value: "format", labelKey: "trends.tab.format", Icon: ImageIcon },
  { value: "sound", labelKey: "trends.tab.sound", Icon: Music2 },
];

const WINDOWS = [7, 14, 30] as const;
const SORTS: TrendSortBy[] = ["volume", "engagement", "avg_engagement"];
const PLATFORMS = [
  "meta_instagram",
  "meta_facebook",
  "tiktok",
  "x",
] as const;
const SOURCES = ["all", "own", "competitor"] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TrendsPage() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const router = useRouter();

  const [kind, setKind] = useState<TrendKind>("hashtag");
  const [windowDays, setWindowDays] = useState<7 | 14 | 30>(7);
  const [sortBy, setSortBy] = useState<TrendSortBy>("volume");
  const [platform, setPlatform] = useState<string>("all");
  const [source, setSource] = useState<"all" | "own" | "competitor">("all");
  const [search, setSearch] = useState("");

  const params: TrendsListParams = useMemo(
    () => ({
      kind,
      window_days: windowDays,
      sort_by: sortBy,
      platform: platform === "all" ? undefined : platform,
      source,
      search: search.trim() || undefined,
      limit: 60,
    }),
    [kind, windowDays, sortBy, platform, source, search],
  );

  const listQ = useQuery({
    queryKey: ["trends", params],
    queryFn: () => trendsApi.list(params),
  });

  const rebuild = useMutation({
    mutationFn: () => trendsApi.rebuild({ window_days: 30 }),
    onSuccess: (res) => {
      toast.success(t("trends.refreshedToast"), {
        description: `${res.post_count} posts · ${res.term_count} terms · ${res.snapshot_rows} rows`,
      });
      qc.invalidateQueries({ queryKey: ["trends"] });
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Error"),
  });

  const trends = listQ.data?.trends ?? [];

  function rideTrend(row: TrendRow) {
    // Pre-fill the Caption Studio with the term so the user can generate
    // on-trend captions. Compose page reads brief/tags/extras from
    // query params (see frontend/src/app/compose/page.tsx).
    const brief =
      row.kind === "hashtag"
        ? `Create a caption that rides the #${row.value} trend for my brand.`
        : row.kind === "topic"
          ? `Create a caption about ${row.display_label || row.value} that feels on-trend.`
          : row.kind === "format"
            ? `Suggest a ${row.display_label || row.value} post idea that rides the current trend.`
            : `Create a caption for a post using the trending sound "${row.display_label || row.value}".`;
    const tag =
      row.kind === "hashtag"
        ? row.value
        : row.kind === "topic"
          ? row.value
          : "";
    const query = new URLSearchParams();
    query.set("brief", brief);
    if (tag) query.set("tag", tag);
    router.push(`/compose?${query.toString()}`);
  }

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1">
            <Flame className="h-3.5 w-3.5" />
            {t("trends.title")}
          </span>
        }
        title={t("trends.title")}
        subtitle={t("trends.subtitle")}
        actions={
          <Button
            leftIcon={<RefreshCcw className="h-4 w-4" />}
            loading={rebuild.isPending}
            onClick={() => rebuild.mutate()}
          >
            {rebuild.isPending ? t("trends.refreshing") : t("trends.refreshCta")}
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const Icon = tab.Icon;
          const active = kind === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setKind(tab.value)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted/60",
              )}
            >
              <Icon className="h-4 w-4" />
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <FilterGroup label={t("trends.filter.window")}>
            <Select
              value={String(windowDays)}
              onChange={(e) =>
                setWindowDays(Number(e.target.value) as 7 | 14 | 30)
              }
            >
              {WINDOWS.map((w) => (
                <option key={w} value={w}>
                  {t(`trends.filter.window.${w}`)}
                </option>
              ))}
            </Select>
          </FilterGroup>

          <FilterGroup label={t("trends.filter.sort")}>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as TrendSortBy)}
            >
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {t(`trends.filter.sort.${s}`)}
                </option>
              ))}
            </Select>
          </FilterGroup>

          <FilterGroup label={t("trends.filter.platform")}>
            <Select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              <option value="all">{t("trends.filter.platform.all")}</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {t(`trends.platforms.${p}`, p)}
                </option>
              ))}
            </Select>
          </FilterGroup>

          <FilterGroup label={t("trends.filter.source")}>
            <Select
              value={source}
              onChange={(e) =>
                setSource(e.target.value as "all" | "own" | "competitor")
              }
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {t(`trends.filter.source.${s}`)}
                </option>
              ))}
            </Select>
          </FilterGroup>

          <FilterGroup label={t("trends.filter.search")} className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search
                className={cn(
                  "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                  locale === "ar" ? "right-3" : "left-3",
                )}
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("trends.filter.searchPh")}
                className={locale === "ar" ? "pr-9" : "pl-9"}
              />
            </div>
          </FilterGroup>
        </CardContent>
      </Card>

      {listQ.isError ? (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            {(listQ.error as Error)?.message || "Failed to load trends."}
          </CardContent>
        </Card>
      ) : null}

      {listQ.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 w-32 rounded bg-muted" />
                <div className="mt-2 h-4 w-20 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-16 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : trends.length === 0 ? (
        <Card>
          <EmptyState
            title={t("trends.emptyTitle")}
            description={t("trends.emptySubtitle")}
            cta={
              <Button
                leftIcon={<RefreshCcw className="h-4 w-4" />}
                loading={rebuild.isPending}
                onClick={() => rebuild.mutate()}
              >
                {t("trends.refreshCta")}
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {t("trends.emergingHint")}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {trends.map((row) => (
              <TrendCard
                key={row.trend_term_id}
                row={row}
                windowDays={windowDays}
                onRide={() => rideTrend(row)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TrendCard
// ---------------------------------------------------------------------------

function TrendCard({
  row,
  windowDays,
  onRide,
}: {
  row: TrendRow;
  windowDays: number;
  onRide: () => void;
}) {
  const { t } = useI18n();

  const displayValue =
    row.kind === "hashtag"
      ? `#${row.value}`
      : row.kind === "format"
        ? t(`trends.formats.${row.value}`, row.display_label || row.value)
        : row.display_label || row.value;

  const topPlatform = topEntry(row.platform_breakdown);
  const totalSource =
    (row.source_breakdown.own || 0) + (row.source_breakdown.competitor || 0);
  const ownPct = totalSource
    ? Math.round(((row.source_breakdown.own || 0) / totalSource) * 100)
    : 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-base">{displayValue}</CardTitle>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Badge tone="outline" size="sm" className="uppercase tracking-wide">
              {t(`trends.tab.${row.kind}`)}
            </Badge>
            {topPlatform ? (
              <Badge tone="neutral" size="sm">
                {t(`trends.platforms.${topPlatform[0]}`, topPlatform[0])}
              </Badge>
            ) : null}
            {row.last_active_day ? (
              <span>
                {t("trends.card.lastSeen")}: {relativeDate(row.last_active_day)}
              </span>
            ) : null}
          </div>
        </div>
        <DeltaPill delta={row.delta_post_count_pct} />
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {/* Numeric strip */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat label={t("trends.card.posts")} value={row.post_count} />
          <Stat label={t("trends.card.authors")} value={row.unique_authors} />
          <Stat
            label={t("trends.card.avgEng")}
            value={formatNumber(row.engagement_avg)}
          />
        </div>

        {/* Sparkline */}
        <Sparkline points={row.sparkline} />

        {/* Source split + vs prev label */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {t("trends.sources.own")} {ownPct}% ·{" "}
            {t("trends.sources.competitor")} {100 - ownPct}%
          </span>
          <span>{t("trends.card.vsPrev").replace("{n}", String(windowDays))}</span>
        </div>

        {/* Sample posts */}
        <div>
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("trends.card.samples")}
          </div>
          {row.samples.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("trends.card.samplesEmpty")}
            </p>
          ) : (
            <ul className="space-y-1 text-xs">
              {row.samples.slice(0, 3).map((s) => (
                <li key={s.post_id} className="flex items-start gap-2">
                  <span className="mt-0.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  <span className="flex-1 truncate text-muted-foreground">
                    {s.caption || "(no caption)"}
                  </span>
                  {s.permalink ? (
                    <a
                      href={s.permalink}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-primary hover:text-primary/80"
                      aria-label="Open post"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-auto flex items-center justify-end">
          <Button size="sm" variant="secondary" onClick={onRide}>
            {t("trends.rideCta")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tiny presentational helpers
// ---------------------------------------------------------------------------

function FilterGroup({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-[160px] flex-col gap-1", className)}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/30 px-2 py-1.5">
      <div className="text-base font-semibold leading-none">{value}</div>
      <div className="mt-1 text-[10px] uppercase text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function DeltaPill({ delta }: { delta: number }) {
  const { t } = useI18n();
  const tone =
    delta > 5
      ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
      : delta < -5
        ? "text-rose-600 bg-rose-500/10 border-rose-500/20"
        : "text-muted-foreground bg-muted/50 border-border";
  const Icon =
    delta > 5 ? TrendingUp : delta < -5 ? TrendingDown : null;
  const label =
    delta > 5
      ? t("trends.delta.up")
      : delta < -5
        ? t("trends.delta.down")
        : t("trends.delta.flat");
  const valueStr =
    Math.abs(delta) >= 1000 ? ">1000" : `${Math.round(delta)}`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone,
      )}
    >
      {Icon ? <Icon className="h-3 w-3" /> : <span>{label}</span>}
      {valueStr}%
    </span>
  );
}

function Sparkline({
  points,
}: {
  points: { day: string; post_count: number; engagement_sum: number }[];
}) {
  const width = 220;
  const height = 48;
  if (!points || points.length === 0) {
    return <div className="h-12 rounded bg-muted/40" />;
  }
  const max = Math.max(1, ...points.map((p) => p.post_count));
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const d = points
    .map((p, i) => {
      const x = i * step;
      const y = height - (p.post_count / max) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `${d} L${(points.length - 1) * step},${height} L0,${height} Z`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-12 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={area} fill="currentColor" fillOpacity={0.12} className="text-primary" />
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        className="text-primary"
      />
    </svg>
  );
}

function topEntry(obj: Record<string, number>): [string, number] | null {
  let best: [string, number] | null = null;
  for (const [k, v] of Object.entries(obj || {})) {
    if (!best || v > best[1]) best = [k, v];
  }
  return best;
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

void formatDate;
