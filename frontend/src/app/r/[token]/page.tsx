"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ExternalLink,
  LineChart as LineChartIcon,
  Printer,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { useI18n } from "@/i18n/I18nProvider";
import { reportsApi, type SharedGrowthReport } from "@/lib/api";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function SharedReportPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const { t, locale } = useI18n();

  const shareQ = useQuery({
    queryKey: ["shared-report", token],
    queryFn: () => reportsApi.getShared(String(token)),
    enabled: !!token,
    retry: false,
  });

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-bg-elevated">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg gradient-tile grid place-items-center text-white font-bold shadow-sm">
            S
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">SmartMENA Analytics</div>
            <div className="text-[10px] text-fg-subtle leading-tight uppercase tracking-wider">
              {t("reports.share.public.badge")}
            </div>
          </div>
          <div className="ms-auto flex items-center gap-2 no-print">
            <Button
              variant="outline"
              size="sm"
              onClick={() => typeof window !== "undefined" && window.print()}
              leftIcon={<Printer className="h-3.5 w-3.5" />}
            >
              {t("reports.growth.print")}
            </Button>
            <Button
              size="sm"
              asChild
              leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
            >
              <Link href="/">Try SmartMENA</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6 report-surface">
        {shareQ.isLoading ? (
          <div className="h-48 rounded-xl border border-border bg-surface animate-pulse" />
        ) : null}

        {shareQ.isError ? (
          <ShareErrorCard error={shareQ.error as Error | undefined} />
        ) : null}

        {shareQ.data ? <SharedBody data={shareQ.data} /> : null}

        <div className="text-[11px] text-fg-subtle text-center no-print">
          {t("reports.share.public.note")}
        </div>
        <div className="text-[11px] text-fg-subtle text-center" dir={locale === "ar" ? "rtl" : undefined}>
          SmartMENA Analytics · © {new Date().getFullYear()}
        </div>
      </main>
    </div>
  );
}

function ShareErrorCard({ error }: { error?: Error }) {
  const { t } = useI18n();
  const status = (error as (Error & { status?: number }) | undefined)?.status;
  const message =
    status === 404
      ? t("reports.share.notFound")
      : status === 410
        ? t("reports.share.expired")
        : error?.message || t("reports.share.notFound");

  return (
    <Card>
      <CardContent className="p-10 text-center">
        <div className="mx-auto h-12 w-12 rounded-xl bg-surface-muted text-fg-muted grid place-items-center">
          <LineChartIcon className="h-6 w-6" />
        </div>
        <h2 className="mt-3 text-lg font-semibold text-fg">{message}</h2>
        <p className="mt-2 text-sm text-fg-muted max-w-md mx-auto">
          {t("reports.share.public.note")}
        </p>
      </CardContent>
    </Card>
  );
}

function SharedBody({ data }: { data: SharedGrowthReport }) {
  const { t, locale } = useI18n();
  const report = data.report;
  const narrative = report.narrative;
  const agg = report.aggregate;
  const isAr = data.locale === "ar";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="info">{data.locale.toUpperCase()}</Badge>
        <span className="text-xs text-fg-subtle">
          {t("reports.growth.generatedAt")}: {formatDate(report.generated_at, locale)}
        </span>
        {data.expires_at ? (
          <span className="text-xs text-fg-subtle ms-auto">
            {t("reports.growth.shares.expires")}: {formatDate(data.expires_at, locale)}
          </span>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle>{t("reports.growth.section.summary")}</CardTitle>
          </div>
          <CardDescription>
            {agg.workspace?.name ?? "—"}{" "}
            {agg.workspace?.primary_region
              ? `· ${agg.workspace.primary_region}`
              : ""}
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
            {(isAr ? narrative.executive_summary_ar : narrative.executive_summary_en) || "—"}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi
          label={t("overview.kpi.accounts")}
          value={formatNumber(agg.totals?.connectedAccounts ?? 0, locale)}
        />
        <Kpi
          label={t("overview.kpi.posts")}
          value={formatNumber(agg.totals?.socialPosts ?? 0, locale)}
        />
        <Kpi
          label={t("overview.kpi.reach")}
          value={formatNumber(agg.totals?.totalReach ?? 0, locale)}
        />
        <Kpi
          label={t("overview.kpi.engagements")}
          value={formatNumber(agg.totals?.totalEngagements ?? 0, locale)}
        />
        <Kpi
          label={t("overview.kpi.engagementRate")}
          value={formatPercent(agg.totals?.avgEngagementRate ?? 0, 2, locale)}
        />
      </div>

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

      {(isAr ? narrative.recommended_actions_ar : narrative.recommended_actions_en)
        ?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.growth.section.actions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ol
              className={cn("space-y-2 text-sm text-fg", isAr && "text-right")}
              dir={isAr ? "rtl" : undefined}
            >
              {(isAr
                ? narrative.recommended_actions_ar
                : narrative.recommended_actions_en
              ).map((a, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 h-6 w-6 rounded-full bg-primary-soft text-primary grid place-items-center text-xs font-semibold">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{a}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}

      {agg.platform?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.growth.section.platforms")}</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-fg-subtle">
                  <th className="py-2 text-start">Platform</th>
                  <th className="py-2 text-end">Posts</th>
                  <th className="py-2 text-end">Reach</th>
                  <th className="py-2 text-end">Engagements</th>
                </tr>
              </thead>
              <tbody>
                {agg.platform.map((p) => (
                  <tr key={p.provider} className="border-t border-border">
                    <td className="py-2 font-medium text-fg">{p.provider}</td>
                    <td className="py-2 text-end">
                      {formatNumber(p.posts, locale)}
                    </td>
                    <td className="py-2 text-end">
                      {formatNumber(p.reach, locale)}
                    </td>
                    <td className="py-2 text-end">
                      {formatNumber(p.engagements, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </>
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
