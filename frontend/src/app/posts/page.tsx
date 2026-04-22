"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useState } from "react";

import PageHeader from "@/components/ui/PageHeader";
import { Card, EmptyState } from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import { useI18n } from "@/i18n/I18nProvider";
import { socialAccountsApi, syncedPostsApi } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";
import type { CaptionLang, PostType } from "@/lib/types";

const LANGS: Array<"all" | CaptionLang> = ["all", "ar", "en", "mixed"];
const TYPES: Array<"all" | PostType> = [
  "all",
  "image",
  "video",
  "carousel",
  "reel",
  "story",
  "text",
];

export default function PostsPage() {
  const { t, locale } = useI18n();
  const [lang, setLang] = useState<(typeof LANGS)[number]>("all");
  const [postType, setPostType] = useState<(typeof TYPES)[number]>("all");
  const [accountId, setAccountId] = useState<string>("all");

  const accounts = useQuery({
    queryKey: ["social-accounts"],
    queryFn: socialAccountsApi.list,
  });

  const posts = useQuery({
    queryKey: ["synced-posts", { lang, postType, accountId }],
    queryFn: () =>
      syncedPostsApi.list({
        lang: lang === "all" ? undefined : lang,
        postType: postType === "all" ? undefined : postType,
        socialAccountId: accountId === "all" ? undefined : accountId,
        limit: 60,
      }),
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader title={t("posts.title")} subtitle={t("posts.subtitle")} />

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
            <div className="label mb-1">{t("posts.filter.lang")}</div>
            <select
              className="input"
              value={lang}
              onChange={(e) =>
                setLang(e.target.value as (typeof LANGS)[number])
              }
            >
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {l === "all" ? t("posts.filter.any") : l.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="label mb-1">{t("posts.filter.type")}</div>
            <select
              className="input"
              value={postType}
              onChange={(e) =>
                setPostType(e.target.value as (typeof TYPES)[number])
              }
            >
              {TYPES.map((k) => (
                <option key={k} value={k}>
                  {k === "all" ? t("posts.filter.any") : k}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {posts.data?.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <EmptyState title={t("common.empty")} />
          </Card>
        ) : null}

        {posts.data?.map((p) => (
          <Card key={p.id}>
            {p.media_url ? (
              <div className="relative w-full h-40 mb-3 overflow-hidden rounded-lg bg-surface-muted">
                <Image
                  src={p.media_url}
                  alt={p.caption ?? "post"}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  style={{ objectFit: "cover" }}
                />
              </div>
            ) : null}

            <div className="flex items-center gap-1 mb-2 flex-wrap">
              {p.post_type ? <Chip tone="brand">{p.post_type}</Chip> : null}
              {p.caption_lang ? (
                <Chip>{p.caption_lang.toUpperCase()}</Chip>
              ) : null}
            </div>
            <p className="text-sm line-clamp-4 min-h-[3em]">
              {p.caption || "—"}
            </p>

            {p.latest_metrics ? (
              <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-fg-muted">{t("posts.metric.likes")}</div>
                  <div className="font-medium">
                    {formatNumber(p.latest_metrics.likes, locale)}
                  </div>
                </div>
                <div>
                  <div className="text-fg-muted">
                    {t("posts.metric.comments")}
                  </div>
                  <div className="font-medium">
                    {formatNumber(p.latest_metrics.comments, locale)}
                  </div>
                </div>
                <div>
                  <div className="text-fg-muted">{t("posts.metric.reach")}</div>
                  <div className="font-medium">
                    {formatNumber(p.latest_metrics.reach, locale)}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-3 text-[11px] text-fg-subtle">
              {p.posted_at ? formatDate(p.posted_at, locale) : ""}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
