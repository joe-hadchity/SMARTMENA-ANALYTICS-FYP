"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Lightbulb, Calendar, Clock, Languages, TrendingUp } from "lucide-react";

import PageHeader from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import { useI18n } from "@/i18n/I18nProvider";
import { recommendationsApi } from "@/lib/api";

const PLATFORMS = ["instagram", "facebook", "tiktok", "x"] as const;
const REGIONS = ["LB", "AE", "SA", "EG", "JO"] as const;
const CONTENT_TYPES = ["image", "video", "carousel", "reel", "story"] as const;

const schema = z.object({
  platform: z.enum(PLATFORMS),
  region: z.enum(REGIONS),
  contentType: z.enum(CONTENT_TYPES).optional(),
  budget: z.coerce.number().positive().optional(),
  audienceSize: z.coerce.number().int().positive().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function RecommendationsPage() {
  const { t, locale } = useI18n();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      platform: "instagram",
      region: "AE",
      contentType: "reel",
      budget: 500,
      audienceSize: 20000,
    },
  });

  const run = useMutation({
    mutationFn: (values: FormValues) => recommendationsApi.mena(values),
  });

  const onSubmit = (values: FormValues) => run.mutate(values);
  const rec = run.data;

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title={t("recommendations.title")}
        subtitle={t("recommendations.subtitle")}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <label className="label">
                {t("recommendations.form.platform")}
              </label>
              <select className="input mt-1" {...register("platform")}>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("recommendations.form.region")}</label>
              <select className="input mt-1" {...register("region")}>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">
                {t("recommendations.form.contentType")}
              </label>
              <select className="input mt-1" {...register("contentType")}>
                {CONTENT_TYPES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">
                  {t("recommendations.form.budget")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input mt-1"
                  {...register("budget")}
                />
              </div>
              <div>
                <label className="label">
                  {t("recommendations.form.audience")}
                </label>
                <input
                  type="number"
                  className="input mt-1"
                  {...register("audienceSize")}
                />
              </div>
            </div>
            {Object.keys(errors).length > 0 ? (
              <p className="text-xs text-danger">
                {Object.values(errors)[0]?.message as string}
              </p>
            ) : null}
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={run.isPending}
            >
              <Lightbulb className="h-4 w-4" />
              {t("recommendations.form.submit")}
            </button>
          </form>
        </Card>

        <div className="lg:col-span-3 space-y-4">
          {!rec ? (
            <Card>
              <div className="text-center text-fg-muted py-10 text-sm">
                {t("common.empty")}
              </div>
            </Card>
          ) : (
            <>
              <Card>
                <CardTitle>{t("recommendations.result.windows")}</CardTitle>
                <div className="flex flex-col gap-2">
                  {rec.bestPostingWindows.map((w, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-brand-600" />
                      <span className="font-medium">
                        {locale === "ar" ? w.label_ar : w.label_en}
                      </span>
                      {i === 0 ? <Chip tone="green">primary</Chip> : null}
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <CardTitle>{t("recommendations.result.langMix")}</CardTitle>
                <div className="flex items-center gap-2 mb-3">
                  <Languages className="h-4 w-4 text-brand-600" />
                  <Chip tone="brand">{rec.languageMix.arabicPct}% AR</Chip>
                  <Chip>{rec.languageMix.englishPct}% EN</Chip>
                  <Chip tone="green">
                    +{rec.languageMix.mixedBonusPct}% mixed bonus
                  </Chip>
                </div>
                <p className="text-sm text-fg-muted">
                  {locale === "ar"
                    ? rec.languageMix.guidance_ar
                    : rec.languageMix.guidance_en}
                </p>
              </Card>

              {rec.nearestEvent ? (
                <Card>
                  <CardTitle>{t("recommendations.result.event")}</CardTitle>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-brand-600" />
                    <span className="font-medium">
                      {locale === "ar"
                        ? rec.nearestEvent.name_ar
                        : rec.nearestEvent.name_en}
                    </span>
                    <Chip
                      tone={
                        rec.nearestEvent.distanceDays >= 0 &&
                        rec.nearestEvent.distanceDays <= 14
                          ? "green"
                          : "neutral"
                      }
                    >
                      {rec.nearestEvent.distanceDays === 0
                        ? "today"
                        : rec.nearestEvent.distanceDays > 0
                          ? `in ${rec.nearestEvent.distanceDays} day(s)`
                          : `${Math.abs(rec.nearestEvent.distanceDays)} day(s) ago`}
                    </Chip>
                  </div>
                  <p className="text-sm text-fg-muted">
                    {locale === "ar"
                      ? rec.nearestEvent.notes_ar
                      : rec.nearestEvent.notes_en}
                  </p>
                </Card>
              ) : null}

              <Card>
                <CardTitle>{t("recommendations.result.roi")}</CardTitle>
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-brand-600" />
                  <div className="font-numeric text-2xl font-semibold">
                    {rec.roiForecast.predictedRoi != null
                      ? `${rec.roiForecast.predictedRoi.toFixed(2)}x`
                      : "—"}
                  </div>
                  {rec.roiForecast.roiLow != null &&
                  rec.roiForecast.roiHigh != null ? (
                    <div className="font-numeric text-sm text-fg-muted">
                      ({rec.roiForecast.roiLow.toFixed(2)} ·{" "}
                      {rec.roiForecast.roiHigh.toFixed(2)})
                    </div>
                  ) : null}
                </div>
                {rec.roiForecast.confidenceScore != null ? (
                  <div className="mt-2 text-xs text-fg-muted">
                    confidence:{" "}
                    <span className="font-numeric">{(rec.roiForecast.confidenceScore * 100).toFixed(0)}%</span>
                  </div>
                ) : null}
                {rec.roiForecast.unavailableReason ? (
                  <div className="text-xs text-warning mt-2">
                    {rec.roiForecast.unavailableReason}
                  </div>
                ) : null}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
