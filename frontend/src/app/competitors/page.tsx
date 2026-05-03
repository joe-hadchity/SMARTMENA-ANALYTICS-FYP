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
      toast.success(`${res.candidates.length} real candidate(s) found`);
      setTab("suggestions");
    },
    onError: showError,
  });

  const manualM = useMutation({
    mutationFn: () => competitorsApi.manualAdd(manual),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitors"] });
      setManual((prev) => ({ ...prev, handle: "", display_name: "" }));
      toast.success("Competitor verified and approved");
      setTab("approved");
    },
    onError: showError,
  });

  const approveM = useMutation({
    mutationFn: (id: string) => competitorsApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitors"] });
      toast.success("Competitor approved");
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitors"] });
      toast.success("Snapshot refreshed");
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
    if (!candidates.length) return 0;
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
        <Metric label="Avg match" value={`${Math.round(avgScore)}%`} icon={<Globe2 className="h-4 w-4" />} />
      </div>

      <ImprovedComparisonCard
        data={comparisonQ.data}
        loading={comparisonQ.isLoading}
        fetching={comparisonQ.isFetching}
        windowDays={windowDays}
        locale={locale}
        onWindowChange={setWindowDays}
        onRefresh={() => comparisonQ.refetch()}
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
            loading={fetching}
            leftIcon={<RefreshCcw className="h-3.5 w-3.5" />}
          >
            Refresh
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
                    <span>{benchmark?.evidence_coverage.competitors_with_posts || 0} with posts</span>
                    <span>{benchmark?.evidence_coverage.competitors_with_snapshots || 0} snapshots</span>
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
                value={formatPercent(competitors?.avg_engagement_rate, 2, locale)}
                helper={`${formatNumber(competitors?.competitor_count || 0, locale)} profiles / ${formatNumber(competitors?.avg_posts_per_week || 0, locale)} posts per week`}
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
                  competitors?.avg_followers == null
                    ? "-"
                    : formatNumber(competitors.avg_followers, locale)
                }
                helper={`${formatNumber(competitors?.evidence_count || 0, locale)} public evidence items`}
              />
            </div>

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
              <TopPostPanel title="Your strongest post" post={own?.top_post} locale={locale} />
              <TopPostPanel title="Competitor strongest post" post={competitors?.top_post} locale={locale} />
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
      <div className="text-end tabular-nums">{formatNumber(posts, locale)}</div>
      <div className="text-end tabular-nums">{formatPercent(avgRate, 2, locale)}</div>
      <div className="text-end tabular-nums">{formatNumber(engagementPerPost, locale)}</div>
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
  post,
  locale,
}: {
  title: string;
  post?: CompetitorComparisonResponse["own"]["top_post"];
  locale: "en" | "ar";
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-4 shadow-xs">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">{title}</div>
        {post?.media_type ? (
          <Badge tone="neutral" size="sm">
            {formatLabel(post.media_type)}
          </Badge>
        ) : null}
      </div>
      {post ? (
        <>
          <p className="line-clamp-2 text-sm leading-relaxed text-fg-muted">
            {post.caption || "No caption captured."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
            <span>{formatNumber(post.engagement_total || 0, locale)} engagement</span>
            <span>{formatPercent(post.engagement_rate, 2, locale)} ER</span>
            <span>{post.published_at ? formatDate(post.published_at, locale) : "No date"}</span>
            {post.url ? (
              <a
                href={post.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Open <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        </>
      ) : (
        <div className="text-sm text-fg-muted">No top post available in this window.</div>
      )}
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
          <CardDescription>Verify an exact username or profile URL before saving.</CardDescription>
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
            Verify and approve
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DiscoveryCard({
  value,
  loading,
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
