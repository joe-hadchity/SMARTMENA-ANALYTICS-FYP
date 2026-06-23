"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BarChart3,
  Check,
  Database,
  ExternalLink,
  Globe2,
  Layers3,
  Play,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
import { Label } from "@/components/ui/Label";
import PageHeader from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { useI18n } from "@/i18n/I18nProvider";
import {
  competitorsApi,
  type CompetitorDiscoveryInput,
  type ManualCompetitorInput,
} from "@/lib/api";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import type {
  CompetitorAccount,
  CompetitorCandidate,
  CompetitorComparisonResponse,
  Provider,
} from "@/lib/types";

const PLATFORM_OPTIONS: Array<{ value: Provider; label: string }> = [
  { value: "meta_instagram", label: "Instagram" },
  { value: "meta_facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "x", label: "X" },
];

const BORN2HIKE_PRESET = {
  category: "hiking group",
  location: "Lebanon",
  keywords: "hiking Lebanon, group hikes, Lebanon trails, outdoor adventure Lebanon",
  hashtags: "hikinglebanon, lebanontrails, hiking, outdoorlebanon",
};

export default function CompetitorsPage() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [tab, setTab] = useState("suggestions");
  const [windowDays, setWindowDays] = useState(30);
  const [manual, setManual] = useState<ManualCompetitorInput>({
    platform: "meta_instagram",
    handle: "",
    region: "Lebanon",
    industry: "hiking group",
    tags: ["hiking", "lebanon", "trails"],
  });
  const [discover, setDiscover] = useState({
    platform: "meta_instagram" as Provider,
    category: BORN2HIKE_PRESET.category,
    location: BORN2HIKE_PRESET.location,
    keywords: BORN2HIKE_PRESET.keywords,
    hashtags: BORN2HIKE_PRESET.hashtags,
    limit: 12,
  });

  const approvedQ = useQuery({
    queryKey: ["competitors", "approved"],
    queryFn: () => competitorsApi.list(),
  });
  const candidatesQ = useQuery({
    queryKey: ["competitors", "candidates", "pending"],
    queryFn: () => competitorsApi.candidates({ status: "pending", limit: 50 }),
  });
  const comparisonQ = useQuery({
    queryKey: ["competitors", "comparison", windowDays],
    queryFn: () => competitorsApi.comparison(windowDays),
    staleTime: 60_000,
  });

  const discoverM = useMutation({
    mutationFn: () => competitorsApi.discover(discoveryPayload(discover)),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["competitors", "candidates"] });
      if (!res.candidates.length && res.provider_status?.ok === false) {
        toast.warning("No competitors found because search provider failed", {
          description: res.provider_status.message,
        });
      } else if (!res.candidates.length) {
        toast.warning("No real competitors matched this search", {
          description: "Try a wider niche, clearer location, or fewer hashtags.",
        });
      } else {
        toast.success(`${res.candidates.length} real candidate(s) found`);
      }
      setTab("suggestions");
    },
    onError: showError,
  });

  const manualM = useMutation({
    mutationFn: () => competitorsApi.manualAdd(manual),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["competitors"] });
      qc.invalidateQueries({ queryKey: ["competitors", "comparison"] });
      setManual((prev) => ({ ...prev, handle: "", display_name: "" }));
      const imported = res.posts_imported ?? 0;
      const apifyWarnings = res.warnings?.filter((w) => w.includes("apify")) || [];
      const description = imported
        ? "Apify pulled real public posts for this competitor."
        : apifyWarnings.length
          ? `Apify issue: ${apifyWarnings[0]}`
          : "Saved the exact profile. No trusted post metrics were returned yet.";
      toast.success(imported ? `Competitor saved, ${imported} posts imported` : "Competitor approved for tracking", {
        description,
      });
      setTab("approved");
    },
    onError: showError,
  });

  const approveM = useMutation({
    mutationFn: (id: string) => competitorsApi.approve(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["competitors"] });
      qc.invalidateQueries({ queryKey: ["competitors", "comparison"] });
      const imported = res.posts_imported ?? 0;
      const apifyWarnings = res.warnings?.filter((w) => w.includes("apify")) || [];
      const description = imported
        ? "Real Apify post evidence is now available for comparison."
        : apifyWarnings.length
          ? `Apify issue: ${apifyWarnings[0]}`
          : "No trusted post metrics were returned yet.";
      toast.success(imported ? `Competitor approved, ${imported} posts imported` : "Competitor approved", {
        description,
      });
    },
    onError: showError,
  });

  const rejectM = useMutation({
    mutationFn: (id: string) => competitorsApi.reject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitors", "candidates"] });
      toast.success("Suggestion rejected");
    },
    onError: showError,
  });

  const refreshM = useMutation({
    mutationFn: (id: string) => competitorsApi.refresh(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["competitors"] });
      qc.invalidateQueries({ queryKey: ["competitors", "comparison"] });
      const imported = res.posts_imported ?? 0;
      const apifyWarnings = res.warnings?.filter((w) => w.includes("apify")) || [];
      const description = imported
        ? "Apify evidence is now available for comparison."
        : apifyWarnings.length
          ? `Apify issue: ${apifyWarnings[0]}`
          : "No new trusted post metrics were returned by the source.";
      toast.success(imported ? `${imported} competitor posts imported` : "Competitor refreshed", {
        description,
      });
    },
    onError: showError,
  });

  const refreshAllM = useMutation({
    mutationFn: () => competitorsApi.refreshAll(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["competitors"] });
      qc.invalidateQueries({ queryKey: ["competitors", "comparison"] });
      const apifyWarnings = res.warnings?.filter((w) => w.includes("apify")) || [];
      const description = res.posts_imported
        ? "The comparison is now using fresh Apify evidence."
        : apifyWarnings.length
          ? `Apify issue: ${apifyWarnings[0]}`
          : "No new trusted post metrics were returned by Apify.";
      toast.success(
        res.posts_imported
          ? `${res.posts_imported} posts imported from ${res.refreshed_count} competitors`
          : "Approved competitors refreshed",
        {
          description,
        },
      );
    },
    onError: showError,
  });

  const removeM = useMutation({
    mutationFn: (id: string) => competitorsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitors"] });
      toast.success("Competitor removed");
    },
    onError: showError,
  });

  const approved = approvedQ.data || [];
  const candidates = candidatesQ.data || [];
  const avgScore = useMemo(() => {
    if (!candidates.length) return null;
    return candidates.reduce((sum, row) => sum + Number(row.relevance_score || 0), 0) / candidates.length;
  }, [candidates]);

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        eyebrow={<Swords className="h-3.5 w-3.5" />}
        title={t("competitors.title", "Competitors")}
        subtitle={t(
          "competitors.subtitle",
          "Real public profile discovery, approval, and tracking.",
        )}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDiscover((prev) => ({ ...prev, ...BORN2HIKE_PRESET }));
              setManual((prev) => ({
                ...prev,
                region: "Lebanon",
                industry: "hiking group",
                tags: ["hiking", "lebanon", "trails"],
              }));
            }}
            leftIcon={<Sparkles className="h-3.5 w-3.5" />}
          >
            Born2Hike preset
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Metric label="Approved" value={approved.length} icon={<ShieldCheck className="h-4 w-4" />} />
        <Metric label="Pending" value={candidates.length} icon={<Search className="h-4 w-4" />} />
        <Metric label="Avg match" value={avgScore == null ? "-" : `${Math.round(avgScore)}%`} icon={<Globe2 className="h-4 w-4" />} />
      </div>

      <ImprovedComparisonCard
        data={comparisonQ.data}
        loading={comparisonQ.isLoading}
        fetching={comparisonQ.isFetching}
        refreshingAll={refreshAllM.isPending}
        windowDays={windowDays}
        locale={locale}
        onWindowChange={setWindowDays}
        onRefresh={() => refreshAllM.mutate()}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ManualCard
          value={manual}
          loading={manualM.isPending}
          onChange={setManual}
          onSubmit={() => manualM.mutate()}
        />
        <DiscoveryCard
          value={discover}
          loading={discoverM.isPending}
          result={discoverM.data}
          onChange={setDiscover}
          onSubmit={() => discoverM.mutate()}
        />
      </div>

      {schemaError(approvedQ.error || candidatesQ.error) ? (
        <Card>
          <div className="flex items-start gap-3 text-warning">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div>
              <div className="font-medium">Competitor schema is not applied</div>
              <div className="mt-1 text-sm text-fg-muted">
                Run `backend/db/schema_v10.sql` and `backend/db/schema_v13.sql` in Supabase.
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions">
          <Card padded={false}>
            <CardHeader>
              <div>
                <CardTitle>Review suggestions</CardTitle>
                <CardDescription>Only approved profiles are saved as competitors.</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => candidatesQ.refetch()}
                loading={candidatesQ.isFetching}
                leftIcon={<RefreshCcw className="h-3.5 w-3.5" />}
              >
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {candidatesQ.isLoading ? (
                <LoadingRows />
              ) : candidates.length ? (
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {candidates.map((candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      approving={approveM.isPending}
                      rejecting={rejectM.isPending}
                      onApprove={() => approveM.mutate(candidate.id)}
                      onReject={() => rejectM.mutate(candidate.id)}
                    />
                  ))}
                </div>
              ) : (
                <CardEmpty
                  title="No pending suggestions"
                  description="Run discovery to collect real public profile candidates."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card padded={false}>
            <CardHeader>
              <div>
                <CardTitle>Approved competitors</CardTitle>
                <CardDescription>Tracked profiles with real evidence snapshots.</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => approvedQ.refetch()}
                loading={approvedQ.isFetching}
                leftIcon={<RefreshCcw className="h-3.5 w-3.5" />}
              >
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {approvedQ.isLoading ? (
                <LoadingRows />
              ) : approved.length ? (
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {approved.map((competitor) => (
                    <ApprovedCard
                      key={competitor.id}
                      competitor={competitor}
                      locale={locale}
                      refreshing={refreshM.isPending}
                      removing={removeM.isPending}
                      onRefresh={() => refreshM.mutate(competitor.id)}
                      onRemove={() => removeM.mutate(competitor.id)}
                    />
                  ))}
                </div>
              ) : (
                <CardEmpty
                  title="No approved competitors"
                  description="Approve a suggestion or add a verified username manually."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ImprovedComparisonCard({
  data,
  loading,
  fetching,
  refreshingAll,
  windowDays,
  locale,
  onWindowChange,
  onRefresh,
}: {
  data?: CompetitorComparisonResponse;
  loading: boolean;
  fetching: boolean;
  refreshingAll: boolean;
  windowDays: number;
  locale: "en" | "ar";
  onWindowChange: (value: number) => void;
  onRefresh: () => void;
}) {
  const own = data?.own;
  const competitors = data?.competitors_summary;
  const benchmark = data?.benchmark;
  const opportunities = data?.opportunities || [];
  const delta = data?.deltas.engagement_rate_delta ?? null;
  const topCompetitors = data?.competitors.slice(0, 5) || [];
  const verdict = comparisonVerdict(data);
  const hasCompetitorPostMetrics = Boolean(competitors?.post_count);

  return (
    <Card padded={false}>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            You vs competitors
          </CardTitle>
          <CardDescription>
            Engagement, format mix, evidence coverage, and next moves from approved competitors.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(windowDays)}
            onChange={(event) => onWindowChange(Number(event.target.value))}
            className="h-8 w-[120px] py-1 text-xs"
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            loading={fetching || refreshingAll}
            leftIcon={<RefreshCcw className="h-3.5 w-3.5" />}
          >
            Refresh competitors
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-72 animate-pulse rounded-md bg-surface-muted" />
        ) : !data ? (
          <CardEmpty title="No comparison yet" />
        ) : (
          <div className="space-y-5">
            <div className="rounded-md border border-border bg-surface-muted p-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={verdict.tone} size="sm" dot>
                      {verdict.label}
                    </Badge>
                    <Badge tone="outline" size="sm">
                      {benchmark?.data_quality_label || "thin"} data
                    </Badge>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold leading-tight text-fg">
                    {verdict.title}
                  </h3>
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-fg-muted">
                    {verdict.detail}
                  </p>
                  {!hasCompetitorPostMetrics ? (
                    <p className="mt-2 max-w-3xl text-xs leading-relaxed text-warning">
                      Competitor followers, ER, engagement, and post counts are hidden until a real post source is connected. Approved usernames are real, but SmartMENA will not invent their metrics.
                    </p>
                  ) : null}
                  {data?.warnings?.length ? (
                    <div className="mt-3 space-y-1 rounded-md border border-warning/30 bg-warning/5 p-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-warning">Diagnostics</p>
                      {data.warnings.map((warning) => (
                        <p key={warning} className="text-xs text-warning/80">
                          {warning}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="rounded-md border border-border bg-surface px-3 py-2">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-fg-muted">
                      Evidence strength
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {benchmark?.data_quality_score ?? 0}/100
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(4, benchmark?.data_quality_score || 0)}%` }}
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-fg-muted">
                    <span>{benchmark?.evidence_coverage.approved_competitors || 0} approved</span>
                    <span>{benchmark?.evidence_coverage.competitors_with_posts || 0} with real posts</span>
                    <span>{benchmark?.evidence_coverage.competitors_with_snapshots || 0} follower snapshots</span>
                    <span>{benchmark?.evidence_coverage.public_evidence_items || 0} web items</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <CompareStat
                label="Your avg ER"
                value={formatPercent(own?.avg_engagement_rate, 2, locale)}
                helper={`${formatNumber(own?.post_count || 0, locale)} posts / ${formatNumber(own?.avg_posts_per_week || 0, locale)} per week`}
              />
              <CompareStat
                label="Competitor avg ER"
                value={hasCompetitorPostMetrics ? formatPercent(competitors?.avg_engagement_rate, 2, locale) : "Unavailable"}
                helper={hasCompetitorPostMetrics ? `${formatNumber(competitors?.competitor_count || 0, locale)} profiles / ${formatNumber(competitors?.avg_posts_per_week || 0, locale)} posts per week` : "connect Meta Business Discovery or Apify"}
              />
              <CompareStat
                label="Engagement gap"
                value={delta == null ? "-" : `${delta >= 0 ? "+" : ""}${formatPercent(delta, 2, locale)}`}
                helper={benchmark?.engagement_winner === "competitors" ? "competitors ahead" : benchmark?.engagement_winner === "you" ? "you are ahead" : "needs more data"}
                tone={delta == null ? "neutral" : delta >= 0 ? "success" : "warning"}
              />
              <CompareStat
                label="Competitor reach proxy"
                value={
                  !hasCompetitorPostMetrics || competitors?.avg_followers == null
                    ? "-"
                    : formatNumber(competitors.avg_followers, locale)
                }
                helper={hasCompetitorPostMetrics ? `${formatNumber(competitors?.evidence_count || 0, locale)} public evidence items` : "not estimated from manual profiles"}
              />
            </div>

            {topCompetitors.length > 0 && (
              <ComparisonCharts
                own={own}
                topCompetitors={topCompetitors}
                locale={locale}
              />
            )}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="rounded-md border border-border bg-surface-muted/50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Target className="h-4 w-4 text-primary" />
                  Priority moves
                </div>
                {opportunities.length ? (
                  <div className="space-y-2">
                    {opportunities.map((item) => (
                      <div key={`${item.type}:${item.title}`} className="rounded-md border border-border bg-surface p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-fg">{item.title}</div>
                          <Badge tone={item.priority === "high" ? "warning" : "neutral"} size="sm">
                            {item.priority}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                          {item.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-fg-muted">
                    Add own posts and approved competitors to generate a useful comparison.
                  </div>
                )}
              </div>

              <div className="rounded-md border border-border bg-surface">
                <div className="grid gap-3 border-b border-border p-3 md:grid-cols-3">
                  <SignalMini
                    icon={<Layers3 className="h-3.5 w-3.5" />}
                    label="Your leading format"
                    value={formatLabel(own?.top_format)}
                    helper={shareLabel(own?.top_format_share)}
                  />
                  <SignalMini
                    icon={<Layers3 className="h-3.5 w-3.5" />}
                    label="Competitor leading format"
                    value={formatLabel(competitors?.top_format)}
                    helper={shareLabel(competitors?.top_format_share)}
                  />
                  <SignalMini
                    icon={<Database className="h-3.5 w-3.5" />}
                    label="Benchmark account"
                    value={benchmark?.best_benchmark?.handle ? `@${benchmark.best_benchmark.handle}` : "-"}
                    helper={benchmark?.best_benchmark?.reason || "No benchmark yet"}
                  />
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_90px_90px_96px] gap-2 border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                  <div>Benchmark</div>
                  <div className="text-end">Posts</div>
                  <div className="text-end">Avg ER</div>
                  <div className="text-end">Eng/post</div>
                </div>
                <div className="divide-y divide-border">
                  <CompareRow
                    label="You"
                    sublabel={topFormatLabel(own?.format_mix)}
                    posts={own?.post_count || 0}
                    avgRate={own?.avg_engagement_rate ?? null}
                    engagementPerPost={own?.avg_engagement_per_post || 0}
                    locale={locale}
                    strong
                  />
                  {topCompetitors.map((competitor) => (
                    <CompareRow
                      key={competitor.competitor_id}
                      label={`@${competitor.handle}`}
                      sublabel={topFormatLabel(competitor.format_mix)}
                      posts={competitor.post_count}
                      avgRate={competitor.avg_engagement_rate}
                      engagementPerPost={competitor.avg_engagement_per_post}
                      hasMetrics={competitor.post_count > 0}
                      locale={locale}
                      followers={competitor.followers_count}
                      evidence={competitor.evidence_count}
                    />
                  ))}
                  {!topCompetitors.length ? (
                    <div className="px-3 py-8 text-center text-sm text-fg-muted">
                      Approve and refresh competitors to populate the benchmark table.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <TopPostPanel title="Your strongest post" handle="you" post={own?.top_post} locale={locale} />
              <TopPostPanel
                title="Competitor strongest post"
                handle={benchmark?.best_benchmark?.handle || competitors?.best_competitor_handle || "competitor"}
                post={competitors?.top_post}
                locale={locale}
              />
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ComparisonCard({
  data,
  loading,
  fetching,
  windowDays,
  locale,
  onWindowChange,
  onRefresh,
}: {
  data?: CompetitorComparisonResponse;
  loading: boolean;
  fetching: boolean;
  windowDays: number;
  locale: "en" | "ar";
  onWindowChange: (value: number) => void;
  onRefresh: () => void;
}) {
  const own = data?.own;
  const competitors = data?.competitors_summary;
  const benchmark = data?.benchmark;
  const opportunities = data?.opportunities || [];
  const delta = data?.deltas.engagement_rate_delta ?? null;
  const topCompetitors = data?.competitors.slice(0, 5) || [];
  const verdict = comparisonVerdict(data);

  return (
    <Card padded={false}>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            You vs competitors
          </CardTitle>
          <CardDescription>
            Recent own posts compared with approved competitor evidence.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(windowDays)}
            onChange={(event) => onWindowChange(Number(event.target.value))}
            className="h-8 w-[120px] py-1 text-xs"
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            loading={fetching}
            leftIcon={<RefreshCcw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-48 animate-pulse rounded-lg bg-surface-muted" />
        ) : !data ? (
          <CardEmpty title="No comparison yet" />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <CompareStat
                label="Your engagement rate"
                value={formatPercent(own?.avg_engagement_rate, 2, locale)}
                helper={`${formatNumber(own?.post_count || 0, locale)} posts`}
              />
              <CompareStat
                label="Competitor avg"
                value={formatPercent(competitors?.avg_engagement_rate, 2, locale)}
                helper={`${formatNumber(competitors?.competitor_count || 0, locale)} approved profiles`}
              />
              <CompareStat
                label="Gap"
                value={delta == null ? "—" : `${delta >= 0 ? "+" : ""}${formatPercent(delta, 2, locale)}`}
                helper="your avg engagement rate minus competitor avg"
                tone={delta == null ? "neutral" : delta >= 0 ? "success" : "warning"}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <div className="rounded-lg border border-border bg-surface-muted/50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Quick read
                </div>
                {data.recommendations.length ? (
                  <div className="space-y-2">
                    {data.recommendations.map((note) => (
                      <div key={note} className="flex items-start gap-2 text-sm text-fg-muted">
                        <Check className="mt-0.5 h-3.5 w-3.5 text-success" />
                        <span>{note}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-fg-muted">
                    Add own posts and approved competitors to generate a useful comparison.
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border">
                <div className="grid grid-cols-[minmax(0,1fr)_90px_90px_96px] gap-2 border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                  <div>Benchmark</div>
                  <div className="text-end">Posts</div>
                  <div className="text-end">Avg ER</div>
                  <div className="text-end">Eng/post</div>
                </div>
                <div className="divide-y divide-border">
                  <CompareRow
                    label="You"
                    sublabel={topFormatLabel(own?.format_mix)}
                    posts={own?.post_count || 0}
                    avgRate={own?.avg_engagement_rate ?? null}
                    engagementPerPost={own?.avg_engagement_per_post || 0}
                    locale={locale}
                    strong
                  />
                  {topCompetitors.map((competitor) => (
                    <CompareRow
                      key={competitor.competitor_id}
                      label={`@${competitor.handle}`}
                      sublabel={topFormatLabel(competitor.format_mix)}
                      posts={competitor.post_count}
                      avgRate={competitor.avg_engagement_rate}
                      engagementPerPost={competitor.avg_engagement_per_post}
                      locale={locale}
                    />
                  ))}
                  {!topCompetitors.length ? (
                    <div className="px-3 py-8 text-center text-sm text-fg-muted">
                      Approve and refresh competitors to populate the benchmark table.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CompareStat({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "neutral" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : "text-fg";
  return (
    <div className="rounded-lg bg-surface-muted p-4">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-fg-subtle">{helper}</div>
    </div>
  );
}

function CompareRow({
  label,
  sublabel,
  posts,
  avgRate,
  engagementPerPost,
  locale,
  strong,
  followers,
  evidence,
  hasMetrics = true,
}: {
  label: string;
  sublabel: string;
  posts: number;
  avgRate: number | null;
  engagementPerPost: number;
  locale: "en" | "ar";
  strong?: boolean;
  followers?: number | null;
  evidence?: number;
  hasMetrics?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_90px_90px_96px] gap-2 px-3 py-3 text-sm">
      <div className="min-w-0">
        <div className={strong ? "font-semibold text-fg" : "truncate font-medium text-fg"}>
          {label}
        </div>
        <div className="mt-0.5 truncate text-xs text-fg-subtle">
          {sublabel}
          {followers ? ` / ${formatNumber(followers, locale)} followers` : ""}
          {evidence ? ` / ${evidence} evidence` : ""}
        </div>
      </div>
      <div className="text-end tabular-nums">{hasMetrics ? formatNumber(posts, locale) : "-"}</div>
      <div className="text-end tabular-nums">{hasMetrics ? formatPercent(avgRate, 2, locale) : "-"}</div>
      <div className="text-end tabular-nums">{hasMetrics ? formatNumber(engagementPerPost, locale) : "-"}</div>
    </div>
  );
}

function SignalMini({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="min-w-0 rounded-md bg-surface-muted p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-fg">{value}</div>
      <div className="mt-0.5 truncate text-xs text-fg-muted">{helper}</div>
    </div>
  );
}

function TopPostPanel({
  title,
  handle,
  post,
  locale,
}: {
  title: string;
  handle: string;
  post?: CompetitorComparisonResponse["own"]["top_post"];
  locale: "en" | "ar";
}) {
  const initial = (handle || "?")[0].toUpperCase();
  const displayHandle = handle === "you" ? "you" : `@${handle}`;

  return (
    <div className="space-y-1.5">
      <div className="px-0.5 text-xs font-semibold text-fg-muted">{title}</div>

      {post ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-bold text-fg ring-1 ring-border">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                <svg className="h-3 w-3 shrink-0 text-[#E1306C]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                {displayHandle}
              </div>
              {post.published_at ? (
                <div className="text-[10px] text-fg-subtle">
                  {formatDate(post.published_at, locale)}
                </div>
              ) : null}
            </div>
            {post.url ? (
              <a
                href={post.url}
                target="_blank"
                rel="noreferrer"
                className="ml-auto shrink-0 text-fg-subtle hover:text-fg"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>

          {/* Caption */}
          {post.caption ? (
            <div className="px-3 pb-2 text-xs leading-relaxed text-fg">
              <p className="line-clamp-2">{post.caption}</p>
            </div>
          ) : null}

          {/* Media — Apify gives us the post thumbnail (displayUrl).
              For videos/reels, overlay a play badge so it's clear it's a video. */}
          {post.media_url ? (
            <a
              href={post.url || "#"}
              target="_blank"
              rel="noreferrer"
              className="relative block w-full bg-black"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.media_url}
                alt={post.caption || "Post media"}
                className="max-h-64 w-full object-cover"
                referrerPolicy="no-referrer"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              {(post.media_type === "video" || post.media_type === "reel") && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 ring-2 ring-white/80 backdrop-blur-sm">
                    <Play className="h-5 w-5 fill-white text-white" />
                  </span>
                </span>
              )}
              {post.media_type ? (
                <span className="absolute right-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                  {post.media_type}
                </span>
              ) : null}
            </a>
          ) : (
            <div className="mx-3 mb-2 flex h-28 items-center justify-center rounded-lg bg-surface-muted text-xs text-fg-subtle">
              No image captured
            </div>
          )}

          {/* Metrics */}
          <div className="divide-y divide-border/60 px-3">
            <MetricRow label="Public Engagements" value={post.engagement_total} locale={locale} bold />
            <MetricRow label="Likes" value={post.likes} locale={locale} />
            <MetricRow label="Comments" value={post.comments} locale={locale} />
            <MetricRow label="Shares" value={post.shares} locale={locale} />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-fg-muted">
          No top post in this window.
        </div>
      )}
    </div>
  );
}

function MetricRow({
  label,
  value,
  locale,
  bold,
}: {
  label: string;
  value: number | null | undefined;
  locale: "en" | "ar";
  bold?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2 text-xs ${bold ? "font-semibold text-fg" : "text-fg-muted"}`}>
      <span>{label}</span>
      <span className={bold ? "text-sm font-bold text-fg" : "font-medium text-fg"}>
        {value != null ? formatNumber(value, locale) : "—"}
      </span>
    </div>
  );
}

const FORMAT_COLORS: Record<string, string> = {
  reel:     "oklch(46% 0.108 320)",
  video:    "oklch(54% 0.105 320)",
  carousel: "oklch(64% 0.092 320)",
  image:    "oklch(72% 0.070 320)",
  story:    "oklch(64% 0.135 60)",
  text:     "oklch(64% 0.012 50)",
  unknown:  "oklch(76% 0.010 50)",
};

function ComparisonCharts({
  own,
  topCompetitors,
  locale,
}: {
  own?: CompetitorComparisonResponse["own"];
  topCompetitors: CompetitorComparisonResponse["competitors"];
  locale: "en" | "ar";
}) {
  // ── Engagement Rate leaderboard ──────────────────────────────────────────
  const erData = [
    { name: "You", er: Number(((own?.avg_engagement_rate ?? 0) * 100).toFixed(2)), isYou: true },
    ...topCompetitors
      .filter((c) => c.avg_engagement_rate != null)
      .map((c) => ({
        name: `@${c.handle}`,
        er: Number(((c.avg_engagement_rate ?? 0) * 100).toFixed(2)),
        isYou: false,
      })),
  ].sort((a, b) => b.er - a.er);

  // ── Posts / week cadence ─────────────────────────────────────────────────
  const cadenceData = [
    { name: "You", ppw: Number((own?.avg_posts_per_week ?? 0).toFixed(1)), isYou: true },
    ...topCompetitors.map((c) => ({
      name: `@${c.handle}`,
      ppw: Number((c.avg_posts_per_week ?? 0).toFixed(1)),
      isYou: false,
    })),
  ].sort((a, b) => b.ppw - a.ppw);

  // ── Format mix (your own content) ────────────────────────────────────────
  const formatEntries = Object.entries(own?.format_mix ?? {}).filter(([, v]) => v > 0);
  const formatTotal = formatEntries.reduce((s, [, v]) => s + v, 0);
  const formatData = formatEntries
    .sort((a, b) => b[1] - a[1])
    .map(([fmt, count]) => ({
      name: formatLabel(fmt),
      value: count,
      pct: formatTotal > 0 ? Math.round((count / formatTotal) * 100) : 0,
      color: FORMAT_COLORS[fmt] ?? FORMAT_COLORS.unknown,
    }));

  const CHART_YOU    = "oklch(46% 0.108 320)";
  const CHART_OTHER  = "oklch(76% 0.010 50)";

  const tooltipStyle: React.CSSProperties = {
    background: "#ffffff",
    border: "1px solid oklch(88% 0.022 320)",
    borderRadius: 8,
    fontSize: 11,
    color: "oklch(22% 0.050 320)",
    boxShadow: "0 2px 8px rgba(30,22,12,.10)",
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* 1. ER Leaderboard */}
      <div className="col-span-1 lg:col-span-1 rounded-md border border-border bg-surface p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4 text-primary" />
          Engagement rate ranking
        </div>
        {erData.every((d) => d.er === 0) ? (
          <p className="text-xs text-fg-muted">No engagement rate data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(120, erData.length * 36)}>
            <BarChart data={erData} layout="vertical" margin={{ left: 4, right: 32, top: 0, bottom: 0 }}>
              <XAxis type="number" hide domain={[0, "dataMax + 0.5"]} />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                tick={{ fontSize: 11, fill: "var(--color-fg-muted)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(v: number) => [`${v}%`, "Avg ER"]}
                contentStyle={tooltipStyle}
                cursor={{ fill: "var(--color-surface-muted)" }}
              />
              <Bar dataKey="er" radius={[0, 4, 4, 0]} maxBarSize={18} label={{ position: "right", fontSize: 10, formatter: (v: number) => `${v}%`, fill: "var(--color-fg-muted)" }}>
                {erData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.isYou ? CHART_YOU : CHART_OTHER}
                    opacity={entry.isYou ? 1 : 0.7}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 2. Posting cadence */}
      <div className="rounded-md border border-border bg-surface p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <BarChart3 className="h-4 w-4 text-primary" />
          Posts per week
        </div>
        {cadenceData.every((d) => d.ppw === 0) ? (
          <p className="text-xs text-fg-muted">No cadence data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(120, cadenceData.length * 36)}>
            <BarChart data={cadenceData} layout="vertical" margin={{ left: 4, right: 32, top: 0, bottom: 0 }}>
              <XAxis type="number" hide domain={[0, "dataMax + 0.5"]} />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                tick={{ fontSize: 11, fill: "var(--color-fg-muted)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(v: number) => [`${v} posts/wk`, "Cadence"]}
                contentStyle={tooltipStyle}
                cursor={{ fill: "var(--color-surface-muted)" }}
              />
              <Bar dataKey="ppw" radius={[0, 4, 4, 0]} maxBarSize={18} label={{ position: "right", fontSize: 10, formatter: (v: number) => `${v}`, fill: "var(--color-fg-muted)" }}>
                {cadenceData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.isYou ? CHART_YOU : CHART_OTHER}
                    opacity={entry.isYou ? 1 : 0.7}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 3. Your format mix donut */}
      <div className="rounded-md border border-border bg-surface p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Layers3 className="h-4 w-4 text-primary" />
          Your content mix
        </div>
        {formatData.length === 0 ? (
          <p className="text-xs text-fg-muted">No format data yet.</p>
        ) : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={110} height={110}>
              <PieChart>
                <Pie
                  data={formatData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  dataKey="value"
                  strokeWidth={1}
                  stroke="var(--color-surface)"
                >
                  {formatData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, _: string, props: { payload?: { pct?: number } }) => [`${v} posts (${props?.payload?.pct ?? 0}%)`, ""]}
                  contentStyle={tooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {formatData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ background: entry.color }} />
                    <span className="text-xs text-fg-muted">{entry.name}</span>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-fg">{entry.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ManualCard({
  value,
  loading,
  onChange,
  onSubmit,
}: {
  value: ManualCompetitorInput;
  loading: boolean;
  onChange: (value: ManualCompetitorInput) => void;
  onSubmit: () => void;
}) {
  return (
    <Card padded={false}>
      <CardHeader>
        <div>
          <CardTitle>Add manually</CardTitle>
          <CardDescription>Add the exact public username or profile URL you want to track.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
          <Field label="Platform">
            <PlatformSelect
              value={value.platform || "meta_instagram"}
              onChange={(platform) => onChange({ ...value, platform })}
            />
          </Field>
          <Field label="Username / URL">
            <Input
              value={value.handle}
              onChange={(event) => onChange({ ...value, handle: event.target.value })}
              placeholder="@lebanontrail or instagram.com/lebanontrail"
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Display name">
            <Input
              value={value.display_name || ""}
              onChange={(event) => onChange({ ...value, display_name: event.target.value })}
            />
          </Field>
          <Field label="Region">
            <Input
              value={value.region || ""}
              onChange={(event) => onChange({ ...value, region: event.target.value })}
            />
          </Field>
          <Field label="Niche">
            <Input
              value={value.industry || ""}
              onChange={(event) => onChange({ ...value, industry: event.target.value })}
            />
          </Field>
        </div>
        <Field label="Tags">
          <Input
            value={(value.tags || []).join(", ")}
            onChange={(event) => onChange({ ...value, tags: splitList(event.target.value) })}
            placeholder="hiking, lebanon, trails"
          />
        </Field>
        <div className="flex justify-end">
          <Button
            onClick={onSubmit}
            loading={loading}
            disabled={!value.handle?.trim()}
            leftIcon={<Check className="h-3.5 w-3.5" />}
          >
            Track competitor
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DiscoveryCard({
  value,
  loading,
  result,
  onChange,
  onSubmit,
}: {
  value: {
    platform: Provider;
    category: string;
    location: string;
    keywords: string;
    hashtags: string;
    limit: number;
  };
  loading: boolean;
  result?: {
    candidates: CompetitorCandidate[];
    warnings: string[];
    provider_status?: {
      ok: boolean;
      reason: string | null;
      message: string;
    };
  };
  onChange: (value: {
    platform: Provider;
    category: string;
    location: string;
    keywords: string;
    hashtags: string;
    limit: number;
  }) => void;
  onSubmit: () => void;
}) {
  return (
    <Card padded={false}>
      <CardHeader>
        <div>
          <CardTitle>Discover from web</CardTitle>
          <CardDescription>Brave Search returns public profile evidence for approval.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Platform">
            <PlatformSelect
              value={value.platform}
              onChange={(platform) => onChange({ ...value, platform })}
            />
          </Field>
          <Field label="Business niche">
            <Input
              value={value.category}
              onChange={(event) => onChange({ ...value, category: event.target.value })}
            />
          </Field>
          <Field label="Location">
            <Input
              value={value.location}
              onChange={(event) => onChange({ ...value, location: event.target.value })}
            />
          </Field>
        </div>
        <Field label="Search keywords">
          <Input
            value={value.keywords}
            onChange={(event) => onChange({ ...value, keywords: event.target.value })}
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
          <Field label="Hashtags">
            <Input
              value={value.hashtags}
              onChange={(event) => onChange({ ...value, hashtags: event.target.value })}
            />
          </Field>
          <Field label="Limit">
            <Select
              value={String(value.limit)}
              onChange={(event) => onChange({ ...value, limit: Number(event.target.value) })}
            >
              <option value="6">6</option>
              <option value="12">12</option>
              <option value="18">18</option>
              <option value="24">24</option>
            </Select>
          </Field>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={onSubmit}
            loading={loading}
            disabled={!value.category.trim() || !value.location.trim()}
            leftIcon={<Search className="h-3.5 w-3.5" />}
          >
            Discover
          </Button>
        </div>
        {result && !result.candidates.length ? (
          <div
            className={`rounded-lg border p-3 text-sm ${
              result.provider_status?.ok === false
                ? "border-warning/30 bg-warning/10 text-warning"
                : "border-border bg-surface-muted text-fg-muted"
            }`}
          >
            <div className="font-medium">
              {result.provider_status?.ok === false
                ? "Search provider issue"
                : "No matching public profiles found"}
            </div>
            <div className="mt-1 text-xs leading-relaxed text-fg-muted">
              {result.provider_status?.message ||
                "Try searching for a wider niche like hiking Lebanon, outdoor Lebanon, or group hikes Lebanon."}
            </div>
            {result.warnings.length ? (
              <div className="mt-2 text-[11px] text-fg-subtle">
                Technical signal: {result.warnings.slice(0, 3).join(", ")}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CandidateCard({
  candidate,
  approving,
  rejecting,
  onApprove,
  onReject,
}: {
  candidate: CompetitorCandidate;
  approving: boolean;
  rejecting: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const evidence = candidate.evidence_json || [];
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-sm font-semibold">@{candidate.handle}</div>
            <Badge tone="brand" size="sm">{candidate.platform.replace("meta_", "")}</Badge>
            <ScoreBadge score={candidate.relevance_score} />
          </div>
          <div className="mt-1 text-xs text-fg-muted">
            {candidate.display_name || candidate.industry || "Public profile"}
          </div>
        </div>
        {candidate.profile_url ? (
          <a
            href={candidate.profile_url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md p-1.5 text-fg-muted hover:bg-surface-muted hover:text-fg"
            aria-label="Open profile"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(candidate.tags || []).slice(0, 6).map((tag) => (
          <Badge key={tag} tone="neutral" size="sm">#{tag.replace(/^#/, "")}</Badge>
        ))}
      </div>

      {candidate.rationale ? (
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">{candidate.rationale}</p>
      ) : null}

      <div className="mt-3 space-y-1">
        {candidate.signals.slice(0, 3).map((signal) => (
          <div key={signal} className="flex items-start gap-2 text-xs text-fg-muted">
            <Check className="mt-0.5 h-3.5 w-3.5 text-success" />
            <span>{signal}</span>
          </div>
        ))}
      </div>

      {evidence.length ? (
        <div className="mt-3 rounded-lg bg-surface-muted p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
            Evidence
          </div>
          <div className="mt-1 text-xs text-fg-muted line-clamp-2">
            {evidence[0]?.title || evidence[0]?.snippet || evidence[0]?.url}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onReject}
          loading={rejecting}
          leftIcon={<X className="h-3.5 w-3.5" />}
        >
          Reject
        </Button>
        <Button
          size="sm"
          onClick={onApprove}
          loading={approving}
          leftIcon={<Check className="h-3.5 w-3.5" />}
        >
          Approve
        </Button>
      </div>
    </div>
  );
}

function ApprovedCard({
  competitor,
  locale,
  refreshing,
  removing,
  onRefresh,
  onRemove,
}: {
  competitor: CompetitorAccount;
  locale: "en" | "ar";
  refreshing: boolean;
  removing: boolean;
  onRefresh: () => void;
  onRemove: () => void;
}) {
  const snapshot = competitor.latest_snapshot;
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-sm font-semibold">@{competitor.handle}</div>
            <Badge tone="success" size="sm">approved</Badge>
          </div>
          <div className="mt-1 text-xs text-fg-muted">
            {competitor.display_name || competitor.industry || "Tracked profile"}
          </div>
        </div>
        {competitor.profile_url ? (
          <a
            href={competitor.profile_url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md p-1.5 text-fg-muted hover:bg-surface-muted hover:text-fg"
            aria-label="Open profile"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniStat label="Platform" value={competitor.platform.replace("meta_", "")} />
        <MiniStat label="Region" value={competitor.region || "-"} />
        <MiniStat
          label="Followers"
          value={
            snapshot?.followers_count == null
              ? "-"
              : formatNumber(snapshot.followers_count, locale)
          }
        />
      </div>

      <div className="mt-3 text-xs text-fg-muted">
        Last snapshot: {snapshot?.captured_at ? formatDate(snapshot.captured_at, locale) : "-"}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          loading={refreshing}
          leftIcon={<RefreshCcw className="h-3.5 w-3.5" />}
        >
          Refresh
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          loading={removing}
          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-fg-muted">{label}</div>
          <div className="mt-1 text-xl font-semibold">{value}</div>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function PlatformSelect({
  value,
  onChange,
}: {
  value: Provider;
  onChange: (value: Provider) => void;
}) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value as Provider)}>
      {PLATFORM_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 70 ? "success" : score >= 45 ? "warning" : "neutral";
  return <Badge tone={tone} size="sm">{Math.round(score)}% match</Badge>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-muted p-2">
      <div className="text-[10px] uppercase tracking-wider text-fg-subtle">{label}</div>
      <div className="mt-1 truncate text-xs font-medium">{value}</div>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-40 animate-pulse rounded-lg bg-surface-muted" />
      ))}
    </div>
  );
}

function discoveryPayload(value: {
  platform: Provider;
  category: string;
  location: string;
  keywords: string;
  hashtags: string;
  limit: number;
}): CompetitorDiscoveryInput {
  return {
    platform: value.platform,
    category: value.category,
    location: value.location,
    keywords: splitList(value.keywords),
    hashtags: splitList(value.hashtags),
    limit: value.limit,
  };
}

function splitList(value: string) {
  return String(value || "")
    .split(/[,\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function topFormatLabel(formatMix?: Record<string, number>) {
  const top = Object.entries(formatMix || {}).sort((a, b) => b[1] - a[1])[0];
  if (!top) return "No format data";
  return `${formatLabel(top[0])} led / ${top[1]} post${top[1] === 1 ? "" : "s"}`;
}

function comparisonVerdict(data?: CompetitorComparisonResponse): {
  label: string;
  title: string;
  detail: string;
  tone: "success" | "warning" | "neutral";
} {
  const benchmark = data?.benchmark;
  if (!data || !benchmark) {
    return {
      label: "No benchmark",
      title: "Comparison needs more evidence",
      detail: "Sync your own posts and approve competitors to build a reliable benchmark.",
      tone: "neutral",
    };
  }
  if (benchmark.data_quality_label === "thin") {
    return {
      label: "Thin evidence",
      title: "The comparison is useful, but not final yet",
      detail:
        "SmartMENA found some competitor signals, but more recent posts or refreshed competitor snapshots will make the decision stronger.",
      tone: "warning",
    };
  }
  if (benchmark.engagement_winner === "you") {
    return {
      label: "You lead",
      title: "Your engagement rate is ahead of the approved competitor set",
      detail:
        benchmark.format_gap.message ||
        "Use this advantage to repeat your strongest content structure while testing one competitor-led format.",
      tone: "success",
    };
  }
  if (benchmark.engagement_winner === "competitors") {
    return {
      label: "Competitors lead",
      title: "Competitors are winning the engagement rate benchmark",
      detail:
        benchmark.format_gap.message ||
        "Inspect the benchmark account and test the content format competitors are using most.",
      tone: "warning",
    };
  }
  return {
    label: "Needs data",
    title: "There is not enough engagement data to call a winner",
    detail: "Refresh competitors and sync your own recent posts to calculate the gap.",
    tone: "neutral",
  };
}

function formatLabel(value?: string | null) {
  if (!value) return "-";
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function shareLabel(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return "No share data";
  return `${Math.round(Number(value) * 100)}% of captured posts`;
}

function schemaError(error: unknown) {
  const details = (error as { details?: unknown })?.details;
  return JSON.stringify(details || error || "").includes("competitor_schema_missing");
}

function showError(error: unknown) {
  const err = error as { message?: string; details?: { hint?: string } };
  toast.error(err.message || "Request failed", {
    description: err.details?.hint,
  });
}
