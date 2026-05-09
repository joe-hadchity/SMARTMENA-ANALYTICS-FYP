"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

import PageHeader from "@/components/ui/PageHeader";
import { Card, EmptyState } from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import { useI18n } from "@/i18n/I18nProvider";
import { socialAccountsApi, socialPostsApi } from "@/lib/api";
import type { SocialPost } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";
import type { Locale } from "@/lib/types";

const MEDIA_TYPES = ["all", "image", "video", "carousel", "reel", "sidecar"];

export default function PostsPage() {
  const { t, locale } = useI18n() as { t: (key: string) => string; locale: Locale };
  const queryClient = useQueryClient();
  const [mediaType, setMediaType] = useState("all");
  const [accountId, setAccountId] = useState("all");

  const accounts = useQuery({
    queryKey: ["social-accounts"],
    queryFn: socialAccountsApi.list,
  });

  const posts = useQuery({
    queryKey: ["social-posts", { mediaType, accountId }],
    queryFn: () =>
      socialPostsApi.list({
        mediaType: mediaType === "all" ? undefined : mediaType,
        socialAccountId: accountId === "all" ? undefined : accountId,
        limit: 60,
      }),
  });

  const refreshM = useMutation({
    mutationFn: () => socialPostsApi.refresh({ limit: 30 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      queryClient.invalidateQueries({ queryKey: ["social-accounts"] });
    },
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader variant="compact" title={t("posts.title")} />

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="label mb-1">{t("posts.filter.account")}</div>
            <select
              className="input"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="all">{t("posts.filter.any")}</option>
              {accounts.data?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.display_name ?? a.handle}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="label mb-1">Media type</div>
            <select
              className="input"
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value)}
            >
              {MEDIA_TYPES.map((k) => (
                <option key={k} value={k}>
                  {k === "all" ? t("posts.filter.any") : k}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn-secondary flex items-center gap-2 ml-auto"
            onClick={() => refreshM.mutate()}
            disabled={refreshM.isPending}
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshM.isPending ? "animate-spin" : ""}`}
            />
            {refreshM.isPending ? "Refreshing..." : "Refresh Graph posts"}
          </button>
        </div>

        {refreshM.isSuccess && (
          <p className="mt-2 text-sm text-fg-muted">
            Imported {refreshM.data.posts_imported} post
            {refreshM.data.posts_imported !== 1 ? "s" : ""}.
            {refreshM.data.warnings?.length
              ? ` (${refreshM.data.warnings.length} warning${refreshM.data.warnings.length > 1 ? "s" : ""})`
              : ""}
          </p>
        )}
        {refreshM.isError && (
          <p className="mt-2 text-sm text-destructive">
            {(refreshM.error as Error).message}
          </p>
        )}
      </Card>

      {posts.isLoading ? (
        <div className="text-fg-muted text-sm">Loading posts…</div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {!posts.isLoading && posts.data?.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <EmptyState title="No Graph API posts yet. Connect Instagram Graph, then refresh posts." />
          </Card>
        ) : null}

        {posts.data?.map((p: SocialPost) => (
          <PostCard key={p.id} post={p} locale={locale} t={t} />
        ))}
      </div>
    </div>
  );
}

function PostCard({
  post: p,
  locale,
  t,
}: {
  post: SocialPost;
  locale: Locale;
  t: (key: string) => string;
}) {
  return (
    <Card className="flex flex-col">
      {p.media_url ? (
        <div className="relative w-full h-44 mb-3 overflow-hidden rounded-lg bg-surface-muted flex-shrink-0">
          {p.media_type === "video" || p.media_type === "reel" ? (
            <video
              src={p.media_url}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <Image
              src={p.media_url}
              alt={p.caption ?? "post"}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              style={{ objectFit: "cover" }}
              unoptimized
            />
          )}
        </div>
      ) : null}

      <div className="flex items-center gap-1 mb-2 flex-wrap">
        {p.media_type ? <Chip tone="brand">{p.media_type}</Chip> : null}
        {p.social_accounts?.handle ? (
          <Chip>@{p.social_accounts.handle}</Chip>
        ) : null}
      </div>

      <p className="text-sm line-clamp-4 min-h-[3em] flex-1">
        {p.caption || "—"}
      </p>

      {p.latest_metrics ? (
        <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-fg-muted">{t("posts.metric.likes")}</div>
            <div className="font-numeric font-medium">
              {formatNumber(p.latest_metrics.likes, locale)}
            </div>
          </div>
          <div>
            <div className="text-fg-muted">{t("posts.metric.comments")}</div>
            <div className="font-numeric font-medium">
              {formatNumber(p.latest_metrics.comments, locale)}
            </div>
          </div>
          <div>
            <div className="text-fg-muted">Reach</div>
            <div className="font-numeric font-medium">
              {formatNumber(p.latest_metrics.reach, locale)}
            </div>
          </div>
        </div>
      ) : null}

      {p.permalink ? (
        <a
          href={p.permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 text-[11px] text-brand hover:underline"
        >
          View on Instagram ↗
        </a>
      ) : null}

      <div className="mt-1 text-[11px] text-fg-subtle">
        {p.published_at ? formatDate(p.published_at, locale) : ""}
      </div>
    </Card>
  );
}
