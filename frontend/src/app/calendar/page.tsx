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
  Landmark,
  PlayCircle,
  Sparkles,
  Store,
  Trash2,
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
  type CreateScheduledPostInput,
  type MenaEvent,
  type ScheduledPost,
  type ScheduledPostStatus,
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

export default function CalendarPage() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();

  const [anchor, setAnchor] = useState<Date>(() => startOfMonth(new Date()));
  const [drawer, setDrawer] = useState<
    | { mode: "create"; defaultDate: Date; eventId?: string | null }
    | { mode: "edit"; post: ScheduledPost }
    | null
  >(null);

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

  const postsByDay = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    for (const p of calendarQ.data?.scheduled_posts ?? []) {
      const key = dayKey(new Date(p.scheduled_at));
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    return map;
  }, [calendarQ.data]);

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
        eyebrow={t("calendar.eyebrow")}
        title={t("calendar.title")}
        subtitle={t("calendar.subtitle")}
        actions={
          <div className="flex items-center gap-2">
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

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
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
        <div className="ms-auto flex items-center gap-3 text-xs text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
            {t("calendar.postsLegend")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-warning" />
            {t("calendar.eventsLegend")}
          </span>
        </div>
      </div>

      {/* Month grid */}
      <Card padded={false} className="overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border bg-surface-muted">
          {weekdayHeaders(locale).map((w) => (
            <div
              key={w}
              className="px-2 py-2 text-[11px] uppercase tracking-wider text-fg-subtle font-semibold"
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
            const events = eventsByDay.get(key) ?? [];
            const posts = postsByDay.get(key) ?? [];
            return (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setDrawer({
                    mode: "create",
                    defaultDate: d,
                    eventId: events[0]?.id ?? null,
                  })
                }
                className={cn(
                  "group text-start h-32 sm:h-36 p-1.5 border-t border-s border-border",
                  "hover:bg-surface-hover transition-colors",
                  !inMonth && "bg-surface-muted/40",
                  isToday && "ring-1 ring-inset ring-primary/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                      isToday
                        ? "bg-primary text-primary-fg font-semibold"
                        : inMonth
                          ? "text-fg"
                          : "text-fg-subtle",
                    )}
                  >
                    {d.getDate()}
                  </span>
                  {events.length + posts.length === 0 && inMonth ? (
                    <CalendarPlus className="h-3.5 w-3.5 opacity-0 group-hover:opacity-70 text-fg-muted" />
                  ) : null}
                </div>

                <div className="mt-1 space-y-1">
                  {events.slice(0, 2).map((ev) => {
                    const meta = EVENT_TYPE_META[ev.event_type];
                    const Icon = meta.icon;
                    return (
                      <div
                        key={ev.id}
                        className={cn(
                          "truncate rounded-md px-1.5 py-0.5 text-[11px] flex items-center gap-1",
                          "bg-warning-soft text-warning-fg/90 border border-warning/30",
                        )}
                        title={
                          locale === "ar"
                            ? ev.title_ar || ev.title_en
                            : ev.title_en
                        }
                      >
                        <Icon className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {locale === "ar"
                            ? ev.title_ar || ev.title_en
                            : ev.title_en}
                        </span>
                      </div>
                    );
                  })}
                  {posts.slice(0, 3).map((p) => (
                    <div
                      key={p.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDrawer({ mode: "edit", post: p });
                      }}
                      className={cn(
                        "truncate rounded-md px-1.5 py-0.5 text-[11px] cursor-pointer",
                        "bg-primary-soft text-primary border border-primary/20",
                      )}
                    >
                      <span className="font-medium">
                        {formatTime(p.scheduled_at, locale)}
                      </span>{" "}
                      <span className="text-fg-muted">· {p.platform}</span>{" "}
                      <span>{p.caption}</span>
                    </div>
                  ))}
                  {events.length + posts.length === 0 && inMonth ? (
                    <div className="text-[10px] text-fg-subtle opacity-0 group-hover:opacity-100 transition">
                      {t("calendar.noPostsDay")}
                    </div>
                  ) : null}
                  {events.length + posts.length > 5 ? (
                    <div className="text-[10px] text-fg-muted">
                      +{events.length + posts.length - 5} more
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Upcoming list */}
      <UpcomingList
        posts={calendarQ.data?.scheduled_posts ?? []}
        events={calendarQ.data?.events ?? []}
        onEditPost={(p) => setDrawer({ mode: "edit", post: p })}
      />

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
        onSaved={() =>
          qc.invalidateQueries({ queryKey: ["calendar"] })
        }
      />
    </div>
  );
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
