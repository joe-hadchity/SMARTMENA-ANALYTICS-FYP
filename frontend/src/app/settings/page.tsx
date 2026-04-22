"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import PageHeader from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import BrandVoiceForm from "@/components/settings/BrandVoiceForm";
import DemoDataCard from "@/components/settings/DemoDataCard";
import { useI18n } from "@/i18n/I18nProvider";
import {
  healthApi,
  setStoredWorkspaceId,
  workspacesApi,
} from "@/lib/api";
import { formatDate } from "@/lib/format";

const REGIONS = ["LB", "AE", "SA", "EG", "JO", "QA", "KW", "OM", "BH", "MA"] as const;
const LOCALES = ["ar", "en"] as const;

const schema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "lowercase letters, digits and hyphens only")
    .optional(),
  region_default: z.enum(REGIONS).optional(),
  locale_default: z.enum(LOCALES).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function SettingsPage() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();

  const current = useQuery({
    queryKey: ["workspace", "current"],
    queryFn: workspacesApi.current,
  });
  const list = useQuery({
    queryKey: ["workspaces"],
    queryFn: workspacesApi.list,
  });
  const health = useQuery({
    queryKey: ["health"],
    queryFn: healthApi.check,
    refetchInterval: 60_000,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      region_default: "AE",
      locale_default: "ar",
    },
  });

  const create = useMutation({
    mutationFn: (values: FormValues) => workspacesApi.create(values),
    onSuccess: (w) => {
      setStoredWorkspaceId(w.id);
      reset();
      qc.invalidateQueries();
    },
  });

  const onSubmit = (values: FormValues) => create.mutate(values);

  const llm = health.data?.features?.llm;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>{t("settings.llm.title")}</CardTitle>
          <Badge tone={llm?.enabled ? "success" : "warning"} dot>
            {llm?.enabled
              ? t("settings.llm.enabled")
              : t("settings.llm.disabled")}
          </Badge>
        </div>
        {llm?.enabled ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="label">{t("settings.llm.deployment")}</div>
              <div className="mt-1 font-medium">{llm.deployment}</div>
            </div>
            <div>
              <div className="label">{t("settings.llm.apiVersion")}</div>
              <div className="mt-1 font-medium">{llm.apiVersion}</div>
            </div>
            <div>
              <div className="label">{t("settings.llm.budget")}</div>
              <div className="mt-1 font-medium">
                {llm.monthlyTokenBudget.toLocaleString()} tokens / mo
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-fg-muted mt-3">
            {t("settings.llm.disabled")}
          </p>
        )}
      </Card>

      <Card>
        <CardTitle>Active workspace</CardTitle>
        {current.data ? (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="label">{t("settings.name")}</div>
              <div className="mt-1 font-medium">{current.data.name}</div>
            </div>
            <div>
              <div className="label">{t("settings.slug")}</div>
              <div className="mt-1 font-medium">{current.data.slug}</div>
            </div>
            <div>
              <div className="label">{t("settings.region")}</div>
              <div className="mt-1 font-medium">
                {current.data.region_default ?? "—"}
              </div>
            </div>
            <div>
              <div className="label">{t("settings.locale")}</div>
              <div className="mt-1 font-medium">
                {current.data.locale_default}
              </div>
            </div>
            <div className="md:col-span-4 text-xs text-fg-muted">
              id: <code>{current.data.id}</code> ·{" "}
              {formatDate(current.data.created_at, locale)}
            </div>
          </div>
        ) : (
          <div className="text-sm text-fg-muted">{t("common.loading")}</div>
        )}
      </Card>

      {current.data ? <BrandVoiceForm workspaceId={current.data.id} /> : null}

      {current.data ? <DemoDataCard workspaceId={current.data.id} /> : null}

      <Card>
        <CardTitle>{t("settings.switch")}</CardTitle>
        <div className="flex items-center gap-2 flex-wrap mt-3">
          {list.data?.map((w) => (
            <button
              key={w.id}
              className="btn btn-secondary text-xs"
              onClick={() => {
                setStoredWorkspaceId(w.id);
                qc.invalidateQueries();
              }}
            >
              {w.name}
            </button>
          ))}
          <button
            className="btn btn-ghost text-xs"
            onClick={() => {
              setStoredWorkspaceId(null);
              qc.invalidateQueries();
            }}
          >
            {t("settings.clearStored")}
          </button>
        </div>
      </Card>

      <Card>
        <CardTitle>{t("settings.create")}</CardTitle>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="label">{t("settings.name")}</label>
            <input className="input mt-1" {...register("name")} />
            {errors.name ? (
              <p className="text-xs text-danger mt-1">
                {errors.name.message as string}
              </p>
            ) : null}
          </div>
          <div>
            <label className="label">{t("settings.slug")}</label>
            <input
              className="input mt-1"
              placeholder="my-brand"
              {...register("slug")}
            />
            {errors.slug ? (
              <p className="text-xs text-danger mt-1">
                {errors.slug.message as string}
              </p>
            ) : null}
          </div>
          <div>
            <label className="label">{t("settings.region")}</label>
            <select className="input mt-1" {...register("region_default")}>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("settings.locale")}</label>
            <select className="input mt-1" {...register("locale_default")}>
              {LOCALES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || create.isPending}
              loading={create.isPending}
            >
              {t("common.create")}
            </Button>
          </div>
          {create.isError ? (
            <p className="md:col-span-2 text-sm text-danger">
              {(create.error as Error).message}
            </p>
          ) : null}
        </form>
      </Card>
    </div>
  );
}
