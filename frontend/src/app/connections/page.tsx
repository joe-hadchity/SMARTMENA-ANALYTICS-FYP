"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Facebook,
  Instagram,
  Link2,
  RefreshCcw,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

import PageHeader from "@/components/ui/PageHeader";
import { Card, EmptyState } from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import { useI18n } from "@/i18n/I18nProvider";
import { oauthApi, socialAccountsApi } from "@/lib/api";
import { formatDate, relativeDate } from "@/lib/format";
import type { SocialAccount } from "@/lib/types";

type MetaScopePack = "core" | "insights" | "inbox" | "full";

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
  const [scopePack, setScopePack] = useState<MetaScopePack>("full");

  const accounts = useQuery({
    queryKey: ["social-accounts"],
    queryFn: socialAccountsApi.list,
  });

  const oauthStatus = useQuery({
    queryKey: ["oauth", "meta", "status"],
    queryFn: oauthApi.metaStatus,
    staleTime: 60_000,
  });
  const metaDiagnostics = useQuery({
    queryKey: ["oauth", "meta", "diagnostics"],
    queryFn: oauthApi.metaDiagnostics,
    enabled: oauthStatus.data?.enabled === true,
    staleTime: 30_000,
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
      qc.invalidateQueries({ queryKey: ["oauth", "meta", "diagnostics"] });
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
    mutationFn: () => oauthApi.metaInit("/connections", scopePack),
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
      qc.invalidateQueries({ queryKey: ["oauth", "meta", "diagnostics"] });
      if (res.sync?.warnings?.length) {
        toast.warning("Meta synced with notes", {
          description: res.sync.warnings.slice(0, 2).join(" / "),
        });
      }
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
        <div className="flex flex-col gap-5">
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
                <Chip tone="amber">{t("connections.mock", "mock")}</Chip>
              )}
              {metaDiagnostics.data?.connected ? (
                <Chip tone="green">{t("connections.oauthConnected", "OAuth connected")}</Chip>
              ) : liveEnabled ? (
                <Chip tone="amber">{t("connections.oauthNotConnected", "OAuth not connected")}</Chip>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-fg-muted">
              {liveEnabled
                ? t("connections.liveBanner.subtitle")
                : t("connections.mockBanner.subtitle")}
            </p>
            {liveEnabled ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-fg"
                  value={scopePack}
                  onChange={(event) => setScopePack(event.target.value as MetaScopePack)}
                  disabled={startMetaLive.isPending}
                  aria-label="Meta permission pack"
                >
                  <option value="core">{t("connections.scopeCore", "Core account discovery")}</option>
                  <option value="insights">{t("connections.scopeInsights", "Insights and post analytics")}</option>
                  <option value="inbox">{t("connections.scopeInbox", "Inbox, comments, and replies")}</option>
                  <option value="full">{t("connections.scopeFull", "Full SmartMENA Graph access")}</option>
                </select>
                <button
                  className="btn btn-primary text-xs"
                  onClick={() => startMetaLive.mutate()}
                  disabled={startMetaLive.isPending}
                >
                  <Link2 className="h-3 w-3" />
                  {t("connections.reauthorize", "Connect / re-authorize Meta")}
                </button>
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
          {liveEnabled && metaDiagnostics.data?.connected ? (
            <MetaDiagnosticsPanel
              loading={metaDiagnostics.isLoading}
              data={metaDiagnostics.data}
              scopes={oauthStatus.data?.scope_packs?.[scopePack] ?? oauthStatus.data?.scopes ?? []}
            />
          ) : liveEnabled && !metaDiagnostics.isLoading && metaDiagnostics.data && !metaDiagnostics.data.connected ? (
            <div className="rounded-md border border-border bg-surface-muted/40 p-4 text-sm text-fg-muted">
              {t("connections.connectFirst", "Connect via OAuth above to see permission status and discovered Meta assets.")}
            </div>
          ) : null}
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

function MetaDiagnosticsPanel({
  loading,
  data,
  scopes,
}: {
  loading: boolean;
  data?: Awaited<ReturnType<typeof oauthApi.metaDiagnostics>>;
  scopes: string[];
}) {
  const { t } = useI18n();
  const requested = data?.requested_scopes?.length
    ? data.requested_scopes
    : scopes;
  const granted = new Set(data?.granted_scopes ?? []);
  const missing = data?.missing_scopes ?? requested.filter((scope) => !granted.has(scope));

  return (
    <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="rounded-md border border-border bg-surface-muted/40 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-fg">{t("connections.graphReadiness", "Graph readiness")}</div>
            <p className="mt-1 text-[11px] text-fg-muted">
              {t("connections.graphDesc", "Permissions requested by SmartMENA and what Meta granted.")}
            </p>
          </div>
          {data?.connected ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-warning" />
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <MiniStat label={t("connections.pages", "Pages")} value={loading ? "-" : String(data?.pages ?? 0)} />
          <MiniStat
            label={t("connections.igAccounts", "IG accounts")}
            value={loading ? "-" : String(data?.instagram_accounts ?? 0)}
          />
          <MiniStat label={t("connections.missing", "Missing")} value={loading ? "-" : String(missing.length)} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {requested.slice(0, 12).map((scope) => (
            <span
              key={scope}
              className={[
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                granted.has(scope)
                  ? "bg-success-soft text-success"
                  : "bg-warning-soft text-warning",
              ].join(" ")}
            >
              {scope}
            </span>
          ))}
        </div>
        {data?.warnings?.length ? (
          <div className="mt-3 text-[11px] leading-relaxed text-warning">
            {data.warnings.slice(0, 2).join(" / ")}
          </div>
        ) : null}
      </div>

      <div className="rounded-md border border-border bg-surface-muted/40 p-3">
        <div className="text-xs font-semibold text-fg">{t("connections.discoveredAssets", "Discovered Meta assets")}</div>
        <p className="mt-1 text-[11px] text-fg-muted">
          {t("connections.discoveredDesc", "Pages with linked Instagram professional accounts will be synced into SmartMENA.")}
        </p>
        <div className="mt-3 max-h-44 space-y-2 overflow-auto pr-1">
          {data?.accounts?.length ? (
            data.accounts.map((account) => (
              <div
                key={account.page_id}
                className="flex items-center justify-between gap-3 rounded-md bg-surface px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-fg">
                    {account.page_name || account.page_id}
                  </div>
                  <div className="truncate text-[11px] text-fg-muted">
                    {account.instagram?.username
                      ? `Instagram @${account.instagram.username}`
                      : t("connections.noLinkedIg", "No linked Instagram professional account")}
                  </div>
                </div>
                <Chip tone={account.instagram ? "green" : "amber"}>
                  {account.instagram ? t("connections.ready", "ready") : t("connections.pageOnly", "page only")}
                </Chip>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-fg-muted">
              {loading
                ? t("connections.checking", "Checking Meta assets...")
                : t("connections.connectToDiscover", "Connect Meta to discover Pages and linked Instagram accounts.")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface px-2 py-2">
      <div className="text-sm font-semibold tabular-nums text-fg">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-fg-subtle">
        {label}
      </div>
    </div>
  );
}
