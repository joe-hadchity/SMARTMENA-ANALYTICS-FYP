"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Link as LinkIcon,
  LineChart,
  Printer,
  RefreshCw,
  Share2,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import PageHeader from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { useI18n } from "@/i18n/I18nProvider";
import { reportsApi, type GrowthReport, type ReportShare } from "@/lib/api";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function GrowthReportPage() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [narrativeLocale, setNarrativeLocale] = useState<"en" | "ar">(locale);

  const reportQ = useQuery({
    queryKey: ["reports", "growth", narrativeLocale],
    queryFn: () => reportsApi.growth(narrativeLocale),
    staleTime: 60_000,
  });

  const sharesQ = useQuery({
    queryKey: ["reports", "shares"],
    queryFn: reportsApi.listShares,
  });

  const createShare = useMutation({
    mutationFn: (input: { locale: "en" | "ar"; expiresInDays?: number }) =>
      reportsApi.share(input),
    onSuccess: async (share) => {
      await qc.invalidateQueries({ queryKey: ["reports", "shares"] });
      try {
        const url = buildShareUrl(share.token);
        await navigator.clipboard.writeText(url);
        toast.success(t("reports.growth.copied"));
      } catch {
        toast.error(t("reports.growth.copyError"));
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Error";
      toast.error(msg);
    },
  });

  const revoke = useMutation({
    mutationFn: (shareId: string) => reportsApi.revokeShare(shareId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["reports", "shares"] }),
  });

  const report = reportQ.data;

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        eyebrow={t("reports.growth.eyebrow")}
        title={t("reports.growth.title")}
        subtitle={t("reports.growth.subtitle")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="no-print flex items-center gap-2">
              <Label className="text-xs text-fg-muted m-0">
                {t("reports.growth.localeLabel")}
              </Label>
              <Select
                value={narrativeLocale}
                onChange={(e) =>
                  setNarrativeLocale(e.target.value as "en" | "ar")
                }
                className="h-8 py-0"
              >
                <option value="en">{t("reports.growth.locale.en")}</option>
                <option value="ar">{t("reports.growth.locale.ar")}</option>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => reportQ.refetch()}
              loading={reportQ.isFetching}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              className="no-print"
            >
              {t("reports.growth.regenerate")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => typeof window !== "undefined" && window.print()}
              leftIcon={<Printer className="h-3.5 w-3.5" />}
              className="no-print"
            >
              {t("reports.growth.print")}
            </Button>
            <Button
              size="sm"
              onClick={() =>
                createShare.mutate({
                  locale: narrativeLocale,
                })
              }
              loading={createShare.isPending}
              leftIcon={<Share2 className="h-3.5 w-3.5" />}
              className="no-print"
            >
              {t("reports.growth.share")}
            </Button>
          </div>
        }
      />

      {reportQ.isLoading ? <ReportSkeleton /> : null}

      {reportQ.isError ? (
        <Card>
          <CardContent className="p-8 text-center text-fg-muted">
            {(reportQ.error as Error | undefined)?.message ||
              t("reports.growth.empty")}
          </CardContent>
        </Card>
      ) : null}

      {report ? (
        <ReportBody
          report={report}
          narrativeLocale={narrativeLocale}
        />
      ) : null}

      <SharesCard
        shares={sharesQ.data ?? []}
        onRevoke={(id) => revoke.mutate(id)}
        isRevokingId={revoke.variables}
        isRevoking={revoke.isPending}
      />
    </div>
  );
}

function buildShareUrl(token: string) {
  if (typeof window === "undefined") return `/r/${token}`;
  return `${window.location.origin}/r/${token}`;
}

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="h-32 rounded-xl border border-border bg-surface animate-pulse"
        />
      ))}
    </div>
  );
}

function ReportBody({
  report,
  narrativeLocale,
}: {
  report: GrowthReport;
  narrativeLocale: "en" | "ar";
}) {
  const { t, locale } = useI18n();

  const narrative = report.narrative;
  const isAr = narrativeLocale === "ar";
  const summaryText = isAr
    ? narrative.executive_summary_ar
    : narrative.executive_summary_en;
  const actions = isAr
    ? narrative.recommended_actions_ar
    : narrative.recommended_actions_en;

  const isFallback = narrative._source === "fallback";
  const llmError = narrative._llm_error;

  const agg = report.aggregate;

  const totalPosts = agg.totals?.socialPosts ?? 0;
  const totalReach = agg.totals?.totalReach ?? 0;
  const totalEng = agg.totals?.totalEngagements ?? 0;
  const avgEngRate = agg.totals?.avgEngagementRate ?? 0;
  const totalFollowers = agg.totals?.totalFollowers ?? 0;

  return (
    <div className="space-y-6 report-surface">
      {/* Workspace + source badge */}
      <div className="flex flex-wrap items-center gap-2 no-print">
        <Badge tone={isFallback ? "warning" : "success"}>
          {isFallback
            ? t("reports.growth.fallbackNote")
            : t("compose.source.llm", "Azure OpenAI")}
        </Badge>
        {llmError && !isFallback ? (
          <Badge tone="warning" title={llmError}>
            <AlertTriangle className="h-3 w-3" />
            {t("reports.growth.llmError")}
          </Badge>
        ) : null}
        <span className="text-xs text-fg-subtle ms-auto">
          {t("reports.growth.generatedAt")}: {formatDate(report.generated_at, locale)}
        </span>
      </div>

      {/* Executive summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle>{t("reports.growth.section.summary")}</CardTitle>
          </div>
          <CardDescription>
            {agg.workspace?.name ?? "—"} ·{" "}
            {agg.workspace?.primary_region ||
              agg.workspace?.region_default ||
              "MENA"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              "whitespace-pre-wrap text-[15px] leading-relaxed text-fg",
              isAr && "text-right",
            )}
            dir={isAr ? "rtl" : undefined}
          >
            {summaryText || "—"}
          </p>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi
          label={t("overview.kpi.accounts")}
          value={formatNumber(agg.totals?.connectedAccounts ?? 0, locale)}
        />
        <Kpi
          label={t("overview.kpi.posts")}
          value={formatNumber(totalPosts, locale)}
        />
        <Kpi
          label={t("overview.kpi.reach")}
          value={formatNumber(totalReach, locale)}
        />
        <Kpi
          label={t("overview.kpi.engagements")}
          value={formatNumber(totalEng, locale)}
        />
        <Kpi
          label={t("overview.kpi.engagementRate")}
          value={formatPercent(avgEngRate, 2, locale)}
        />
      </div>
      {totalFollowers > 0 ? (
        <div className="text-xs text-fg-subtle text-end no-print">
          {formatNumber(totalFollowers, locale)}{" "}
          {locale === "ar" ? "متابع" : "followers tracked"}
        </div>
      ) : null}

      {/* Highlights (LLM-provided) */}
      {narrative.highlights?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.growth.section.highlights")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {narrative.highlights.map((h, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-surface px-4 py-3"
                >
                  <div className="text-[10px] uppercase tracking-wider text-fg-subtle">
                    {isAr ? h.label_ar || h.label_en : h.label_en || h.label_ar}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-fg">
                    {h.value}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Recommended actions */}
      {actions?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.growth.section.actions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ol
              className={cn(
                "space-y-2 text-sm text-fg",
                isAr && "text-right",
              )}
              dir={isAr ? "rtl" : undefined}
            >
              {actions.map((a, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className={cn(
                      "shrink-0 h-6 w-6 rounded-full bg-primary-soft text-primary",
                      "grid place-items-center text-xs font-semibold",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{a}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}

      {/* Platforms */}
      {agg.platform?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.growth.section.platforms")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-fg-subtle text-start">
                    <th className="py-2 text-start">Platform</th>
                    <th className="py-2 text-end">Posts</th>
                    <th className="py-2 text-end">Reach</th>
                    <th className="py-2 text-end">Impressions</th>
                    <th className="py-2 text-end">Engagements</th>
                  </tr>
                </thead>
                <tbody>
                  {agg.platform.map((p) => (
                    <tr
                      key={p.provider}
                      className="border-t border-border"
                    >
                      <td className="py-2 font-medium text-fg">
                        {p.provider}
                      </td>
                      <td className="py-2 text-end">
                        {formatNumber(p.posts, locale)}
                      </td>
                      <td className="py-2 text-end">
                        {formatNumber(p.reach, locale)}
                      </td>
                      <td className="py-2 text-end">
                        {formatNumber(p.impressions, locale)}
                      </td>
                      <td className="py-2 text-end">
                        {formatNumber(p.engagements, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Top posts */}
      {agg.topPosts?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.growth.section.topPosts")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {agg.topPosts.slice(0, 5).map((p) => {
                const er = p.latest_metrics?.engagement_rate;
                return (
                  <li
                    key={p.id}
                    className="flex items-start gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="shrink-0 h-8 w-8 rounded-lg bg-primary-soft text-primary grid place-items-center">
                      <LineChart className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-fg line-clamp-2">
                        {p.caption || "—"}
                      </div>
                      <div className="mt-0.5 text-xs text-fg-subtle">
                        {p.post_type ?? "post"} ·{" "}
                        {formatDate(p.posted_at, locale)}
                      </div>
                    </div>
                    <div className="text-xs text-fg-muted text-end">
                      <div>
                        {formatNumber(p.engagement, locale)}{" "}
                        <span className="text-fg-subtle">eng.</span>
                      </div>
                      {er != null ? (
                        <div>{formatPercent(Number(er), 2, locale)}</div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* Latest insights */}
      {agg.insights?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.growth.section.insights")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {agg.insights.slice(0, 6).map((i, idx) => (
                <li
                  key={idx}
                  className="rounded-md border border-border bg-surface px-3 py-2"
                >
                  <div className="flex items-start gap-2">
                    <Badge
                      tone={
                        i.severity === "opportunity"
                          ? "success"
                          : i.severity === "warning"
                            ? "warning"
                            : "info"
                      }
                      size="sm"
                    >
                      {i.severity}
                    </Badge>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-fg">
                        {i.title}
                      </div>
                      {i.summary ? (
                        <div className="text-xs text-fg-muted">
                          {i.summary}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* Accounts */}
      {agg.accountsBreakdown?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.growth.section.accounts")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {agg.accountsBreakdown.map((a) => (
                <div
                  key={a.social_account_id}
                  className="rounded-xl border border-border bg-surface px-4 py-3"
                >
                  <div className="text-sm font-medium text-fg">
                    {a.display_name || a.handle}{" "}
                    <span className="text-fg-subtle">@{a.handle}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-fg-muted uppercase tracking-wider">
                    {a.platform}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-fg-muted">
                    <span>
                      {formatNumber(a.followers_count, locale)} followers
                    </span>
                    <span>·</span>
                    <span>{formatNumber(a.posts_count, locale)} posts</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-fg-subtle">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-fg">{value}</div>
    </div>
  );
}

function SharesCard({
  shares,
  onRevoke,
  isRevokingId,
  isRevoking,
}: {
  shares: ReportShare[];
  onRevoke: (id: string) => void;
  isRevokingId?: string;
  isRevoking: boolean;
}) {
  const { t, locale } = useI18n();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeShares = useMemo(
    () =>
      shares.filter((s) => {
        if (s.revoked) return false;
        if (s.expires_at && new Date(s.expires_at) < new Date()) return false;
        return true;
      }),
    [shares],
  );

  const copy = async (token: string) => {
    try {
      const url = buildShareUrl(token);
      await navigator.clipboard.writeText(url);
      setCopiedId(token);
      toast.success(t("reports.growth.copied"));
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast.error(t("reports.growth.copyError"));
    }
  };

  return (
    <Card className="no-print">
      <CardHeader>
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-primary" />
          <CardTitle>{t("reports.growth.shares.title")}</CardTitle>
        </div>
        <CardDescription>
          {t("reports.growth.shares.createHint")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activeShares.length === 0 ? (
          <div className="text-sm text-fg-muted">
            {t("reports.growth.shares.empty")}
          </div>
        ) : (
          <ul className="space-y-2">
            {activeShares.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2"
              >
                <Badge tone="info" size="sm">
                  {s.locale.toUpperCase()}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-mono text-fg truncate">
                    /r/{s.token}
                  </div>
                  <div className="text-[11px] text-fg-subtle">
                    {formatDate(s.created_at, locale)} ·{" "}
                    {s.expires_at
                      ? `${t("reports.growth.shares.expires")} ${formatDate(
                          s.expires_at,
                          locale,
                        )}`
                      : t("reports.growth.shares.never")}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copy(s.token)}
                  leftIcon={
                    copiedId === s.token ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )
                  }
                >
                  {copiedId === s.token
                    ? t("compose.copied", "Copied")
                    : t("compose.copy", "Copy")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRevoke(s.id)}
                  loading={isRevoking && isRevokingId === s.id}
                  leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                >
                  {t("reports.growth.shares.revoke")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// Silence unused imports that are reserved for possible future UI hooks.
void Download;
void Input;
void XCircle;
