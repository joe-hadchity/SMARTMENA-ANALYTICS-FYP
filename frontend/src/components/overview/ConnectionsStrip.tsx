"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Facebook,
  Instagram,
  Music2,
  Plug,
  RefreshCcw,
  Twitter,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useI18n } from "@/i18n/I18nProvider";
import { integrationsApi, socialAccountsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { relativeDate } from "@/lib/format";
import type { Provider, SocialAccount } from "@/lib/types";

type PlatformTile = {
  provider: Provider;
  label: string;
  icon: LucideIcon;
  accent: string;
  comingSoon?: boolean;
};

const DEFAULT_TILES: PlatformTile[] = [
  {
    provider: "meta_instagram",
    label: "Instagram",
    icon: Instagram,
    accent: "text-[#DD2A7B]",
  },
  {
    provider: "meta_facebook",
    label: "Facebook",
    icon: Facebook,
    accent: "text-[#1877F2]",
  },
  {
    provider: "tiktok",
    label: "TikTok",
    icon: Music2,
    accent: "text-[#FE2C55]",
    comingSoon: true,
  },
  {
    provider: "x",
    label: "X",
    icon: Twitter,
    accent: "text-fg",
    comingSoon: true,
  },
];

function summarize(accounts: SocialAccount[], provider: Provider) {
  const list = accounts.filter((a) => a.provider === provider);
  const connected = list.filter((a) => a.status === "connected");
  const errored = list.filter((a) => a.status === "error");
  const lastSyncedAt = list
    .map((a) => a.last_synced_at)
    .filter((v): v is string => !!v)
    .sort()
    .pop();
  const isMock = list.some((a) => a.is_mock);
  return {
    total: list.length,
    connected: connected.length,
    errored: errored.length,
    lastSyncedAt: lastSyncedAt ?? null,
    isMock,
    accounts: list,
  };
}

export type ConnectionsStripProps = {
  selected: Provider[];
  onToggle: (p: Provider) => void;
};

export default function ConnectionsStrip({
  selected,
  onToggle,
}: ConnectionsStripProps) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();

  const accountsQ = useQuery({
    queryKey: ["social-accounts"],
    queryFn: socialAccountsApi.list,
  });
  const capsQ = useQuery({
    queryKey: ["integrations", "capabilities"],
    queryFn: integrationsApi.capabilities,
  });

  const syncAll = useMutation({
    mutationFn: async (provider: Provider) => {
      const list = (accountsQ.data ?? []).filter(
        (a) => a.provider === provider && a.status !== "disconnected",
      );
      await Promise.all(
        list.map((a) => socialAccountsApi.sync(a.id, { limit: 24 })),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-accounts"] });
      qc.invalidateQueries({ queryKey: ["synced-posts"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
      qc.invalidateQueries({ queryKey: ["insights"] });
    },
  });

  const tiles = useMemo(() => {
    const byPlatform = new Map<
      string,
      NonNullable<typeof capsQ.data>["platforms"][number] | undefined
    >();
    for (const c of capsQ.data?.platforms ?? []) {
      for (const p of c.platforms) byPlatform.set(p, c);
    }
    return DEFAULT_TILES.map((tile) => {
      const cap = byPlatform.get(tile.provider);
      const comingSoon =
        tile.comingSoon ||
        (cap && cap.status !== "mock_ready" && cap.status !== "stubbed"
          ? true
          : cap?.status === "stubbed");
      return { ...tile, cap, comingSoon };
    });
  }, [capsQ.data]);

  const loading = accountsQ.isLoading;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {loading
        ? Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full rounded-md" />
          ))
        : tiles.map((tile) => {
            const s = summarize(accountsQ.data ?? [], tile.provider);
            const active = selected.includes(tile.provider);
            const hasAccounts = s.total > 0;
            const statusTone: "success" | "warning" | "neutral" | "danger" =
              s.errored > 0
                ? "danger"
                : s.connected > 0
                  ? "success"
                  : tile.comingSoon
                    ? "neutral"
                    : "neutral";
            const statusLabel =
              s.errored > 0
                ? t("hub.platform.error", "Error")
                : s.connected > 0
                  ? t("hub.platform.live", "Live")
                  : tile.comingSoon
                    ? t("hub.platform.soon", "Coming soon")
                    : t("hub.platform.notConnected", "Not connected");

            const Icon = tile.icon;

            return (
              <div
                key={tile.provider}
                className={cn(
                  "group relative overflow-hidden rounded-md border transition-all",
                  "bg-surface shadow-xs",
                  active
                    ? "border-primary/70 shadow-sm"
                    : "border-border hover:border-border-strong hover:shadow-sm",
                )}
              >
                {active ? (
                  <span className="absolute inset-y-3 start-0 w-[3px] rounded-e-full bg-primary" />
                ) : null}
                <button
                  type="button"
                  onClick={() => onToggle(tile.provider)}
                  className="relative w-full text-start p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md"
                  aria-pressed={active}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-md grid place-items-center border border-border/70 bg-surface-muted",
                          tile.accent,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold leading-tight text-fg">
                          {tile.label}
                        </div>
                        <div className="text-[11px] text-fg-muted leading-tight">
                          {hasAccounts
                            ? t("hub.platform.accounts", "{n} account(s)").replace(
                                "{n}",
                                String(s.total),
                              )
                            : tile.comingSoon
                              ? t("hub.platform.planned", "Planned")
                              : t("hub.platform.notConnected", "Not connected")}
                        </div>
                      </div>
                    </div>
                    <Badge tone={statusTone} size="sm" dot>
                      {statusLabel}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-fg-muted">
                    <span>
                      {t("common.lastSynced", "Last synced")}:{" "}
                      <span className="text-fg font-medium">
                        {s.lastSyncedAt
                          ? relativeDate(s.lastSyncedAt, locale)
                          : t("common.never", "Never")}
                      </span>
                    </span>
                    {s.isMock ? (
                      <Badge size="sm" tone="warning">
                        mock
                      </Badge>
                    ) : null}
                  </div>
                </button>

                <div className="relative flex items-center gap-1.5 px-3 pb-3">
                  {hasAccounts ? (
                    <Button
                      variant="subtle"
                      size="sm"
                      className="flex-1"
                      leftIcon={<RefreshCcw className="h-3 w-3" />}
                      loading={syncAll.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        syncAll.mutate(tile.provider);
                      }}
                    >
                      {t("common.syncNow", "Sync now")}
                    </Button>
                  ) : tile.comingSoon ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      disabled
                    >
                      {t("hub.platform.soon", "Coming soon")}
                    </Button>
                  ) : (
                    <Button
                      asChild
                      variant="primary"
                      size="sm"
                      className="flex-1"
                    >
                      <Link href="/connections">
                        <Plug className="h-3 w-3" />
                        {t("hub.platform.connect", "Connect")}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
    </div>
  );
}
