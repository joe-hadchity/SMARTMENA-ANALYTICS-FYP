"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import PageHeader from "@/components/ui/PageHeader";
import { Card, CardTitle, EmptyState } from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import { useI18n } from "@/i18n/I18nProvider";
import { campaignsApi } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";

export default function CampaignDetailPage() {
  const { t, locale } = useI18n();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const q = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => campaignsApi.getById(id),
    enabled: Boolean(id),
  });

  if (q.isLoading) {
    return <div className="text-sm text-fg-muted">{t("common.loading")}</div>;
  }
  if (q.isError || !q.data) {
    return (
      <div className="text-sm text-danger">
        {(q.error as Error)?.message || "Not found"}
      </div>
    );
  }

  const c = q.data;

  return (
    <div className="space-y-6 max-w-5xl">
      <Link
        href="/campaigns"
        className="btn btn-ghost text-xs -ms-2"
      >
        <ArrowLeft className="h-3 w-3" /> {t("campaigns.detail.back")}
      </Link>

      <PageHeader title={c.campaign_name} subtitle={formatDate(c.created_at, locale)} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="label">{t("campaigns.form.platform")}</div>
          <div className="mt-2 text-lg font-semibold capitalize">
            {c.platform}
          </div>
        </Card>
        <Card>
          <div className="label">{t("campaigns.form.budget")}</div>
          <div className="mt-2 text-lg font-semibold">
            ${formatNumber(c.budget, locale)}
          </div>
        </Card>
        <Card>
          <div className="label">{t("campaigns.form.audience")}</div>
          <div className="mt-2 text-lg font-semibold">
            {c.audience_size ? formatNumber(c.audience_size, locale) : "—"}
          </div>
        </Card>
        <Card>
          <div className="label">{t("campaigns.form.region")}</div>
          <div className="mt-2 text-lg font-semibold">{c.region || "—"}</div>
        </Card>
      </div>

      <Card>
        <CardTitle>{t("campaigns.detail.latestPrediction")}</CardTitle>
        {c.latest_prediction ? (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="label">Predicted ROI</div>
              <div className="mt-1 text-xl font-semibold">
                {Number(c.latest_prediction.predicted_roi).toFixed(2)}x
              </div>
            </div>
            <div>
              <div className="label">Engagement</div>
              <div className="mt-1 text-xl font-semibold">
                {(Number(c.latest_prediction.predicted_engagement) * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="label">Confidence</div>
              <div className="mt-1 text-xl font-semibold">
                {(Number(c.latest_prediction.confidence_score) * 100).toFixed(
                  1,
                )}
                %
              </div>
            </div>
          </div>
        ) : (
          <EmptyState title={t("common.empty")} />
        )}
      </Card>

      <Card>
        <CardTitle>{t("campaigns.detail.posts")}</CardTitle>
        {c.posts.length === 0 ? (
          <EmptyState title={t("common.empty")} />
        ) : (
          <div className="divide-y divide-border">
            {c.posts.map((p) => (
              <div key={p.id} className="py-2 flex items-start gap-3">
                <Chip tone="brand">{p.language}</Chip>
                <div className="flex-1 text-sm">{p.text_content}</div>
                <div className="text-[11px] text-fg-subtle shrink-0">
                  {formatDate(p.created_at, locale)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>{t("campaigns.detail.predictions")}</CardTitle>
        {c.predictions.length === 0 ? (
          <EmptyState title={t("common.empty")} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-fg-muted">
                <th className="text-start py-1">{formatDate(c.created_at, locale)}</th>
                <th className="text-end py-1">ROI</th>
                <th className="text-end py-1">Engagement</th>
                <th className="text-end py-1">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {c.predictions.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="py-2 text-fg-muted text-xs">
                    {formatDate(p.created_at, locale)}
                  </td>
                  <td className="py-2 text-end">
                    {Number(p.predicted_roi).toFixed(2)}x
                  </td>
                  <td className="py-2 text-end">
                    {(Number(p.predicted_engagement) * 100).toFixed(2)}%
                  </td>
                  <td className="py-2 text-end">
                    {(Number(p.confidence_score) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
