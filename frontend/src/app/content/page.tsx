"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Flag,
  Hash,
  Instagram,
  Landmark,
  LayoutGrid,
  List,
  MessageSquare,
  MoreHorizontal,
  PencilLine,
  PlayCircle,
  RefreshCw,
  Search,
  Sparkles,
  Store,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Textarea } from "@/components/ui/Textarea";
import { useI18n } from "@/i18n/I18nProvider";
import {
  scheduledPostsApi,
  socialAccountsApi,
  socialPostsApi,
  type CreateScheduledPostInput,
  type MenaEvent,
  type ScheduledPost,
  type ScheduledPostStatus,
  type SocialPost,
} from "@/lib/api";
import type { Provider } from "@/lib/types";
import { cn } from "@/lib/utils";

const PLATFORMS: Array<{ value: Provider; label: string }> = [
  { value: "meta_instagram", label: "Instagram" },
  { value: "meta_facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "x", label: "X (Twitter)" },
];

const STATUS_TONE: Record<
  ScheduledPostStatus,
  "info" | "success" | "warning" | "neutral" | "danger"
> = {
  draft: "neutral",
  scheduled: "info",
  publishing: "warning",
  published: "success",
  failed: "danger",
  cancelled: "neutral",
};

const EVENT_TYPE_META: Record<
  MenaEvent["event_type"],
  { icon: React.ElementType; tone: "brand" | "success" | "warning" | "info" | "neutral" }
> = {
  holiday: { icon: Flag, tone: "brand" },
  religious: { icon: Sparkles, tone: "info" },
  shopping: { icon: Store, tone: "warning" },
  local: { icon: Landmark, tone: "neutral" },
  custom: { icon: CalendarDays, tone: "success" },
};

type ContentView = "grid" | "list" | "calendar";

const CONTENT_VIEWS: Array<{ value: ContentView; labelKey: string; icon: React.ElementType }> = [
  { value: "grid", labelKey: "content.view.grid", icon: LayoutGrid },
  { value: "list", labelKey: "content.view.list", icon: List },
  { value: "calendar", labelKey: "content.view.calendar", icon: CalendarDays },
];

const LIST_PAGE_SIZE = 12;

type ContentItem =
  | { kind: "published"; id: string; date: string | null; post: SocialPost }
  | { kind: "scheduled"; id: string; date: string; post: ScheduledPost };

type ListPagination = {
  page: number;
  totalPages: number;
  totalItems: number;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
};

export default function ContentPage() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const initialView = normalizeContentView(searchParams.get("view"));

  const [anchor, setAnchor] = useState<Date>(() => startOfMonth(new Date()));
  const [view, setView] = useState<ContentView>(initialView);
  const [listPage, setListPage] = useState(1);
  const [drawer, setDrawer] = useState<
    | { mode: "create"; defaultDate: Date; eventId?: string | null }
    | { mode: "edit"; post: ScheduledPost }
    | null
  >(null);
  const [filterProfile, setFilterProfile] = useState<string>("all");
  const [filterPostType, setFilterPostType] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [search, setSearch] = useState("");

  const range = useMemo(() => {
    // Fetch a cushion of 7 days before and after to render adjacent-month cells.
    const from = addDays(startOfMonth(anchor), -7);
    const to = addDays(endOfMonth(anchor), 14);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [anchor]);

  const calendarQ = useQuery({
    queryKey: ["calendar", range.from, range.to],
    queryFn: () =>
      scheduledPostsApi.calendar({ from: range.from, to: range.to }),
  });

  const accountsQ = useQuery({
    queryKey: ["social-accounts"],
    queryFn: socialAccountsApi.list,
  });

  const scheduledListQ = useQuery({
    queryKey: ["scheduled-posts", "content"],
    queryFn: () => scheduledPostsApi.list({ limit: 500 }),
  });

  // Pull published posts from the connected post source. These are the same
  // posts that used to live on /posts, now available in every content view.
  const publishedQ = useQuery({
    queryKey: ["content-published"],
    queryFn: () => socialPostsApi.list({ limit: 500 }),
  });

  const refreshPosts = useMutation({
    mutationFn: () => socialPostsApi.refresh({ limit: 30 }),
    onSuccess: (res) => {
      toast.success(
        `Imported ${res.posts_imported} post${res.posts_imported === 1 ? "" : "s"}.`,
      );
      qc.invalidateQueries({ queryKey: ["content-published"] });
      qc.invalidateQueries({ queryKey: ["social-posts"] });
      qc.invalidateQueries({ queryKey: ["calendar"] });
      qc.invalidateQueries({ queryKey: ["scheduled-posts", "content"] });
      qc.invalidateQueries({ queryKey: ["social-accounts"] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Could not refresh posts.");
    },
  });
  const publishNow = useMutation({
    mutationFn: scheduledPostsApi.publishNow,
    onSuccess: (res) => {
      toast.success(
        t("calendar.publishSummary", "Claimed {claimed} · Published {published} · Failed {failed}")
          .replace("{claimed}", String(res.claimed))
          .replace("{published}", String(res.published))
          .replace("{failed}", String(res.failed)),
      );
      qc.invalidateQueries({ queryKey: ["calendar"] });
      qc.invalidateQueries({ queryKey: ["scheduled-posts", "content"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Error";
      toast.error(msg);
    },
  });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, MenaEvent[]>();
    for (const ev of calendarQ.data?.events ?? []) {
      const key = ev.event_date;
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    return map;
  }, [calendarQ.data]);

  const calendarScheduledPosts = calendarQ.data?.scheduled_posts ?? [];
  const allScheduledPosts = scheduledListQ.data ?? calendarScheduledPosts;
  const publishedPosts = publishedQ.data ?? [];

  const filterOptions = useMemo(() => {
    const profiles = new Set<string>();
    const types = new Set<string>();
    const tags = new Set<string>();
    for (const p of allScheduledPosts) {
      if (p.social_account_id) profiles.add(p.social_account_id);
      else if (p.platform) profiles.add(p.platform);
      if (p.platform) types.add(p.platform);
      for (const h of p.hashtags || []) tags.add(h);
    }
    for (const p of publishedPosts) {
      if (p.social_account_id) profiles.add(p.social_account_id);
      if (p.media_type) types.add(p.media_type);
      extractHashtags(p.caption).forEach((h) => tags.add(h));
    }
    return {
      profiles: Array.from(profiles),
      types: Array.from(types),
      tags: Array.from(tags).slice(0, 50),
    };
  }, [allScheduledPosts, publishedPosts]);

  const filteredScheduledPosts = useMemo(() => {
    return allScheduledPosts.filter((p) => {
      if (filterProfile !== "all") {
        if (p.social_account_id !== filterProfile && p.platform !== filterProfile) {
          return false;
        }
      }
      if (filterPostType !== "all" && p.platform !== filterPostType) return false;
      if (filterTag !== "all" && !(p.hashtags || []).includes(filterTag)) return false;
      if (search.trim() && !matchesSearch(p.caption, p.hashtags, search)) return false;
      return true;
    });
  }, [allScheduledPosts, filterProfile, filterPostType, filterTag, search]);

  const filteredCalendarPosts = useMemo(() => {
    const ids = new Set(filteredScheduledPosts.map((p) => p.id));
    return calendarScheduledPosts.filter((p) => ids.has(p.id));
  }, [calendarScheduledPosts, filteredScheduledPosts]);

  const filteredPublishedPosts = useMemo(() => {
    return publishedPosts.filter((p) => {
      if (filterProfile !== "all" && p.social_account_id !== filterProfile) return false;
      if (filterPostType !== "all" && p.media_type !== filterPostType) return false;
      if (filterTag !== "all" && !extractHashtags(p.caption).includes(filterTag)) return false;
      if (search.trim() && !matchesSearch(p.caption, extractHashtags(p.caption), search)) return false;
      return true;
    });
  }, [publishedPosts, filterProfile, filterPostType, filterTag, search]);

  const postsByDay = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    for (const p of filteredCalendarPosts) {
      const key = dayKey(new Date(p.scheduled_at));
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    // Sort within day by scheduled time
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
      );
    }
    return map;
  }, [filteredCalendarPosts]);

  const anyFilterActive =
    filterProfile !== "all" ||
    filterPostType !== "all" ||
    filterTag !== "all" ||
    search.trim().length > 0;

  const clearFilters = () => {
    setFilterProfile("all");
    setFilterPostType("all");
    setFilterTag("all");
    setSearch("");
  };

  const accountsById = useMemo(
    () => new Map((accountsQ.data ?? []).map((a) => [a.id, a] as const)),
    [accountsQ.data],
  );

  const publishedByDay = useMemo(() => {
    const map = new Map<string, SocialPost[]>();
    for (const p of filteredPublishedPosts) {
      if (!p.published_at) continue;
      const key = dayKey(new Date(p.published_at));
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          new Date(b.published_at || 0).getTime() -
          new Date(a.published_at || 0).getTime(),
      );
    }
    return map;
  }, [filteredPublishedPosts]);

  const contentItems = useMemo<ContentItem[]>(() => {
    const scheduled = filteredScheduledPosts.map((post) => ({
      kind: "scheduled" as const,
      id: post.id,
      date: post.scheduled_at,
      post,
    }));
    const published = filteredPublishedPosts.map((post) => ({
      kind: "published" as const,
      id: post.id,
      date: post.published_at,
      post,
    }));
    return [...scheduled, ...published].sort(
      (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
    );
  }, [filteredScheduledPosts, filteredPublishedPosts]);

  const totalListPages = Math.max(1, Math.ceil(contentItems.length / LIST_PAGE_SIZE));

  useEffect(() => {
    setListPage(1);
  }, [filterProfile, filterPostType, filterTag, search, view]);

  useEffect(() => {
    setListPage((page) => Math.min(page, totalListPages));
  }, [totalListPages]);

  const paginatedListItems = useMemo(() => {
    const start = (listPage - 1) * LIST_PAGE_SIZE;
    return contentItems.slice(start, start + LIST_PAGE_SIZE);
  }, [contentItems, listPage]);

  const listFrom = contentItems.length === 0 ? 0 : (listPage - 1) * LIST_PAGE_SIZE + 1;
  const listTo = Math.min(contentItems.length, listPage * LIST_PAGE_SIZE);

  const days = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const monthLabel = useMemo(
    () =>
      anchor.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
        month: "long",
        year: "numeric",
      }),
    [anchor, locale],
  );

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        eyebrow={t("content.eyebrow", "Publishing workspace")}
        title={t("content.title", "Content")}
        subtitle={t("content.subtitle", "Manage published posts, scheduled content, drafts, and calendar timing from one place.")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshPosts.mutate()}
              loading={refreshPosts.isPending}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              {t("content.refresh", "Refresh posts")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => publishNow.mutate()}
              loading={publishNow.isPending}
              leftIcon={<PlayCircle className="h-3.5 w-3.5" />}
            >
              {t("calendar.publishNow")}
            </Button>
            <Button
              size="sm"
              onClick={() =>
                setDrawer({ mode: "create", defaultDate: new Date() })
              }
              leftIcon={<CalendarPlus className="h-3.5 w-3.5" />}
            >
              {t("calendar.new")}
            </Button>
          </div>
        }
      />

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex w-full rounded-lg border border-border bg-surface-muted/50 p-1 lg:w-auto">
            {CONTENT_VIEWS.map((item) => {
              const Icon = item.icon;
              const active = view === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setView(item.value)}
                  className={cn(
                    "inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors lg:flex-none",
                    active
                      ? "bg-surface text-primary shadow-xs"
                      : "text-fg-muted hover:text-fg",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t(item.labelKey, item.labelKey)}
                </button>
              );
            })}
          </div>

          <div className="grid gap-2 text-xs text-fg-muted sm:grid-cols-3 lg:min-w-[420px]">
            <ContentStat label={t("content.stat.published", "Published")} value={filteredPublishedPosts.length} />
            <ContentStat label={t("content.stat.scheduled", "Scheduled / Drafts")} value={filteredScheduledPosts.length} />
            <ContentStat label={t("content.stat.inView", "In this view")} value={contentItems.length} />
          </div>
        </div>
      </Card>

      {/* Toolbar */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-3",
          view !== "calendar" && "hidden",
        )}
      >
        <div className="inline-flex items-center rounded-lg border border-border bg-surface p-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAnchor((a) => addMonths(a, -1))}
            leftIcon={<ChevronLeft className="h-4 w-4 rtl:rotate-180" />}
          >
            {t("calendar.prev")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAnchor(startOfMonth(new Date()))}
          >
            {t("calendar.today")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAnchor((a) => addMonths(a, 1))}
            rightIcon={<ChevronRight className="h-4 w-4 rtl:rotate-180" />}
          >
            {t("calendar.next")}
          </Button>
        </div>
        <div className="text-lg font-semibold text-fg">{monthLabel}</div>
      </div>

      {/* Filter bar — Profiles / Post Types / Tags / Clear all */}
      <Card padded={false} className="overflow-hidden">
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4 relative">
          <label className="block px-4 py-3">
            <div className="text-xs font-semibold text-fg">Search</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-fg-muted">
              <Search className="h-3.5 w-3.5" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("content.filter.search", "Caption, hashtag, account...")}
                className="w-full bg-transparent outline-none placeholder:text-fg-subtle"
              />
            </div>
          </label>
          <FilterCell
            label="Profiles"
            value={filterProfile}
            onChange={setFilterProfile}
            options={[
              { value: "all", label: t("content.filter.viewingAll", "Viewing all") },
              ...filterOptions.profiles.map((id) => {
                const acct = accountsById.get(id);
                return {
                  value: id,
                  label: acct ? `@${acct.handle}` : id,
                };
              }),
            ]}
          />
          <FilterCell
            label="Content type"
            value={filterPostType}
            onChange={setFilterPostType}
            options={[
              { value: "all", label: t("content.filter.viewingAll", "Viewing all") },
              ...filterOptions.types.map((tp) => ({ value: tp, label: tp })),
            ]}
          />
          <FilterCell
            label="Tags"
            value={filterTag}
            onChange={setFilterTag}
            options={[
              { value: "all", label: t("content.filter.viewingAll", "Viewing all") },
              ...filterOptions.tags.map((tag) => ({
                value: tag,
                label: `#${tag}`,
              })),
            ]}
          />
          {anyFilterActive ? (
            <button
              type="button"
              onClick={clearFilters}
              className="absolute right-3 top-3 text-xs font-medium text-primary hover:underline"
            >
              {t("content.filter.clearAll", "Clear All")}
            </button>
          ) : null}
        </div>
      </Card>

      {view === "calendar" ? (
        <>
          {/* Month grid */}
          <Card padded={false} className="overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border bg-surface">
              {weekdayHeaders(locale).map((w) => (
                <div
                  key={w}
                  className="px-3 py-3 text-center text-xs font-medium tracking-wide text-fg-muted border-e last:border-e-0 border-border"
                >
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((d) => {
                const key = dayKey(d);
                const inMonth = d.getMonth() === anchor.getMonth();
                const isToday = dayKey(new Date()) === key;
                const isPast =
                  dayKey(d) < dayKey(new Date()) && !isToday;
                const events = eventsByDay.get(key) ?? [];
                const posts = postsByDay.get(key) ?? [];
                const published = publishedByDay.get(key) ?? [];
                const isEmpty = events.length + posts.length + published.length === 0;
                return (
                  <DayCell
                    key={key}
                    date={d}
                    inMonth={inMonth}
                    isToday={isToday}
                    isPast={isPast}
                    events={events}
                    posts={posts}
                    published={published}
                    isEmpty={isEmpty}
                    locale={locale}
                    onScheduleClick={() =>
                      setDrawer({
                        mode: "create",
                        defaultDate: d,
                        eventId: events[0]?.id ?? null,
                      })
                    }
                    onDraftClick={() =>
                      setDrawer({
                        mode: "create",
                        defaultDate: d,
                        eventId: events[0]?.id ?? null,
                      })
                    }
                    onEditPost={(p) => setDrawer({ mode: "edit", post: p })}
                    accountsById={accountsById}
                  />
                );
              })}
            </div>
          </Card>

          <UpcomingList
            posts={filteredCalendarPosts}
            events={calendarQ.data?.events ?? []}
            onEditPost={(p) => setDrawer({ mode: "edit", post: p })}
          />
        </>
      ) : (
        <ContentLibraryView
          view={view}
          items={view === "list" ? paginatedListItems : contentItems}
          locale={locale}
          onEditPost={(p) => setDrawer({ mode: "edit", post: p })}
          pagination={
            view === "list"
              ? {
                  page: listPage,
                  totalPages: totalListPages,
                  totalItems: contentItems.length,
                  from: listFrom,
                  to: listTo,
                  onPageChange: setListPage,
                }
              : undefined
          }
        />
      )}

      {calendarQ.data?.warnings?.length ? (
        <Card>
          <CardContent className="p-4 text-xs text-warning">
            {calendarQ.data.warnings.join(" · ")}
          </CardContent>
        </Card>
      ) : null}

      {/* Drawer / Dialog */}
      <ScheduleDialog
        state={drawer}
        onClose={() => setDrawer(null)}
        events={calendarQ.data?.events ?? []}
        accounts={(accountsQ.data ?? []).filter(
          (a) =>
            PLATFORMS.some((p) => p.value === a.provider) &&
            a.status !== "disconnected",
        )}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["calendar"] });
          qc.invalidateQueries({ queryKey: ["scheduled-posts", "content"] });
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content library views
// ---------------------------------------------------------------------------

function ContentStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold text-fg">{value}</div>
    </div>
  );
}

function ContentLibraryView({
  view,
  items,
  locale,
  onEditPost,
  pagination,
}: {
  view: Exclude<ContentView, "calendar">;
  items: ContentItem[];
  locale: "en" | "ar";
  onEditPost: (p: ScheduledPost) => void;
  pagination?: ListPagination;
}) {
  const { t } = useI18n();
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("content.empty.title", "No content found")}</CardTitle>
          <CardDescription>
            {t("content.empty.desc", "Try clearing filters, refreshing Graph posts, or scheduling a new draft.")}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (view === "list") {
    return (
      <Card padded={false} className="overflow-hidden">
        <div className="divide-y divide-border">
          {items.map((item) => (
            <ContentListRow
              key={`${item.kind}-${item.id}`}
              item={item}
              locale={locale}
              onEditPost={onEditPost}
            />
          ))}
        </div>
        {pagination ? <ListPaginationControls pagination={pagination} /> : null}
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <ContentGridCard
          key={`${item.kind}-${item.id}`}
          item={item}
          locale={locale}
          onEditPost={onEditPost}
        />
      ))}
    </div>
  );
}

function ListPaginationControls({ pagination }: { pagination: ListPagination }) {
  const { t } = useI18n();
  const pages = pageWindow(pagination.page, pagination.totalPages);
  const canGoBack = pagination.page > 1;
  const canGoNext = pagination.page < pagination.totalPages;

  return (
    <div className="flex flex-col gap-3 border-t border-border bg-surface-muted/30 px-4 py-3 text-xs text-fg-muted sm:flex-row sm:items-center sm:justify-between">
      <div>
        {t("content.pagination.showing", "Showing")}{" "}
        <span className="font-medium text-fg">
          {pagination.from}-{pagination.to}
        </span>{" "}
        {t("content.pagination.of", "of")} <span className="font-medium text-fg">{pagination.totalItems}</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={!canGoBack}
          onClick={() => pagination.onPageChange(pagination.page - 1)}
          className="rounded-md border border-border bg-surface px-2.5 py-1.5 font-medium text-fg transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-45"
        >
          {t("content.pagination.prev", "Previous")}
        </button>

        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => pagination.onPageChange(page)}
            className={cn(
              "hidden h-8 min-w-8 rounded-md border px-2 font-medium transition-colors sm:inline-flex sm:items-center sm:justify-center",
              page === pagination.page
                ? "border-primary bg-primary text-primary-fg"
                : "border-border bg-surface text-fg hover:bg-surface-hover",
            )}
            aria-current={page === pagination.page ? "page" : undefined}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => pagination.onPageChange(pagination.page + 1)}
          className="rounded-md border border-border bg-surface px-2.5 py-1.5 font-medium text-fg transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-45"
        >
          {t("content.pagination.next", "Next")}
        </button>
      </div>
    </div>
  );
}

function ContentGridCard({
  item,
  locale,
  onEditPost,
}: {
  item: ContentItem;
  locale: "en" | "ar";
  onEditPost: (p: ScheduledPost) => void;
}) {
  const { t } = useI18n();
  if (item.kind === "scheduled") {
    const post = item.post;
    const statusTone = STATUS_TONE[post.status];
    return (
      <Card className="flex min-h-[250px] flex-col">
        {post.media_urls?.[0] ? (
          <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-md bg-surface-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.media_urls[0]}
              alt={post.caption}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="mb-4 flex aspect-[4/3] items-center justify-center rounded-md border border-dashed border-border bg-surface-muted text-fg-subtle">
            <PencilLine className="h-6 w-6" />
          </div>
        )}
        <div className="mb-2 flex items-center gap-2">
          <Badge tone={statusTone} size="sm">
            {post.status}
          </Badge>
          <Badge tone="neutral" size="sm">
            {post.platform}
          </Badge>
        </div>
        <p className="line-clamp-4 flex-1 text-sm leading-relaxed text-fg">
          {post.caption}
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-fg-muted">
          <span>{formatDateTime(post.scheduled_at, locale)}</span>
          <button
            type="button"
            onClick={() => onEditPost(post)}
            className="font-medium text-primary hover:underline"
          >
            {t("content.card.edit", "Edit")}
          </button>
        </div>
      </Card>
    );
  }

  const post = item.post;
  const metrics = post.latest_metrics;
  const engagement =
    (metrics?.likes ?? 0) +
    (metrics?.comments ?? 0) +
    (metrics?.shares ?? 0) +
    (metrics?.saves ?? 0);
  const isVideo = post.media_type === "video" || post.media_type === "reel";

  return (
    <Card className="flex min-h-[250px] flex-col">
      {post.media_url ? (
        <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-md bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.media_url}
            alt={post.caption || "Published post"}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
          />
          {isVideo ? (
            <span className="absolute inset-0 grid place-items-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 ring-2 ring-white/80">
                <PlayCircle className="h-5 w-5 text-white" />
              </span>
            </span>
          ) : null}
        </div>
      ) : (
        <div className="mb-4 flex aspect-[4/3] items-center justify-center rounded-md border border-dashed border-border bg-surface-muted text-fg-subtle">
          <Instagram className="h-6 w-6" />
        </div>
      )}
      <div className="mb-2 flex items-center gap-2">
        <Badge tone="success" size="sm">{t("calendar.status.published", "Published")}</Badge>
        {post.media_type ? <Badge tone="neutral" size="sm">{post.media_type}</Badge> : null}
        {post.social_accounts?.handle ? (
          <span className="text-xs text-fg-muted">@{post.social_accounts.handle}</span>
        ) : null}
      </div>
      <p className="line-clamp-4 flex-1 text-sm leading-relaxed text-fg">
        {post.caption || t("content.card.noCaption", "No caption")}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
        <MetricMini label={t("content.metric.likes", "Likes")} value={metrics?.likes ?? 0} />
        <MetricMini label={t("content.metric.comments", "Comments")} value={metrics?.comments ?? 0} />
        <MetricMini label={t("content.metric.eng", "Eng.")} value={engagement} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-fg-muted">
        <span>{post.published_at ? formatDateTime(post.published_at, locale) : ""}</span>
        {post.permalink ? (
          <a
            href={post.permalink}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary hover:underline"
          >
            {t("content.card.open", "Open")}
          </a>
        ) : null}
      </div>
    </Card>
  );
}

function ContentListRow({
  item,
  locale,
  onEditPost,
}: {
  item: ContentItem;
  locale: "en" | "ar";
  onEditPost: (p: ScheduledPost) => void;
}) {
  const { t } = useI18n();
  const date = item.date ? formatDateTime(item.date, locale) : "";
  const isScheduled = item.kind === "scheduled";
  const caption = isScheduled ? item.post.caption : item.post.caption || t("content.card.noCaption", "No caption");
  const meta = isScheduled
    ? [item.post.status, item.post.platform]
    : ["published", item.post.media_type, item.post.social_accounts?.handle && `@${item.post.social_accounts.handle}`]
        .filter(Boolean);

  return (
    <div className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[minmax(0,1fr)_150px_170px_80px] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={isScheduled ? STATUS_TONE[item.post.status] : "success"} size="sm">
            {isScheduled ? item.post.status : "Published"}
          </Badge>
          {meta.slice(1).map((m) => (
            <span key={String(m)} className="text-xs text-fg-muted">
              {m}
            </span>
          ))}
        </div>
        <p className="mt-1 line-clamp-2 text-fg">{caption}</p>
      </div>
      <div className="text-xs text-fg-muted">{date}</div>
      <div className="text-xs text-fg-muted">
        {isScheduled ? "Scheduled content" : publishedMetricsLabel(item.post, t)}
      </div>
      <div className="text-right">
        {isScheduled ? (
          <button
            type="button"
            onClick={() => onEditPost(item.post)}
            className="text-xs font-medium text-primary hover:underline"
          >
            {t("content.card.edit", "Edit")}
          </button>
        ) : item.post.permalink ? (
          <a
            href={item.post.permalink}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-primary hover:underline"
          >
            {t("content.card.open", "Open")}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function MetricMini({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-fg-subtle">{label}</div>
      <div className="mt-0.5 font-semibold text-fg">{compact(value)}</div>
    </div>
  );
}

function publishedMetricsLabel(post: SocialPost, t: (key: string, fallback?: string) => string) {
  const m = post.latest_metrics;
  if (!m) return t("content.metric.noMetrics", "No metrics yet");
  const engagement = (m.likes ?? 0) + (m.comments ?? 0) + (m.shares ?? 0) + (m.saves ?? 0);
  return `${compact(engagement)} engagement`;
}

// ---------------------------------------------------------------------------
// Filter bar cell (Profiles / Post Types / Tags)
// ---------------------------------------------------------------------------

function FilterCell({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <label className="block px-4 py-3 cursor-pointer hover:bg-surface-hover transition-colors">
      <div className="text-xs font-semibold text-fg">{label}</div>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none bg-transparent text-xs text-fg-muted focus:outline-none cursor-pointer w-full"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Day cell — rich post cards + empty hover state
// ---------------------------------------------------------------------------

function DayCell({
  date,
  inMonth,
  isToday,
  isPast,
  events,
  posts,
  published,
  isEmpty,
  locale,
  onScheduleClick,
  onDraftClick,
  onEditPost,
  accountsById,
}: {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  events: MenaEvent[];
  posts: ScheduledPost[];
  published: SocialPost[];
  isEmpty: boolean;
  locale: "en" | "ar";
  onScheduleClick: () => void;
  onDraftClick: () => void;
  onEditPost: (p: ScheduledPost) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accountsById: Map<string, any>;
}) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        "group relative min-h-[180px] p-2 border-t border-s border-border",
        "hover:bg-surface-hover/40 transition-colors",
        !inMonth && "bg-surface-muted/30",
        isPast && "opacity-70",
        isToday && "ring-1 ring-inset ring-primary/40 bg-primary-soft/20",
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span
          className={cn(
            "inline-flex h-6 min-w-6 px-1.5 items-center justify-center rounded-full text-xs font-medium",
            isToday
              ? "bg-primary text-primary-fg"
              : inMonth
                ? "text-fg"
                : "text-fg-subtle",
          )}
        >
          {date.getDate()}
        </span>
      </div>

      <div className="space-y-1.5">
        {events.slice(0, 1).map((ev) => {
          const meta = EVENT_TYPE_META[ev.event_type];
          const Icon = meta.icon;
          return (
            <div
              key={ev.id}
              className="rounded-md border border-warning/30 bg-warning-soft px-2 py-1 text-[11px] text-warning-fg/90 flex items-center gap-1 truncate"
              title={locale === "ar" ? ev.title_ar || ev.title_en : ev.title_en}
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {locale === "ar" ? ev.title_ar || ev.title_en : ev.title_en}
              </span>
            </div>
          );
        })}

        {posts.map((p) => (
          <ScheduledPostCard
            key={p.id}
            post={p}
            locale={locale}
            account={p.social_account_id ? accountsById.get(p.social_account_id) : null}
            onEdit={() => onEditPost(p)}
          />
        ))}

        {published.map((p) => (
          <PublishedPostCard key={p.id} post={p} locale={locale} />
        ))}
      </div>

      {/* Empty-cell hover overlay with two CTAs */}
      {isEmpty && inMonth && !isPast ? (
        <div className="pointer-events-none absolute inset-2 flex flex-col items-stretch justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onScheduleClick();
            }}
            className="pointer-events-auto inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1.5 text-xs font-medium text-fg shadow-sm hover:bg-surface-hover"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            {t("content.schedule", "Schedule Post")}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDraftClick();
            }}
            className="pointer-events-auto inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-2 py-1.5 text-xs font-medium text-primary-fg shadow-sm hover:opacity-90"
          >
            <PencilLine className="h-3.5 w-3.5" />
            {t("content.draft", "Start a Draft")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scheduled post card — for posts queued in the publish-worker (future)
// ---------------------------------------------------------------------------

function ScheduledPostCard({
  post,
  locale,
  account,
  onEdit,
}: {
  post: ScheduledPost;
  locale: "en" | "ar";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  account: any | null;
  onEdit: () => void;
}) {
  const media = post.media_urls || [];
  const extraMedia = Math.max(0, media.length - 1);

  return (
    <div className="rounded-md border border-border bg-surface px-1.5 py-1.5 shadow-xs">
      {/* Big thumbnail at top */}
      {media[0] ? (
        <div className="relative -mx-1.5 -mt-1.5 mb-1.5 aspect-[4/3] overflow-hidden rounded-t-md bg-surface-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={media[0]}
            alt={post.caption || ""}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
          />
          {extraMedia > 0 ? (
            <span className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white">
              +{extraMedia}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-1 text-[10px] text-fg-muted">
        <UploadCloud className="h-3 w-3" />
        <Instagram className="h-3 w-3 text-[#E1306C]" />
        <span className="ms-auto font-medium">{formatTime(post.scheduled_at, locale)}</span>
      </div>

      <p className="mt-1 line-clamp-2 text-[11px] leading-tight text-fg">
        {post.caption || (account?.handle ? `@${account.handle}` : "—")}
      </p>

      <div className="mt-1.5 flex items-center gap-1.5 border-t border-border/60 pt-1 text-fg-muted">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="hover:text-fg"
          aria-label="Edit"
        >
          <MoreHorizontal className="h-3 w-3" />
        </button>
        <Hash className="h-3 w-3" />
        <MessageSquare className="h-3 w-3" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Published post card — shows real Instagram media + engagement-rate badge
// ---------------------------------------------------------------------------

function PublishedPostCard({
  post,
  locale,
}: {
  post: SocialPost;
  locale: "en" | "ar";
}) {
  const m = post.latest_metrics;
  const likes = m?.likes ?? 0;
  const comments = m?.comments ?? 0;
  const shares = m?.shares ?? 0;
  const saves = m?.saves ?? 0;
  const impressions = m?.impressions ?? 0;
  const reach = m?.reach ?? 0;
  const engagement = likes + comments + shares + saves;

  // Engagement rate per impression: prefer impressions, fall back to reach,
  // then to the precomputed rate (which is engagement / followers).
  const erPerImpression =
    impressions > 0
      ? engagement / impressions
      : reach > 0
        ? engagement / reach
        : m?.engagement_rate ?? null;
  const erBasis =
    impressions > 0 ? "impressions" : reach > 0 ? "reach" : "followers";
  const erPercent =
    erPerImpression != null ? Math.round(erPerImpression * 1000) / 10 : null;

  const isVideo = post.media_type === "video" || post.media_type === "reel";

  return (
    <div className="rounded-md border border-border bg-surface px-1.5 py-1.5 shadow-xs">
      {/* Thumbnail at top — always shown for published posts */}
      {post.media_url ? (
        <div className="relative -mx-1.5 -mt-1.5 mb-1.5 aspect-[4/3] overflow-hidden rounded-t-md bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.media_url}
            alt={post.caption || ""}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
          />
          {isVideo ? (
            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 ring-2 ring-white/80">
                <PlayCircle className="h-4 w-4 text-white" />
              </span>
            </span>
          ) : null}
          {erPercent != null ? (
            <span
              className={cn(
                "absolute right-1 top-1 rounded px-1.5 py-0.5 text-[9px] font-bold backdrop-blur-sm",
                erPercent >= 5
                  ? "bg-success/80 text-white"
                  : erPercent >= 2
                    ? "bg-warning/80 text-white"
                    : "bg-black/60 text-white",
              )}
              title={`Engagement / ${erBasis}`}
            >
              {erPercent}% ER
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-1 text-[10px] text-fg-muted">
        <Instagram className="h-3 w-3 text-[#E1306C]" />
        <span className="font-medium">Published</span>
        <span className="ms-auto">{formatTime(post.published_at || "", locale)}</span>
      </div>

      <p className="mt-1 line-clamp-2 text-[11px] leading-tight text-fg">
        {post.caption || "—"}
      </p>

      <div className="mt-1.5 flex items-center gap-2 border-t border-border/60 pt-1 text-[10px] text-fg-muted">
        <span title="Likes">❤ {compact(likes)}</span>
        <span title="Comments">💬 {compact(comments)}</span>
        {reach > 0 ? <span title="Reach">↗ {compact(reach)}</span> : null}
        {post.permalink ? (
          <a
            href={post.permalink}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="ms-auto text-primary hover:underline"
          >
            View
          </a>
        ) : null}
      </div>
    </div>
  );
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ---------------------------------------------------------------------------
// Upcoming list
// ---------------------------------------------------------------------------

function UpcomingList({
  posts,
  events,
  onEditPost,
}: {
  posts: ScheduledPost[];
  events: MenaEvent[];
  onEditPost: (p: ScheduledPost) => void;
}) {
  const { t, locale } = useI18n();
  const now = Date.now();
  const upcoming = useMemo(
    () =>
      [...posts]
        .filter((p) => new Date(p.scheduled_at).getTime() >= now - 3600_000)
        .sort(
          (a, b) =>
            new Date(a.scheduled_at).getTime() -
            new Date(b.scheduled_at).getTime(),
        )
        .slice(0, 8),
    [posts, now],
  );

  const eventById = useMemo(
    () => new Map(events.map((e) => [e.id, e] as const)),
    [events],
  );

  if (upcoming.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("calendar.postsLegend")}</CardTitle>
          <CardDescription>{t("calendar.empty")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("calendar.postsLegend")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {upcoming.map((p) => {
            const ev = p.mena_event_id ? eventById.get(p.mena_event_id) : null;
            return (
              <li
                key={p.id}
                onClick={() => onEditPost(p)}
                className={cn(
                  "flex items-start gap-3 cursor-pointer rounded-lg",
                  "border border-border bg-surface px-3 py-2 hover:bg-surface-hover transition-colors",
                )}
              >
                <div className="shrink-0 h-10 w-10 rounded-lg bg-primary-soft text-primary grid place-items-center">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={STATUS_TONE[p.status]} size="sm">
                      {t(`calendar.status.${p.status}`)}
                    </Badge>
                    <Badge tone="neutral" size="sm">
                      {p.platform}
                    </Badge>
                    {ev ? (
                      <Badge tone="warning" size="sm">
                        {locale === "ar" ? ev.title_ar || ev.title_en : ev.title_en}
                      </Badge>
                    ) : null}
                    <span className="ms-auto text-[11px] text-fg-subtle">
                      {formatDateTime(p.scheduled_at, locale)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-fg line-clamp-2">
                    {p.caption}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Schedule dialog
// ---------------------------------------------------------------------------

type DrawerState =
  | { mode: "create"; defaultDate: Date; eventId?: string | null }
  | { mode: "edit"; post: ScheduledPost }
  | null;

function ScheduleDialog({
  state,
  onClose,
  events,
  accounts,
  onSaved,
}: {
  state: DrawerState;
  onClose: () => void;
  events: MenaEvent[];
  accounts: { id: string; provider: string; handle: string | null; display_name: string | null }[];
  onSaved: () => void;
}) {
  const { t, locale } = useI18n();

  const open = state !== null;
  const post = state?.mode === "edit" ? state.post : null;

  const [platform, setPlatform] = useState<Provider>("meta_instagram");
  const [accountId, setAccountId] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [language, setLanguage] = useState<"ar" | "en" | "mix">("mix");
  const [hashtagsText, setHashtagsText] = useState("");
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");
  const [eventId, setEventId] = useState<string>("");

  // Initialise form values when the drawer opens.
  useMemo(() => {
    if (!state) return;
    if (state.mode === "edit") {
      const p = state.post;
      setPlatform(p.platform as Provider);
      setAccountId(p.social_account_id ?? "");
      setCaption(p.caption);
      setLanguage(p.language ?? "mix");
      setHashtagsText((p.hashtags ?? []).join(" "));
      setScheduledAtLocal(toDateTimeLocal(new Date(p.scheduled_at)));
      setEventId(p.mena_event_id ?? "");
    } else {
      const d = new Date(state.defaultDate);
      if (d.getHours() === 0 && d.getMinutes() === 0) {
        d.setHours(19, 0, 0, 0);
      }
      setPlatform("meta_instagram");
      setAccountId("");
      setCaption("");
      setLanguage("mix");
      setHashtagsText("");
      setScheduledAtLocal(toDateTimeLocal(d));
      setEventId(state.eventId ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const save = useMutation({
    mutationFn: async (
      input: { input: CreateScheduledPostInput; status?: ScheduledPostStatus },
    ) => {
      const payload: CreateScheduledPostInput = {
        ...input.input,
        status: input.status,
      };
      if (post) {
        return scheduledPostsApi.update(post.id, payload);
      }
      return scheduledPostsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(
        post
          ? t("calendar.form.updated", "Updated.")
          : t("calendar.form.created", "Scheduled."),
      );
      onSaved();
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : t("calendar.form.error");
      toast.error(msg);
    },
  });

  const cancelSchedule = useMutation({
    mutationFn: () => scheduledPostsApi.cancel(post!.id),
    onSuccess: () => {
      toast.success(t("calendar.form.cancelled"));
      onSaved();
      onClose();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Error");
    },
  });

  const remove = useMutation({
    mutationFn: () => scheduledPostsApi.remove(post!.id),
    onSuccess: () => {
      toast.success(t("calendar.form.deleted"));
      onSaved();
      onClose();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Error");
    },
  });

  const buildInput = (): CreateScheduledPostInput | null => {
    if (!caption.trim() || !scheduledAtLocal) {
      toast.error(t("calendar.form.error"));
      return null;
    }
    const scheduledIso = new Date(scheduledAtLocal).toISOString();
    const hashtags = hashtagsText
      .split(/[,\n\s]+/)
      .map((h) => h.trim())
      .filter(Boolean)
      .map((h) => (h.startsWith("#") ? h : `#${h}`));
    return {
      social_account_id: accountId || null,
      platform,
      caption: caption.trim(),
      language,
      media_urls: [],
      hashtags,
      scheduled_at: scheduledIso,
      mena_event_id: eventId || null,
    };
  };

  const accountsForPlatform = accounts.filter((a) => a.provider === platform);

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("calendar.drawer.title")}</DialogTitle>
          <DialogDescription>{t("calendar.drawer.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("calendar.form.platform")}</Label>
              <Select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Provider)}
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t("calendar.form.account")}</Label>
              <Select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                <option value="">{t("calendar.form.accountAny")}</option>
                {accountsForPlatform.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.display_name || a.handle || a.id}
                    {a.handle ? ` (@${a.handle})` : ""}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label>{t("calendar.form.caption")}</Label>
            <Textarea
              rows={4}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t("calendar.form.captionPh")}
              dir={language === "ar" ? "rtl" : undefined}
              className={language === "ar" ? "text-right" : undefined}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("calendar.form.language")}</Label>
              <Select
                value={language}
                onChange={(e) =>
                  setLanguage(e.target.value as "ar" | "en" | "mix")
                }
              >
                <option value="mix">AR + EN</option>
                <option value="ar">AR</option>
                <option value="en">EN</option>
              </Select>
            </div>
            <div>
              <Label>{t("calendar.form.scheduledAt")}</Label>
              <Input
                type="datetime-local"
                value={scheduledAtLocal}
                onChange={(e) => setScheduledAtLocal(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>{t("calendar.form.hashtags")}</Label>
            <Input
              value={hashtagsText}
              onChange={(e) => setHashtagsText(e.target.value)}
              placeholder="#Ramadan #Eid #KSA"
            />
          </div>

          <div>
            <Label>{t("calendar.form.linkedEvent")}</Label>
            <Select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              <option value="">{t("calendar.form.linkedEventNone")}</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {(locale === "ar" ? ev.title_ar || ev.title_en : ev.title_en) +
                    " · " +
                    ev.event_date}
                </option>
              ))}
            </Select>
          </div>

          {post?.status === "failed" && post.error_message ? (
            <div className="text-xs text-danger border border-danger/30 bg-danger-soft/30 rounded-md p-2">
              {post.error_message}
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-2">
          {post ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove.mutate()}
                loading={remove.isPending}
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              >
                {t("calendar.form.delete")}
              </Button>
              {post.status !== "cancelled" && post.status !== "published" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cancelSchedule.mutate()}
                  loading={cancelSchedule.isPending}
                >
                  {t("calendar.form.stop")}
                </Button>
              ) : null}
            </>
          ) : null}
          <div className="ms-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t("calendar.form.cancel")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const input = buildInput();
                if (input) save.mutate({ input, status: "draft" });
              }}
              loading={save.isPending && save.variables?.status === "draft"}
            >
              {t("calendar.form.submitDraft")}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const input = buildInput();
                if (input) save.mutate({ input, status: "scheduled" });
              }}
              loading={save.isPending && save.variables?.status === "scheduled"}
            >
              {t("calendar.form.submit")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function normalizeContentView(value: string | null): ContentView {
  if (value === "list" || value === "calendar" || value === "grid") return value;
  return "grid";
}

function extractHashtags(text: string | null | undefined): string[] {
  if (!text) return [];
  return Array.from(text.matchAll(/#([\p{L}\p{N}_]+)/gu)).map((m) => m[1]);
}

function matchesSearch(
  caption: string | null | undefined,
  hashtags: string[] | null | undefined,
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = `${caption || ""} ${(hashtags || []).join(" ")}`.toLowerCase();
  return haystack.includes(q.replace(/^#/, ""));
}

function pageWindow(current: number, total: number) {
  const size = 5;
  const half = Math.floor(size / 2);
  let start = Math.max(1, current - half);
  const end = Math.min(total, start + size - 1);
  start = Math.max(1, end - size + 1);
  const pages: number[] = [];
  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }
  return pages;
}

function startOfMonth(d: Date) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfMonth(d: Date) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + 1);
  x.setDate(0);
  x.setHours(23, 59, 59, 999);
  return x;
}
function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function buildMonthGrid(anchor: Date): Date[] {
  const first = startOfMonth(anchor);
  const dayOfWeek = first.getDay(); // 0 Sun - 6 Sat
  // Start grid on Sunday preceding or equal to first.
  const start = addDays(first, -dayOfWeek);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(addDays(start, i));
  }
  return cells;
}
function weekdayHeaders(locale: "en" | "ar") {
  const base = new Date(2024, 0, 7); // Sun, Jan 7, 2024
  const arr: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(base, i);
    arr.push(
      d.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
        weekday: "short",
      }),
    );
  }
  return arr;
}
function formatTime(iso: string, locale: "en" | "ar") {
  try {
    return new Date(iso).toLocaleTimeString(
      locale === "ar" ? "ar-EG" : "en-US",
      { hour: "2-digit", minute: "2-digit" },
    );
  } catch {
    return "";
  }
}
function formatDateTime(iso: string, locale: "en" | "ar") {
  try {
    return new Date(iso).toLocaleString(
      locale === "ar" ? "ar-EG" : "en-US",
      { dateStyle: "medium", timeStyle: "short" },
    );
  } catch {
    return iso;
  }
}
function toDateTimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
