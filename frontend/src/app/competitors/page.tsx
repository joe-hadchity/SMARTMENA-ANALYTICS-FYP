"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ExternalLink,
  Plus,
  RefreshCcw,
  Sparkles,
  Swords,
  Trash2,
  Users,
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
  EmptyState,
} from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import PageHeader from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { useI18n } from "@/i18n/I18nProvider";
import {
  competitorsApi,
  type CreateCompetitorInput,
} from "@/lib/api";
import { formatDate, relativeDate } from "@/lib/format";
import type {
  CompetitorAccount,
  CompetitorDigestRun,
  CompetitorSource,
  Provider,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const PLATFORMS: Array<{ value: Provider; label: string }> = [
  { value: "meta_instagram", label: "Instagram" },
  { value: "meta_facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "x", label: "X (Twitter)" },
];

const SOURCES: Array<{ value: CompetitorSource; labelKey: string }> = [
  { value: "manual", labelKey: "competitors.sourceManual" },
  { value: "mock", labelKey: "competitors.sourceMock" },
  { value: "business_discovery", labelKey: "competitors.sourceBd" },
  { value: "ad_library", labelKey: "competitors.sourceAdLib" },
];

export default function CompetitorsPage() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<CompetitorAccount | null>(null);

  const listQ = useQuery({
    queryKey: ["competitors"],
    queryFn: () => competitorsApi.list(),
  });
  const digestQ = useQuery({
    queryKey: ["competitors", "digest", "latest"],
    queryFn: () => competitorsApi.latestDigest(),
  });

  const refreshAll = useMutation({
    mutationFn: () => competitorsApi.refreshAll(),
    onSuccess: (res) => {
      toast.success(`${res.refreshed} competitor(s) refreshed.`);
      qc.invalidateQueries({ queryKey: ["competitors"] });
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Error"),
  });

  const generateDigest = useMutation({
    mutationFn: () =>
      competitorsApi.generateDigest({ window_days: 7, locale }),
    onSuccess: () => {
      toast.success(t("competitors.digest.title"));
      qc.invalidateQueries({ queryKey: ["competitors", "digest"] });
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Error"),
  });

  const refreshOne = useMutation({
    mutationFn: (id: string) => competitorsApi.refresh(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["competitors"] }),
  });

  const removeOne = useMutation({
    mutationFn: (id: string) => competitorsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["competitors"] }),
  });

  const competitors = listQ.data ?? [];

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        eyebrow={<Swords className="h-3.5 w-3.5" />}
        title={t("competitors.title")}
        subtitle={t("competitors.subtitle")}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshAll.mutate()}
              loading={refreshAll.isPending}
              leftIcon={<RefreshCcw className="h-3.5 w-3.5" />}
              disabled={competitors.length === 0}
            >
              {t("competitors.refreshAll")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateDigest.mutate()}
              loading={generateDigest.isPending}
              leftIcon={<Sparkles className="h-3.5 w-3.5" />}
            >
              {t("competitors.generateDigest")}
            </Button>
            <Button
              size="sm"
              onClick={() => setAddOpen(true)}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              {t("competitors.addCta")}
            </Button>
          </div>
        }
      />

      <DigestCard
        run={digestQ.data ?? null}
        isLoading={digestQ.isLoading}
        isRunning={generateDigest.isPending}
      />

      {competitors.length === 0 && !listQ.isLoading ? (
        <Card>
          <EmptyState
            title={t("competitors.emptyTitle")}
            description={t("competitors.emptySubtitle")}
            cta={
              <Button size="sm" onClick={() => setAddOpen(true)} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                {t("competitors.addCta")}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {competitors.map((c) => (
            <CompetitorCard
              key={c.id}
              competitor={c}
              locale={locale}
              onRefresh={() => refreshOne.mutate(c.id)}
              refreshing={refreshOne.isPending && refreshOne.variables === c.id}
              onEdit={() => setEditing(c)}
              onDelete={() => {
                if (confirm(t("competitors.confirmDelete"))) {
                  removeOne.mutate(c.id);
                }
              }}
            />
          ))}
        </div>
      )}

      <CompetitorFormDialog
        mode="create"
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={() => qc.invalidateQueries({ queryKey: ["competitors"] })}
      />
      <CompetitorFormDialog
        mode="edit"
        competitor={editing}
        open={editing !== null}
        onOpenChange={(v) => (!v ? setEditing(null) : null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["competitors"] })}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Digest card
// ---------------------------------------------------------------------------

function DigestCard({
  run,
  isLoading,
  isRunning,
}: {
  run: CompetitorDigestRun | null;
  isLoading: boolean;
  isRunning: boolean;
}) {
  const { t, locale } = useI18n();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-fg-muted">
          {t("common.loading")}
        </CardContent>
      </Card>
    );
  }

  if (!run) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("competitors.digest.title")}</CardTitle>
          <CardDescription>{t("competitors.digest.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-fg-muted">
            {isRunning
              ? t("competitors.digest.running")
              : t("competitors.digest.empty")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const narrative =
    locale === "ar" ? run.narrative_ar : run.narrative_en;
  const highlights = run.highlights || [];
  const summary =
    (run.summary_json as { competitors?: unknown[] } | null)?.competitors ?? [];
  const suggestionsKey =
    locale === "ar" ? "suggested_moves_ar" : "suggested_moves_en";
  const suggestions =
    ((run.summary_json ?? {}) as Record<string, unknown>)[suggestionsKey] as
      | string[]
      | undefined ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle>{t("competitors.digest.title")}</CardTitle>
            <CardDescription>
              {t("competitors.digest.generatedAt")}{" "}
              {formatDate(run.completed_at ?? run.created_at, locale)} · {run.competitor_count}{" "}
              {t("competitors.card.posts")} · {run.post_count}{" "}
              {t("competitors.card.posts")}
            </CardDescription>
          </div>
          <Badge
            tone={
              run.delivery_status === "sent"
                ? "success"
                : run.delivery_status === "failed"
                  ? "danger"
                  : "neutral"
            }
            size="sm"
          >
            {t(`competitors.digest.delivery.${run.delivery_status}`)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {narrative ? (
          <p className="text-sm text-fg" dir={locale === "ar" ? "rtl" : undefined}>
            {narrative}
          </p>
        ) : null}

        {highlights.length ? (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-fg-subtle font-semibold mb-2">
              {t("competitors.digest.highlights")}
            </div>
            <ul className="space-y-2">
              {highlights.map((h, i) => (
                <li
                  key={`${h.competitor_handle}-${i}`}
                  className="rounded-lg border border-border bg-surface px-3 py-2"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone="info" size="sm">
                      @{h.competitor_handle}
                    </Badge>
                    <span className="text-[11px] text-fg-subtle">
                      {h.evidence}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-fg">
                    {locale === "ar" ? h.headline_ar : h.headline_en}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {suggestions.length ? (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-fg-subtle font-semibold mb-2">
              {t("competitors.digest.moves")}
            </div>
            <ul className="list-disc ps-5 text-sm text-fg space-y-1">
              {suggestions.map((s, i) => (
                <li key={i} dir={locale === "ar" ? "rtl" : undefined}>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="text-[11px] text-fg-subtle">
          {Array.isArray(summary) ? `${summary.length} competitor(s) analysed.` : null}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Competitor card
// ---------------------------------------------------------------------------

function CompetitorCard({
  competitor,
  locale,
  onRefresh,
  refreshing,
  onEdit,
  onDelete,
}: {
  competitor: CompetitorAccount;
  locale: "en" | "ar";
  onRefresh: () => void;
  refreshing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const postsQ = useQuery({
    queryKey: ["competitors", competitor.id, "posts"],
    queryFn: () => competitorsApi.posts(competitor.id, 5),
    staleTime: 30_000,
  });

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary-soft text-primary grid place-items-center font-semibold">
            {(competitor.display_name ?? competitor.handle).slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-medium truncate">
                @{competitor.handle}
              </div>
              <Badge tone="neutral" size="sm">
                {competitor.platform.replace("meta_", "")}
              </Badge>
              <Badge
                tone={
                  competitor.source === "business_discovery" ? "success" : "neutral"
                }
                size="sm"
              >
                {competitor.source}
              </Badge>
            </div>
            <div className="text-xs text-fg-muted truncate">
              {competitor.display_name || ""}
            </div>
            <div className="mt-1 flex items-center gap-3 text-[11px] text-fg-subtle">
              {competitor.region ? (
                <span>{competitor.region}</span>
              ) : null}
              {competitor.industry ? (
                <span>· {competitor.industry}</span>
              ) : null}
              {competitor.last_scraped_at ? (
                <span>
                  · {t("competitors.card.lastScraped")}{" "}
                  {relativeDate(competitor.last_scraped_at, locale)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface-muted/50 p-2 text-center">
          <div>
            <div className="text-[11px] text-fg-subtle uppercase tracking-wider">
              {t("competitors.card.posts")}
            </div>
            <div className="text-sm font-semibold">
              {postsQ.data?.length ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-fg-subtle uppercase tracking-wider">
              {t("competitors.card.followers")}
            </div>
            <div className="text-sm font-semibold">
              {(competitor.metadata as { followers_count?: number })
                ?.followers_count ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-fg-subtle uppercase tracking-wider">
              {t("competitors.card.industry")}
            </div>
            <div className="text-sm font-semibold truncate">
              {competitor.industry ?? "—"}
            </div>
          </div>
        </div>

        {postsQ.data?.length ? (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-fg-subtle font-semibold mb-1">
              {t("competitors.posts.title")}
            </div>
            <ul className="space-y-1.5">
              {postsQ.data.slice(0, 3).map((p) => (
                <li
                  key={p.id}
                  className="text-[12px] text-fg line-clamp-2 flex items-start gap-2"
                  dir={p.caption_lang === "ar" ? "rtl" : undefined}
                >
                  {p.media_type ? (
                    <Badge tone="neutral" size="sm">
                      {p.media_type}
                    </Badge>
                  ) : null}
                  <span className="truncate">{p.caption || "(no caption)"}</span>
                  {p.permalink ? (
                    <a
                      href={p.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-fg-muted hover:text-fg shrink-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-[12px] text-fg-subtle">
            {t("competitors.posts.empty")}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCcw className="h-3 w-3" />}
            onClick={onRefresh}
            loading={refreshing}
          >
            {t("competitors.card.refresh")}
          </Button>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit} leftIcon={<Users className="h-3 w-3" />}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              leftIcon={<Trash2 className="h-3 w-3" />}
              className={cn("text-danger")}
            >
              {/* we reuse the confirm dialog */}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Form dialog (create + edit)
// ---------------------------------------------------------------------------

function CompetitorFormDialog({
  mode,
  competitor,
  open,
  onOpenChange,
  onSaved,
}: {
  mode: "create" | "edit";
  competitor?: CompetitorAccount | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();

  const defaults = useMemo<CreateCompetitorInput>(
    () => ({
      platform: (competitor?.platform as Provider) || "meta_instagram",
      handle: competitor?.handle ?? "",
      display_name: competitor?.display_name ?? "",
      region: competitor?.region ?? "",
      industry: competitor?.industry ?? "",
      tags: competitor?.tags ?? [],
      source: competitor?.source ?? "mock",
      is_active: competitor?.is_active ?? true,
    }),
    [competitor],
  );

  const [form, setForm] = useState<CreateCompetitorInput>(defaults);
  const [tagsText, setTagsText] = useState(defaults.tags?.join(", ") ?? "");

  // Reset form when dialog opens or competitor changes.
  useMemo(() => {
    setForm(defaults);
    setTagsText(defaults.tags?.join(", ") ?? "");
  }, [defaults]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: CreateCompetitorInput = {
        ...form,
        tags: tagsText
          .split(/[,\n]+/)
          .map((t) => t.trim())
          .filter(Boolean),
      };
      if (mode === "edit" && competitor) {
        return competitorsApi.update(competitor.id, payload);
      }
      return competitorsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(
        mode === "edit"
          ? t("competitors.form.update")
          : t("competitors.form.save"),
      );
      onSaved();
      onOpenChange(false);
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Error"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit"
              ? t("competitors.form.update")
              : t("competitors.addCta")}
          </DialogTitle>
          <DialogDescription>{t("competitors.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("competitors.form.platform")}</Label>
              <Select
                value={form.platform}
                onChange={(e) =>
                  setForm((f) => ({ ...f, platform: e.target.value as Provider }))
                }
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t("competitors.form.source")}</Label>
              <Select
                value={form.source ?? "mock"}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    source: e.target.value as CompetitorSource,
                  }))
                }
              >
                {SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {t(s.labelKey)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label>{t("competitors.form.handle")}</Label>
            <Input
              value={form.handle}
              placeholder={t("competitors.form.handlePh")}
              onChange={(e) =>
                setForm((f) => ({ ...f, handle: e.target.value }))
              }
            />
          </div>

          <div>
            <Label>{t("competitors.form.display")}</Label>
            <Input
              value={form.display_name ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, display_name: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("competitors.form.region")}</Label>
              <Input
                value={form.region ?? ""}
                placeholder="SA"
                maxLength={4}
                onChange={(e) =>
                  setForm((f) => ({ ...f, region: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>{t("competitors.form.industry")}</Label>
              <Input
                value={form.industry ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, industry: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <Label>{t("competitors.form.tags")}</Label>
            <Input
              value={tagsText}
              placeholder="fashion, ksa, beta"
              onChange={(e) => setTagsText(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {t("competitors.form.close")}
          </Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!form.handle.trim()}
          >
            {mode === "edit"
              ? t("competitors.form.update")
              : t("competitors.form.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
