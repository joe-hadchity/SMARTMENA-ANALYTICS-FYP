"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useState } from "react";

import PageHeader from "@/components/ui/PageHeader";
import { Card, EmptyState } from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import { useI18n } from "@/i18n/I18nProvider";
import { insightsApi } from "@/lib/api";
import { formatDate } from "@/lib/format";

const TYPES = [
  "all",
  "sentiment_summary",
  "performance_anomaly",
  "content_recommendation",
  "best_posting_time",
  "mena_trend",
] as const;
const SEVERITIES = ["all", "info", "warning", "opportunity"] as const;

export default function InsightsPage() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [type, setType] = useState<(typeof TYPES)[number]>("all");
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>("all");

  const q = useQuery({
    queryKey: ["insights", { type, severity }],
    queryFn: () =>
      insightsApi.list({
        insightType: type === "all" ? undefined : type,
        severity: severity === "all" ? undefined : severity,
        limit: 100,
      }),
  });

  const generate = useMutation({
    mutationFn: () => insightsApi.generate(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["insights"] }),
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title={t("insights.title")}
        subtitle={t("insights.subtitle")}
        actions={
          <button
            className="btn btn-primary"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
          >
            <Sparkles className="h-4 w-4" />
            {t("insights.generate")}
          </button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="label mb-1">{t("insights.filter.type")}</div>
            <select
              className="input"
              value={type}
              onChange={(e) =>
                setType(e.target.value as (typeof TYPES)[number])
              }
            >
              {TYPES.map((k) => (
                <option key={k} value={k}>
                  {k === "all" ? t("insights.filter.any") : k}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="label mb-1">{t("insights.filter.severity")}</div>
            <select
              className="input"
              value={severity}
              onChange={(e) =>
                setSeverity(e.target.value as (typeof SEVERITIES)[number])
              }
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? t("insights.filter.any") : t(`insights.severity.${s}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {q.data && q.data.length === 0 ? (
        <Card>
          <EmptyState
            title={t("insights.empty")}
            cta={
              <button
                className="btn btn-primary"
                onClick={() => generate.mutate()}
                disabled={generate.isPending}
              >
                <Sparkles className="h-4 w-4" />
                {t("insights.generate")}
              </button>
            }
          />
        </Card>
      ) : null}

      <div className="space-y-3">
        {q.data?.map((i) => {
          const title = locale === "ar" ? i.title_ar : i.title_en;
          const body = locale === "ar" ? i.body_ar : i.body_en;
          const isAzure =
            i.model_version?.startsWith("azure-openai") ||
            i.data?.source === "azure_openai";
          const tone: "amber" | "green" | "neutral" =
            i.severity === "warning"
              ? "amber"
              : i.severity === "opportunity"
                ? "green"
                : "neutral";
          return (
            <Card key={i.id}>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Chip tone={tone}>
                  {t(`insights.severity.${i.severity}`)}
                </Chip>
                {isAzure ? <Chip tone="green">Azure AI</Chip> : null}
                <Chip>{i.insight_type}</Chip>
                <span className="ms-auto text-[11px] text-fg-subtle">
                  {formatDate(i.generated_at, locale)}
                </span>
              </div>
              <div className="mt-2 text-base font-semibold">{title}</div>
              {body ? (
                <p className="mt-1 text-sm text-fg-muted">{body}</p>
              ) : null}
              {i.confidence != null ? (
                <div className="mt-3 text-[11px] text-fg-muted">
                  confidence: <span className="font-numeric">{(Number(i.confidence) * 100).toFixed(0)}%</span>
                </div>
              ) : null}
              <details className="mt-3 text-xs text-fg-muted">
                <summary className="cursor-pointer">evidence</summary>
                <pre className="mt-2 bg-surface-muted p-2 rounded overflow-auto max-h-64">
                  {JSON.stringify(i.data, null, 2)}
                </pre>
              </details>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
