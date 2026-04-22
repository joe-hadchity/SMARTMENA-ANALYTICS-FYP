"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { useI18n } from "@/i18n/I18nProvider";
import { campaignsApi } from "@/lib/api";

const PLATFORMS = ["instagram", "facebook", "tiktok", "x", "google"] as const;
const CONTENT_TYPES = ["image", "video", "carousel", "reel", "story"] as const;
const REGIONS = ["LB", "AE", "SA", "EG", "JO"] as const;

const schema = z.object({
  campaign_name: z.string().min(1).max(200),
  platform: z.enum(PLATFORMS),
  budget: z.coerce.number().positive(),
  audience_size: z.coerce.number().int().positive().optional(),
  content_type: z.enum(CONTENT_TYPES).optional(),
  posting_time: z.string().optional(),
  region: z.enum(REGIONS).optional(),
  user_id: z.string().uuid(),
});

type FormValues = z.infer<typeof schema>;

export default function NewCampaignPage() {
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      platform: "instagram",
      content_type: "reel",
      region: "AE",
    },
  });

  const create = useMutation({
    mutationFn: (values: FormValues) =>
      campaignsApi.create({
        ...values,
        posting_time: values.posting_time
          ? new Date(values.posting_time).toISOString()
          : undefined,
      }),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      router.push(`/campaigns/${created.id}`);
    },
  });

  const onSubmit = (values: FormValues) => create.mutate(values);

  return (
    <div className="max-w-2xl">
      <PageHeader title={t("campaigns.new")} />

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">{t("campaigns.form.name")}</label>
            <input className="input mt-1" {...register("campaign_name")} />
            {errors.campaign_name ? (
              <p className="text-xs text-danger mt-1">
                {errors.campaign_name.message as string}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t("campaigns.form.platform")}</label>
              <select className="input mt-1" {...register("platform")}>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("campaigns.form.contentType")}</label>
              <select className="input mt-1" {...register("content_type")}>
                {CONTENT_TYPES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("campaigns.form.budget")}</label>
              <input
                type="number"
                step="0.01"
                className="input mt-1"
                {...register("budget")}
              />
              {errors.budget ? (
                <p className="text-xs text-danger mt-1">
                  {errors.budget.message as string}
                </p>
              ) : null}
            </div>
            <div>
              <label className="label">{t("campaigns.form.audience")}</label>
              <input
                type="number"
                className="input mt-1"
                {...register("audience_size")}
              />
            </div>
            <div>
              <label className="label">{t("campaigns.form.postingTime")}</label>
              <input
                type="datetime-local"
                className="input mt-1"
                {...register("posting_time")}
              />
            </div>
            <div>
              <label className="label">{t("campaigns.form.region")}</label>
              <select className="input mt-1" {...register("region")}>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">{t("campaigns.form.userId")}</label>
            <input
              className="input mt-1"
              placeholder="00000000-0000-0000-0000-000000000000"
              {...register("user_id")}
            />
            {errors.user_id ? (
              <p className="text-xs text-danger mt-1">
                {errors.user_id.message as string}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => router.back()}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || create.isPending}
            >
              {t("common.create")}
            </button>
          </div>

          {create.isError ? (
            <p className="text-sm text-danger">
              {(create.error as Error).message}
            </p>
          ) : null}
        </form>
      </Card>
    </div>
  );
}
