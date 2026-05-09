"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Facebook,
  Instagram,
  Link2,
  RefreshCcw,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";
import { Suspense, useEffect } from "react";
import { toast } from "sonner";

import PageHeader from "@/components/ui/PageHeader";
import { Card, EmptyState } from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import { useI18n } from "@/i18n/I18nProvider";
import { oauthApi, socialAccountsApi } from "@/lib/api";
import { formatDate, relativeDate } from "@/lib/format";
import type { SocialAccount } from "@/lib/types";

function providerIcon(p: SocialAccount["provider"]) {
  if (p === "meta_instagram") return <Instagram className="h-4 w-4" />;
  if (p === "meta_facebook") return <Facebook className="h-4 w-4" />;
  return null;
}

export default function ConnectionsPage() {
  return (
    <Suspense fallback={null}>
      <ConnectionsPageContent />
    </Suspense>
  );
}

function ConnectionsPageContent() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const searchParams = useSearchParams();

  const accounts = useQuery({
    queryKey: ["social-accounts"],
    queryFn: socialAccountsApi.list,
  });

  const oauthStatus = useQuery({
    queryKey: ["oauth", "meta", "status"],
    queryFn: oauthApi.metaStatus,
    staleTime: 60_000,
  });
  const liveEnabled = oauthStatus.data?.enabled === true;

  // Handle redirect feedback from /api/oauth/meta/callback.
  useEffect(() => {
    const oauth = searchParams.get("oauth");
    const status = searchParams.get("status");
    const message = searchParams.get("message");
    const accountsCount = searchParams.get("accounts");
    if (oauth !== "meta") return;
    if (status === "ok") {
      toast.success(
        t("connections.connectSuccess", "Connected {count} Meta account(s).").replace(
          "{count}",
          accountsCount ?? "0",
        ),
      );
      qc.invalidateQueries({ queryKey: ["social-accounts"] });
    } else if (status === "error" && message) {
      toast.error(message);
    }
    // Clean up the URL so reloads don't re-trigger the toast.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("oauth");
      url.searchParams.delete("status");
      url.searchParams.delete("message");
      url.searchParams.delete("accounts");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, qc, t]);

  const connectIg = useMutation({
    mutationFn: () => socialAccountsApi.connectMeta({ kind: "instagram" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["social-accounts"] }),
  });
  const connectFb = useMutation({
    mutationFn: () => socialAccountsApi.connectMeta({ kind: "facebook" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["social-accounts"] }),
  });
  const startMetaLive = useMutation({
    mutationFn: () => oauthApi.metaInit("/connections"),
    onSuccess: (res) => {
      if (typeof window !== "undefined") {
        window.location.href = res.authorization_url;
      }
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "OAuth init failed");
    },
  });
  const resyncMeta = useMutation({
    mutationFn: () => oauthApi.metaSync(),
    onSuccess: (res) => {
      toast.success(
        t("connections.connectSuccess", "Connected {count} Meta account(s).").replace(
          "{count}",
          String(res.sync?.accounts_synced ?? 0),
        ),
      );
      qc.invalidateQueries({ queryKey: ["social-accounts"] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    },
  });
  const syncOne = useMutation({
    mutationFn: (id: string) => socialAccountsApi.sync(id, { limit: 24 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-accounts"] });
      qc.invalidateQueries({ queryKey: ["synced-posts"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
  const removeOne = useMutation({
    mutationFn: (id: string) => socialAccountsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["social-accounts"] }),
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        variant="compact"
        title={t("connections.title")}
        actions={
          <>
            {liveEnabled ? (
              <button
                className="btn btn-primary"
                onClick={() => startMetaLive.mutate()}
                disabled={startMetaLive.isPending}
              >
                <Link2 className="h-4 w-4" />
                {t("connections.add.liveMeta")}
              </button>
            ) : null}
            <button
              className="btn btn-secondary"
              onClick={() => connectFb.mutate()}
              disabled={connectFb.isPending}
            >
              <Facebook className="h-4 w-4" />
              {t("connections.add.facebook")}
              <span className="text-fg-subtle text-[11px] ms-1">
                {t("connections.add.mock")}
              </span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => connectIg.mutate()}
              disabled={connectIg.isPending}
            >
              <Instagram className="h-4 w-4" />
              {t("connections.add.instagram")}
              <span className="text-fg-subtle text-[11px] ms-1">
                {t("connections.add.mock")}
              </span>
            </button>
          </>
        }
      />

      {/* Runtime mode banner */}
      <Card>
        <div className="flex items-start gap-3">
          {liveEnabled ? (
            <div className="h-10 w-10 rounded-lg bg-success-soft text-success grid place-items-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-lg bg-warning-soft text-warning grid place-items-center">
              <ShieldOff className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-medium">
                {liveEnabled
                  ? t("connections.liveBanner.title")
                  : t("connections.mockBanner.title")}
              </div>
              {liveEnabled ? (
                <Chip tone="green">Graph {oauthStatus.data?.graph_version ?? "v19"}</Chip>
              ) : (
                <Chip tone="amber">mock</Chip>
              )}
            </div>
            <p className="mt-1 text-sm text-fg-muted">
              {liveEnabled
                ? t("connections.liveBanner.subtitle")
                : t("connections.mockBanner.subtitle")}
            </p>
            {liveEnabled ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="btn btn-ghost text-xs"
                  onClick={() => resyncMeta.mutate()}
                  disabled={resyncMeta.isPending}
                >
                  <RefreshCcw className="h-3 w-3" />
                  {t("connections.resync")}
                </button>
              </div>
            ) : oauthStatus.data?.missing?.length ? (
              <div className="mt-2 text-[11px] text-fg-subtle">
                missing: {oauthStatus.data.missing.join(", ")}
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      {accounts.data && accounts.data.length === 0 ? (
        <Card>
          <EmptyState title={t("connections.empty")} />
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {accounts.data?.map((a) => (
          <Card key={a.id}>
            <div className="flex items-start gap-3">
              {a.avatar_url ? (
                <Image
                  src={a.avatar_url}
                  alt={a.display_name ?? a.handle ?? a.provider}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full bg-surface-muted"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-surface-muted" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {providerIcon(a.provider)}
                  <span className="truncate">
                    {a.display_name ?? a.handle ?? a.external_account_id}
                  </span>
                </div>
                <div className="text-xs text-fg-muted truncate">{a.handle}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Chip tone="green">{t("common.connected")}</Chip>
                  {a.is_mock ? (
                    <Chip tone="amber">{t("connections.mock.badge")}</Chip>
                  ) : (
                    <Chip tone="green">{t("connections.live.badge")}</Chip>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-fg-muted">
              <div>
                <div>{t("common.lastSynced")}</div>
                <div className="text-fg">
                  {a.last_synced_at
                    ? relativeDate(a.last_synced_at, locale)
                    : t("common.never")}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-secondary text-xs"
                  onClick={() => syncOne.mutate(a.id)}
                  disabled={syncOne.isPending}
                >
                  <RefreshCcw className="h-3 w-3" />
                  {t("common.syncNow")}
                </button>
                <button
                  className="btn btn-ghost text-xs text-danger"
                  onClick={() => {
                    if (confirm(t("connections.confirmDelete"))) {
                      removeOne.mutate(a.id);
                    }
                  }}
                  disabled={removeOne.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                  {t("common.disconnect")}
                </button>
              </div>
            </div>

            {a.profile_url ? (
              <div className="mt-2 text-[11px] text-fg-subtle truncate">
                {a.profile_url} · {formatDate(a.connected_at, locale)}
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
