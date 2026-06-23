"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Compass,
  Database,
  ExternalLink,
  Globe2,
  Hash,
  MapPin,
  Mountain,
  Plus,
  RefreshCcw,
  SearchCheck,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { useI18n } from "@/i18n/I18nProvider";
import {
  activateBorn2HikeDemo,
  isBorn2HikeWorkspace,
} from "@/lib/born2hikeDemo";
import {
  hashtagTrendsApi,
  trendIntelligenceApi,
  workspacesApi,
} from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";
import type {
  TrendInsight,
  TrendIntelligenceResponse,
  TrendRecommendation,
  TrendScope,
  TrendTopic,
  HashtagTrendResponse,
  TrackedHashtag,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type ScopeFilter = TrendScope | "all";

const SCOPE_OPTIONS: Array<{ value: ScopeFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "micro", label: "Local" },
  { value: "macro", label: "Global" },
];

export default function TrendIntelligencePage() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [limit, setLimit] = useState(30);
  const [newHashtag, setNewHashtag] = useState("");

  const workspaceQ = useQuery({
    queryKey: ["workspace", "current"],
    queryFn: workspacesApi.current,
  });

  const workspaceId = workspaceQ.data?.id;
  const trendQ = useQuery({
    queryKey: ["trend-intelligence", workspaceId, scope, limit],
    queryFn: () =>
      trendIntelligenceApi.get(workspaceId as string, {
        scope,
        limit,
      }),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
  });

  const hashtagQ = useQuery({
    queryKey: ["hashtag-trends", workspaceId],
    queryFn: hashtagTrendsApi.list,
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
  });

  const addHashtag = useMutation({
    mutationFn: (tag: string) =>
      hashtagTrendsApi.create({ tag, refresh: true, limit: 24 }),
    onSuccess: (tag) => {
      setNewHashtag("");
      qc.invalidateQueries({ queryKey: ["hashtag-trends"] });
      toast.success(`${tag.display_name} is now tracked`, {
        description: tag.latest_snapshot
          ? `${tag.latest_snapshot.sample_size} public posts sampled from Apify.`
          : "Tracking created. Refresh to collect the first snapshot.",
      });
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Could not track hashtag."),
  });

  const searchHashtag = useMutation({
    mutationFn: hashtagTrendsApi.search,
    onSuccess: (result) => {
      if (result.results.length) {
        toast.success(`Meta found #${result.results[0].tag}`, {
          description: "You can track it to collect top/recent public media.",
        });
      } else {
        toast.warning("Meta did not return a hashtag match", {
          description: result.warnings[0] || "Try a more exact hashtag spelling.",
        });
      }
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Could not search Meta hashtags."),
  });

  const refreshHashtag = useMutation({
    mutationFn: (id: string) => hashtagTrendsApi.refresh(id, { limit: 24 }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["hashtag-trends"] });
      toast.success(`${result.hashtag.display_name} refreshed`, {
        description: result.hashtag.latest_snapshot
          ? `${result.hashtag.latest_snapshot.sample_size} public posts sampled.`
          : "Refresh completed.",
      });
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Could not refresh hashtag."),
  });

  const removeHashtag = useMutation({
    mutationFn: hashtagTrendsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hashtag-trends"] });
      toast.success("Hashtag removed");
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Could not remove hashtag."),
  });

  const born2Hike = useMutation({
    mutationFn: activateBorn2HikeDemo,
    onSuccess: (result) => {
      qc.setQueryData(["workspace", "current"], result.workspace);
      qc.invalidateQueries({ queryKey: ["workspace"] });
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      qc.invalidateQueries({ queryKey: ["trend-intelligence"] });
      toast.success("Born2Hike demo is active", {
        description: result.bootstrap
          ? `${result.bootstrap.postsSynced} hiking demo posts synced.`
          : "Hiking group in Lebanon, ready for local and global trend intelligence.",
      });
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Could not activate Born2Hike."),
  });

  const data = trendQ.data;
  const isBorn2Hike =
    isBorn2HikeWorkspace(workspaceQ.data) ||
    data?.context.brand_name?.toLowerCase().replace(/[^a-z0-9]+/g, "") ===
      "born2hike";
  const sourceCount = useMemo(
    () =>
      Object.values(data?.source_summary || {}).reduce(
        (sum, value) => sum + Number(value || 0),
        0,
      ),
    [data?.source_summary],
  );
  const topScore = Math.max(
    0,
    ...(data?.local_trends || []).map((t) => t.trend_score),
    ...(data?.global_trends || []).map((t) => t.trend_score),
  );

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        eyebrow={<Activity className="h-3.5 w-3.5" />}
        title={t("trendIntel.title", "Trend Intelligence")}
        subtitle={t(
          "trendIntel.subtitle",
          "Evidence-backed local and global trend signals for content decisions.",
        )}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={isBorn2Hike ? "subtle" : "outline"}
              size="sm"
              onClick={() => born2Hike.mutate()}
              loading={born2Hike.isPending}
              leftIcon={<Mountain className="h-3.5 w-3.5" />}
            >
              Born2Hike demo
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => trendQ.refetch()}
              loading={trendQ.isFetching}
              leftIcon={<RefreshCcw className="h-3.5 w-3.5" />}
              disabled={!workspaceId}
            >
              Refresh signals
            </Button>
          </div>
        }
      />

      <ControlsCard
        data={data}
        scope={scope}
        limit={limit}
        isBorn2Hike={isBorn2Hike}
        loading={workspaceQ.isLoading || trendQ.isLoading}
        onScopeChange={setScope}
        onLimitChange={setLimit}
        onBorn2Hike={() => born2Hike.mutate()}
        born2HikeLoading={born2Hike.isPending}
      />

      {trendQ.error ? (
        <Card>
          <div className="flex items-start gap-3 text-danger">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div>
              <div className="font-medium">Trend intelligence failed</div>
              <p className="mt-1 text-sm text-fg-muted">
                {(trendQ.error as Error).message}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="Evidence"
          value={sourceCount}
          icon={<Database className="h-4 w-4" />}
          muted={trendQ.isLoading}
        />
        <MetricCard
          label="Local trends"
          value={data?.local_trends.length || 0}
          icon={<MapPin className="h-4 w-4" />}
          muted={trendQ.isLoading}
        />
        <MetricCard
          label="Global trends"
          value={data?.global_trends.length || 0}
          icon={<Globe2 className="h-4 w-4" />}
          muted={trendQ.isLoading}
        />
        <MetricCard
          label="Top score"
          value={Math.round(topScore)}
          icon={<Sparkles className="h-4 w-4" />}
          muted={trendQ.isLoading}
        />
      </div>

      <HashtagTrendPanel
        data={hashtagQ.data}
        loading={hashtagQ.isLoading}
        error={hashtagQ.error as Error | null}
        newHashtag={newHashtag}
        onNewHashtagChange={setNewHashtag}
        onAdd={(tag) => addHashtag.mutate(tag)}
        onSearch={(tag) => searchHashtag.mutate(tag)}
        onRefresh={(id) => refreshHashtag.mutate(id)}
        onRemove={(id) => removeHashtag.mutate(id)}
        adding={addHashtag.isPending}
        searching={searchHashtag.isPending}
        refreshingId={refreshHashtag.variables}
        removingId={removeHashtag.variables}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.85fr)]">
        <div className="space-y-5">
          <TrendSection
            title="Local trend signals"
            description="Lebanon, nearby communities, own posts, and public discovery signals."
            icon={<MapPin className="h-4 w-4" />}
            topics={data?.local_trends || []}
            insights={data?.insights || []}
            loading={trendQ.isLoading}
            hidden={scope === "macro"}
          />
          <TrendSection
            title="Global trend signals"
            description="Broader hiking, outdoor travel, and adventure content patterns."
            icon={<Globe2 className="h-4 w-4" />}
            topics={data?.global_trends || []}
            insights={data?.insights || []}
            loading={trendQ.isLoading}
            hidden={scope === "micro"}
          />
        </div>

        <div className="space-y-5">
          <InsightsPanel insights={data?.insights || []} loading={trendQ.isLoading} />
          <RecommendationsPanel
            recommendations={data?.recommendations || []}
            loading={trendQ.isLoading}
          />
          <PatternsPanel data={data} loading={trendQ.isLoading} />
          <WarningsPanel warnings={data?.warnings || []} />
        </div>
      </div>
    </div>
  );
}

function ControlsCard({
  data,
  scope,
  limit,
  isBorn2Hike,
  loading,
  onScopeChange,
  onLimitChange,
  onBorn2Hike,
  born2HikeLoading,
}: {
  data?: TrendIntelligenceResponse;
  scope: ScopeFilter;
  limit: number;
  isBorn2Hike: boolean;
  loading: boolean;
  onScopeChange: (value: ScopeFilter) => void;
  onLimitChange: (value: number) => void;
  onBorn2Hike: () => void;
  born2HikeLoading: boolean;
}) {
  return (
    <Card padded={false}>
      <CardHeader className="items-center">
        <div>
          <CardTitle>Workspace context</CardTitle>
          <CardDescription>
            {data?.context.brand_name || "Loading workspace"} /{" "}
            {labelize(data?.context.category || "category")} /{" "}
            {data?.context.location || "No region"}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <SegmentedControl
            options={SCOPE_OPTIONS}
            value={scope}
            onChange={onScopeChange}
            size="sm"
          />
          <Select
            value={String(limit)}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="h-8 w-[116px] py-1 text-xs"
          >
            <option value="20">20 signals</option>
            <option value="30">30 signals</option>
            <option value="50">50 signals</option>
            <option value="80">80 signals</option>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(data?.context.keywords || []).slice(0, 8).map((keyword) => (
                <Badge key={keyword} tone="neutral" size="sm">
                  {keyword}
                </Badge>
              ))}
              {loading ? (
                <Badge tone="neutral" size="sm">
                  Loading context
                </Badge>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {(data?.context.hashtags || []).slice(0, 8).map((tag) => (
                <Badge key={tag} tone="brand" size="sm">
                  #{tag.replace(/^#/, "")}
                </Badge>
              ))}
            </div>
          </div>
          <div className="min-w-[260px] rounded-lg border border-border bg-surface-muted p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mountain className="h-4 w-4 text-primary" />
              Born2Hike demo
            </div>
            <p className="mt-1 text-xs leading-relaxed text-fg-muted">
              Hiking group / Lebanon / local trails / group hikes / eco-tourism
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Badge tone={isBorn2Hike ? "success" : "warning"} size="sm" dot>
                {isBorn2Hike ? "Active" : "Available"}
              </Badge>
              {!isBorn2Hike ? (
                <Button
                  size="sm"
                  variant="outline"
                  loading={born2HikeLoading}
                  onClick={onBorn2Hike}
                >
                  Switch demo
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  icon,
  muted,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  muted?: boolean;
}) {
  return (
    <Card className={cn("min-h-[92px]", muted && "animate-pulse")}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium text-fg-muted">{label}</div>
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary">
          {icon}
        </div>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">
        {formatNumber(value)}
      </div>
    </Card>
  );
}

function HashtagTrendPanel({
  data,
  loading,
  error,
  newHashtag,
  onNewHashtagChange,
  onAdd,
  onSearch,
  onRefresh,
  onRemove,
  adding,
  searching,
  refreshingId,
  removingId,
}: {
  data?: HashtagTrendResponse;
  loading: boolean;
  error: Error | null;
  newHashtag: string;
  onNewHashtagChange: (value: string) => void;
  onAdd: (tag: string) => void;
  onSearch: (tag: string) => void;
  onRefresh: (id: string) => void;
  onRemove: (id: string) => void;
  adding: boolean;
  searching: boolean;
  refreshingId?: string;
  removingId?: string;
}) {
  const sortedTags = useMemo(
    () =>
      (data?.hashtags || [])
        .slice()
        .sort(
          (a, b) =>
            Number(b.latest_snapshot?.momentum_score || 0) -
              Number(a.latest_snapshot?.momentum_score || 0) ||
            Number(b.latest_snapshot?.avg_engagement || 0) -
              Number(a.latest_snapshot?.avg_engagement || 0),
        ),
    [data?.hashtags],
  );
  const topMedia = sortedTags.flatMap((tag) =>
    (tag.latest_snapshot?.top_media || []).map((media) => ({ ...media, tag: tag.tag })),
  );

  const submit = () => {
    const clean = newHashtag.replace(/^#/, "").trim();
    if (!clean) return;
    onAdd(clean);
  };
  const search = () => {
    const clean = newHashtag.replace(/^#/, "").trim();
    if (!clean) return;
    onSearch(clean);
  };

  return (
    <Card padded={false}>
      <CardHeader>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Tracked hashtag momentum</CardTitle>
            <Badge tone="success" size="sm" dot>
              {data?.provider_status?.selected === "meta_graph" ? "Meta Graph first" : "Apify fallback"}
            </Badge>
          </div>
          <CardDescription>
            Search hashtags through Meta Graph when configured, then collect public top/recent media snapshots.
          </CardDescription>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[360px] sm:flex-row">
          <Input
            value={newHashtag}
            onChange={(event) => onNewHashtagChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            leftAddon={<Hash className="h-3.5 w-3.5" />}
            placeholder="hikinglebanon"
            className="h-9"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={search}
            loading={searching}
            leftIcon={<SearchCheck className="h-3.5 w-3.5" />}
          >
            Search Meta
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={submit}
            loading={adding}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Track
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {data?.provider_status ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs text-fg-muted">
            <Badge tone={data.provider_status.meta_ready ? "success" : "warning"} size="sm" dot>
              Meta {data.provider_status.meta_ready ? "ready" : "not configured"}
            </Badge>
            <Badge tone={data.provider_status.apify_ready ? "success" : "warning"} size="sm" dot>
              Apify {data.provider_status.apify_ready ? "ready" : "not configured"}
            </Badge>
            <span>{data.provider_status.message}</span>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-warning">
            {error.message}
          </div>
        ) : null}

        {loading ? (
          <PanelSkeleton rows={3} />
        ) : sortedTags.length ? (
          <div className="grid gap-3 xl:grid-cols-3">
            {sortedTags.map((tag) => (
              <HashtagCard
                key={tag.id}
                tag={tag}
                refreshing={refreshingId === tag.id}
                removing={removingId === tag.id}
                onRefresh={() => onRefresh(tag.id)}
                onRemove={() => onRemove(tag.id)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-surface-muted p-4">
            <div className="text-sm font-semibold">No tracked hashtags yet</div>
            <p className="mt-1 text-sm text-fg-muted">
              Track one of the Born2Hike tags below to collect a real Apify snapshot.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(data?.suggested_hashtags || ["hikinglebanon", "lebanontrails", "hiking"]).map((tag) => (
                <Button
                  key={tag}
                  size="sm"
                  variant="outline"
                  onClick={() => onAdd(tag)}
                  disabled={adding}
                  leftIcon={<Hash className="h-3.5 w-3.5" />}
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>
        )}

        {topMedia.length ? (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Top hashtag media examples</div>
                <div className="text-xs text-fg-muted">
                  Real public posts from the latest snapshots, sorted by visible engagement.
                </div>
              </div>
              <Badge tone="neutral" size="sm">
                top {Math.min(3, topMedia.length)}
              </Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {topMedia.slice(0, 3).map((item) => (
                <a
                  key={`${item.tag}:${item.id}`}
                  href={item.url || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:bg-surface-muted"
                >
                  <div className="aspect-[4/3] bg-surface-muted">
                    {item.media_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.media_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-fg-muted">
                        <Hash className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between gap-2 text-xs text-fg-muted">
                      <span>#{item.tag}</span>
                      <span>{formatNumber(item.engagement)} eng.</span>
                    </div>
                    <p className="line-clamp-2 text-sm leading-relaxed">
                      {item.caption || item.author || "Public Instagram media"}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function HashtagCard({
  tag,
  refreshing,
  removing,
  onRefresh,
  onRemove,
}: {
  tag: TrackedHashtag;
  refreshing: boolean;
  removing: boolean;
  onRefresh: () => void;
  onRemove: () => void;
}) {
  const latest = tag.latest_snapshot;
  const momentum = Number(latest?.momentum_score || 0);
  const momentumTone = momentum > 5 ? "success" : momentum < -5 ? "danger" : "neutral";

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-primary" />
            <div className="truncate font-semibold">{tag.display_name}</div>
          </div>
          <div className="mt-1 text-xs text-fg-muted">
            {tag.last_synced_at ? `Last snapshot ${formatDate(tag.last_synced_at)}` : "No snapshot yet"}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Refresh ${tag.display_name}`}
            onClick={onRefresh}
            loading={refreshing}
          >
            <RefreshCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Remove ${tag.display_name}`}
            onClick={onRemove}
            loading={removing}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <MiniMetric label="Sample" value={latest?.sample_size ?? 0} />
        <MiniMetric label="Avg eng." value={Math.round(latest?.avg_engagement || 0)} />
        <div className="rounded-lg bg-surface-muted p-2">
          <Badge tone={momentumTone} size="sm">
            {momentum > 0 ? "+" : ""}
            {Math.round(momentum)}%
          </Badge>
          <div className="mt-1 text-[11px] text-fg-muted">momentum</div>
        </div>
      </div>

      <HashtagMomentumChart snapshots={tag.snapshots} />

      {latest?.warnings?.length ? (
        <div className="mt-3 rounded-md bg-warning-soft px-2 py-1.5 text-[11px] text-warning">
          {latest.warnings[0]}
        </div>
      ) : null}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface-muted p-2">
      <div className="font-numeric text-sm font-semibold">{formatNumber(value)}</div>
      <div className="mt-1 text-[11px] text-fg-muted">{label}</div>
    </div>
  );
}

function HashtagMomentumChart({ snapshots }: { snapshots: TrackedHashtag["snapshots"] }) {
  const rows = snapshots.map((snapshot) => ({
    date: shortDate(snapshot.captured_at),
    avg: snapshot.avg_engagement,
    momentum: snapshot.momentum_score,
  }));
  if (!rows.length) {
    return <div className="mt-4 h-20 rounded-lg bg-surface-muted" />;
  }

  return (
    <div className="mt-4 h-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows}>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <Tooltip formatter={(value) => formatNumber(Number(value))} />
          <Line type="monotone" dataKey="avg" stroke="oklch(46% 0.108 320)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendSection({
  title,
  description,
  icon,
  topics,
  insights,
  loading,
  hidden,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  topics: TrendTopic[];
  insights: TrendInsight[];
  loading: boolean;
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            {icon}
            {title}
          </div>
          <p className="mt-1 text-xs text-fg-muted">{description}</p>
        </div>
        <Badge tone="outline" size="sm">
          {topics.length} topics
        </Badge>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="h-48 animate-pulse bg-surface-muted" />
          ))}
        </div>
      ) : topics.length ? (
        <div className="grid gap-3">
          {topics.map((topic) => (
            <TrendTopicCard
              key={`${topic.scope}:${topic.topic_name}`}
              topic={topic}
              insight={insights.find(
                (item) =>
                  item.topic_name === topic.topic_name &&
                  item.scope === topic.scope,
              )}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardEmpty
            title="No trend signals yet"
            description="The current source mix did not return enough relevant evidence."
          />
        </Card>
      )}
    </section>
  );
}

function TrendTopicCard({
  topic,
  insight,
}: {
  topic: TrendTopic;
  insight?: TrendInsight;
}) {
  const topFormat = topEntry(topic.format_counts);
  const topSource = topEntry(topic.source_counts);

  return (
    <Card padded={false}>
      <CardHeader>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{labelize(topic.topic_name)}</CardTitle>
            <Badge tone={topic.scope === "micro" ? "brand" : "info"} size="sm">
              {topic.scope === "micro" ? "Local" : "Global"}
            </Badge>
          </div>
          <CardDescription>
            {topic.evidence_count} evidence items / {topFormat?.[0] || "mixed"} /{" "}
            {topSource?.[0] || "source mix"}
          </CardDescription>
        </div>
        <ScorePill score={topic.trend_score} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, Math.max(3, topic.trend_score))}%` }}
            />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-fg-muted md:grid-cols-4">
            <Breakdown label="Engagement" value={topic.score_breakdown.engagement_score} />
            <Breakdown label="Recency" value={topic.score_breakdown.recency_score} />
            <Breakdown label="Sources" value={topic.score_breakdown.source_diversity_score} />
            <Breakdown label="Frequency" value={topic.score_breakdown.keyword_frequency_score} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {topic.topic_keywords.slice(0, 8).map((keyword) => (
            <Badge key={keyword} tone="neutral" size="sm">
              {keyword}
            </Badge>
          ))}
        </div>

        {insight ? (
          <div className="rounded-lg border border-border bg-surface-muted p-3">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-fg">
              <SearchCheck className="h-3.5 w-3.5 text-primary" />
              Why this is moving
            </div>
            <p className="text-sm leading-relaxed text-fg-muted">
              {insight.insight_text}
            </p>
          </div>
        ) : null}

        {topic.top_evidence.length ? (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-fg-muted">Evidence</div>
            {topic.top_evidence.map((item, index) => (
              <a
                key={`${item.url || item.title || index}`}
                href={item.url || undefined}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "block rounded-lg border border-border p-3 transition-colors",
                  item.url ? "hover:bg-surface-muted" : "pointer-events-none",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {item.title || item.caption || "Evidence item"}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                      <span>{sourceLabel(item.source)}</span>
                      <span>{item.media_type || "mixed"}</span>
                      <span>{formatDate(item.published_at)}</span>
                    </div>
                  </div>
                  {item.url ? <ExternalLink className="h-4 w-4 shrink-0 text-fg-subtle" /> : null}
                </div>
              </a>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ScorePill({ score }: { score: number }) {
  const tone = score >= 70 ? "success" : score >= 45 ? "warning" : "neutral";
  return (
    <div className="text-end">
      <Badge tone={tone} size="lg">
        {Math.round(score)}
      </Badge>
      <div className="mt-1 text-[11px] text-fg-muted">score</div>
    </div>
  );
}

function Breakdown({ label, value }: { label: string; value?: number }) {
  const pct = Math.round(Number(value || 0) * 100);
  return (
    <div className="rounded-lg bg-surface-muted px-2.5 py-2">
      <div className="font-medium text-fg">{pct}%</div>
      <div>{label}</div>
    </div>
  );
}

function InsightsPanel({
  insights,
  loading,
}: {
  insights: TrendInsight[];
  loading: boolean;
}) {
  return (
    <Card padded={false}>
      <CardHeader>
        <div>
          <CardTitle>Explainable insights</CardTitle>
          <CardDescription>Grounded in collected evidence.</CardDescription>
        </div>
        <Compass className="h-4 w-4 text-fg-muted" />
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <PanelSkeleton rows={3} />
        ) : insights.length ? (
          insights.slice(0, 5).map((insight) => (
            <div key={`${insight.scope}:${insight.topic_name}`} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <Badge tone={insight.scope === "micro" ? "brand" : "info"} size="sm">
                  {insight.scope === "micro" ? "Local" : "Global"}
                </Badge>
                <span className="text-xs text-fg-muted">
                  {Math.round(insight.confidence_score * 100)}% confidence
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                {insight.insight_text}
              </p>
            </div>
          ))
        ) : (
          <CardEmpty title="No insights yet" />
        )}
      </CardContent>
    </Card>
  );
}

function RecommendationsPanel({
  recommendations,
  loading,
}: {
  recommendations: TrendRecommendation[];
  loading: boolean;
}) {
  return (
    <Card padded={false}>
      <CardHeader>
        <div>
          <CardTitle>Recommended actions</CardTitle>
          <CardDescription>Ranked content moves for the brand.</CardDescription>
        </div>
        <ArrowUpRight className="h-4 w-4 text-fg-muted" />
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <PanelSkeleton rows={4} />
        ) : recommendations.length ? (
          recommendations.slice(0, 7).map((rec) => (
            <div key={`${rec.topic_name}:${rec.recommendation_text}`} className="flex gap-3">
              <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-xs font-semibold text-primary">
                {Math.round(rec.priority_score)}
              </div>
              <div className="min-w-0">
                <p className="text-sm leading-relaxed">{rec.recommendation_text}</p>
                <div className="mt-1 text-xs text-fg-muted">
                  {labelize(rec.recommendation_type)} / {labelize(rec.topic_name)}
                </div>
              </div>
            </div>
          ))
        ) : (
          <CardEmpty title="No actions yet" />
        )}
      </CardContent>
    </Card>
  );
}

function PatternsPanel({
  data,
  loading,
}: {
  data?: TrendIntelligenceResponse;
  loading: boolean;
}) {
  return (
    <Card padded={false}>
      <CardHeader>
        <div>
          <CardTitle>Formats and captions</CardTitle>
          <CardDescription>Patterns across the current evidence set.</CardDescription>
        </div>
        <Users className="h-4 w-4 text-fg-muted" />
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <PanelSkeleton rows={4} />
        ) : (
          <>
            <div className="space-y-2">
              {(data?.format_trends || []).slice(0, 5).map((format) => (
                <PatternRow
                  key={format.format}
                  label={labelize(format.format)}
                  value={format.evidence_count}
                  meta={`${formatNumber(format.average_engagement)} avg engagement`}
                />
              ))}
            </div>
            <div className="border-t border-border pt-4">
              <div className="mb-2 text-xs font-semibold text-fg-muted">
                Caption structures
              </div>
              {(data?.caption_trends || []).slice(0, 5).map((caption) => (
                <PatternRow
                  key={caption.pattern}
                  label={labelize(caption.pattern)}
                  value={caption.evidence_count}
                  meta={caption.example || undefined}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PatternRow({
  label,
  value,
  meta,
}: {
  label: string;
  value: number;
  meta?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {meta ? <div className="mt-0.5 truncate text-xs text-fg-muted">{meta}</div> : null}
      </div>
      <Badge tone="neutral" size="sm">
        {value}
      </Badge>
    </div>
  );
}

function WarningsPanel({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <Card padded={false}>
      <CardHeader>
        <div>
          <CardTitle>Source status</CardTitle>
          <CardDescription>Non-blocking issues from this run.</CardDescription>
        </div>
        <AlertCircle className="h-4 w-4 text-warning" />
      </CardHeader>
      <CardContent className="space-y-2">
        {warnings.map((warning) => (
          <div key={warning} className="rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
            {humanWarning(warning)}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PanelSkeleton({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 rounded-lg bg-surface-muted animate-pulse" />
      ))}
    </>
  );
}

function topEntry(counts: Record<string, number>) {
  return Object.entries(counts || {}).sort((a, b) => b[1] - a[1])[0];
}

function labelize(value: string) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function sourceLabel(value: string) {
  const labels: Record<string, string> = {
    brave_web: "Brave Web",
    brave_news: "Brave News",
    brave_video: "Brave Video",
    own_posts: "Own posts",
    own_campaign_posts: "Campaigns",
    youtube: "YouTube",
    reference_observations: "References",
  };
  return labels[value] || labelize(value);
}

function shortDate(input: string | null | undefined) {
  if (!input) return "";
  const date = new Date(input);
  if (!Number.isFinite(date.getTime())) return String(input);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function humanWarning(value: string) {
  if (value.startsWith("trend_schema_missing")) {
    return "Trend tables are not applied yet. Apply backend/db/schema_v12.sql to persist runs.";
  }
  if (value.startsWith("youtube_skipped")) {
    return "YouTube source skipped because YOUTUBE_API_KEY is not configured.";
  }
  return value;
}
