"use client";

import { useQuery } from "@tanstack/react-query";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ArrowUp,
  Bot,
  MessageSquarePlus,
  Sparkles,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/I18nProvider";
import {
  analyticsApi,
  assistantApi,
  healthApi,
  insightsApi,
  socialAccountsApi,
} from "@/lib/api";
import { relativeDate, formatNumber, formatPercent } from "@/lib/format";
import type { Insight, Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "insights" | "chat";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: number;
  streaming?: boolean;
  error?: string;
};

// ---------------------------------------------------------------------------
// Grounded mini-responder. Uses the workspace data already loaded by react-
// query so answers cite real numbers. Later we can swap this for a real
// backend chat endpoint without touching the UI.
// ---------------------------------------------------------------------------

type AnswerCtx = {
  locale: Locale;
  insights: Insight[];
  overview: Awaited<ReturnType<typeof analyticsApi.overview>> | undefined;
  platform: Awaited<ReturnType<typeof analyticsApi.platformBreakdown>> | undefined;
  sentiment: Awaited<ReturnType<typeof analyticsApi.sentimentBreakdown>> | undefined;
  top: Awaited<ReturnType<typeof analyticsApi.topPosts>> | undefined;
};

function answerFor(question: string, ctx: AnswerCtx): string {
  const q = question.trim().toLowerCase();
  if (!q) return "";
  const { locale } = ctx;
  const is = (...w: string[]) => w.some((kw) => q.includes(kw));

  // Best posting time
  if (is("best time", "when to post", "posting time", "وقت", "أفضل وقت")) {
    const ins = ctx.insights.find((i) => i.insight_type === "best_posting_time");
    if (ins) {
      const body = locale === "ar" ? ins.body_ar : ins.body_en;
      if (body) return body;
    }
    return locale === "ar"
      ? "عادةً ما تحقق منشورات المساء (19:00–22:00) أداءً أفضل في منطقة الشرق الأوسط، خصوصاً بعد انتهاء الدوام."
      : "Evening posts (19:00–22:00) tend to outperform in MENA, especially after working hours.";
  }

  // Sentiment
  if (is("sentiment", "feeling", "مشاعر")) {
    const s = ctx.sentiment;
    if (s && s.total > 0) {
      const pos = formatPercent(s.shares.positive, 0, locale);
      const neg = formatPercent(s.shares.negative, 0, locale);
      const neu = formatPercent(s.shares.neutral, 0, locale);
      return locale === "ar"
        ? `تحليل المشاعر عبر ${formatNumber(s.total, locale)} عنصر: ${pos} إيجابي، ${neu} محايد، ${neg} سلبي.`
        : `Across ${formatNumber(s.total, locale)} items: ${pos} positive, ${neu} neutral, ${neg} negative.`;
    }
    return locale === "ar"
      ? "لا توجد بيانات مشاعر كافية بعد. قم بمزامنة حساب لتفعيل التحليل العربي والإنجليزي."
      : "Not enough sentiment data yet. Sync an account to activate Arabic + English analysis.";
  }

  // ROI
  if (is("roi", "return", "عائد", "ربح")) {
    const roi = ctx.overview?.averages.predictedRoi;
    if (roi != null) {
      return locale === "ar"
        ? `متوسط العائد المتوقع الحالي ${roi.toFixed(2)}× بناءً على نموذجنا.`
        : `Your current average predicted ROI is ${roi.toFixed(2)}× based on the ensemble model.`;
    }
    return locale === "ar"
      ? "لا توجد تنبؤات عائد حتى الآن. أنشئ حملة لتشغيل التنبؤ."
      : "No ROI predictions yet. Create a campaign to run the forecaster.";
  }

  // Platform breakdown
  if (is("platform", "instagram", "facebook", "tiktok", "المنصة", "انستغرام")) {
    const p = ctx.platform ?? [];
    if (p.length > 0) {
      const sorted = [...p].sort((a, b) => b.engagements - a.engagements);
      const top = sorted[0];
      return locale === "ar"
        ? `أفضل منصة حالياً هي ${top.provider} بـ ${formatNumber(top.engagements, locale)} تفاعل. عدد المنصات النشطة: ${sorted.length}.`
        : `Your top platform right now is ${top.provider} with ${formatNumber(top.engagements, locale)} engagements. Active platforms: ${sorted.length}.`;
    }
    return locale === "ar"
      ? "لم تتم مزامنة أي منصة بعد."
      : "No platforms have been synced yet.";
  }

  // Top post
  if (is("top post", "best post", "highest", "أفضل منشور")) {
    const top = ctx.top?.[0];
    if (top) {
      const cap = (top.caption ?? "").slice(0, 120);
      return locale === "ar"
        ? `أفضل منشور حصل على ${formatNumber(top.engagement, locale)} تفاعل: «${cap || "—"}»`
        : `Your top post has ${formatNumber(top.engagement, locale)} engagements: "${cap || "—"}"`;
    }
  }

  // Summary / overview
  if (is("summary", "overview", "status", "ملخص", "نظرة")) {
    const t = ctx.overview?.totals;
    if (t) {
      return locale === "ar"
        ? `لديك ${formatNumber(t.connectedAccounts, locale)} حساب متصل، ${formatNumber(t.syncedPosts, locale)} منشور مُزامن، و ${formatNumber(t.engagements, locale)} تفاعل إجمالي. معدل التفاعل: ${formatPercent(ctx.overview!.averages.engagementRate, 2, locale)}.`
        : `You have ${formatNumber(t.connectedAccounts, locale)} connected accounts, ${formatNumber(t.syncedPosts, locale)} synced posts and ${formatNumber(t.engagements, locale)} total engagements. Avg engagement rate: ${formatPercent(ctx.overview!.averages.engagementRate, 2, locale)}.`;
    }
  }

  // Default: surface the most recent insight if any, else a gentle fallback
  const latest = ctx.insights[0];
  if (latest) {
    const title = locale === "ar" ? latest.title_ar : latest.title_en;
    const body = locale === "ar" ? latest.body_ar : latest.body_en;
    if (title || body) {
      return `${title ?? ""}${title && body ? " — " : ""}${body ?? ""}`;
    }
  }
  return locale === "ar"
    ? "يمكنني التعليق على الأداء، المشاعر، العائد المتوقع، أفضل وقت للنشر، أو أفضل منشوراتك. جرّب أحد الأسئلة المقترحة."
    : "I can comment on performance, sentiment, predicted ROI, best posting times, or your top posts. Try one of the suggested prompts.";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InsightsDock() {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("insights");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamRef = useRef<{ abort: () => void } | null>(null);

  const healthQ = useQuery({
    queryKey: ["health"],
    queryFn: healthApi.check,
    refetchOnMount: "always",
  });
  const llmEnabled = healthQ.data?.features?.llm?.enabled === true;

  // Queries — only fire when the dock opens, to avoid the extra load on pages
  // that never expand it.
  const insightsQ = useQuery({
    queryKey: ["insights", "dock"],
    queryFn: () => insightsApi.list({ limit: 20 }),
    enabled: open,
  });
  const overviewQ = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: analyticsApi.overview,
    enabled: open,
  });
  const platformQ = useQuery({
    queryKey: ["analytics", "platform"],
    queryFn: analyticsApi.platformBreakdown,
    enabled: open,
  });
  const sentimentQ = useQuery({
    queryKey: ["analytics", "sentiment"],
    queryFn: analyticsApi.sentimentBreakdown,
    enabled: open,
  });
  const topQ = useQuery({
    queryKey: ["analytics", "top", { limit: 5, sortBy: "engagement" }],
    queryFn: () => analyticsApi.topPosts({ limit: 5, sortBy: "engagement" }),
    enabled: open,
  });
  const accountsQ = useQuery({
    queryKey: ["social-accounts"],
    queryFn: socialAccountsApi.list,
    enabled: open,
  });

  // Badge: insights generated in the last 24h
  const recentInsightsQ = useQuery({
    queryKey: ["insights", "recent-count"],
    queryFn: () => insightsApi.list({ limit: 20 }),
    refetchInterval: 60_000,
  });
  const unread = useMemo(() => {
    const list = recentInsightsQ.data ?? [];
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return list.filter((i) => new Date(i.generated_at).getTime() >= cutoff)
      .length;
  }, [recentInsightsQ.data]);

  const insights = insightsQ.data ?? [];

  // Auto-scroll on new messages
  useEffect(() => {
    if (tab === "chat" && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, tab]);

  // Keyboard shortcut: ? to toggle
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          e.target.isContentEditable
        )
          return;
      }
      if (e.key === "?" && (e.shiftKey || e.key === "?")) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const localFallback = useCallback(
    (question: string): string => {
      const ctx: AnswerCtx = {
        locale,
        insights,
        overview: overviewQ.data,
        platform: platformQ.data,
        sentiment: sentimentQ.data,
        top: topQ.data,
      };
      return answerFor(question, ctx);
    },
    [locale, insights, overviewQ.data, platformQ.data, sentimentQ.data, topQ.data],
  );

  const send = useCallback(
    (text?: string) => {
      const value = (text ?? draft).trim();
      if (!value) return;

      // Cancel any in-flight stream so the UI stays consistent.
      streamRef.current?.abort();
      streamRef.current = null;

      const now = Date.now();
      const userId = `u_${now}`;
      const assistantId = `a_${now}`;
      const userMsg: ChatMsg = {
        id: userId,
        role: "user",
        text: value,
        at: now,
      };
      const placeholder: ChatMsg = {
        id: assistantId,
        role: "assistant",
        text: "",
        at: now,
        streaming: true,
      };
      setMessages((m) => [...m, userMsg, placeholder]);
      setDraft("");
      setIsStreaming(true);

      const updateAssistant = (patch: Partial<ChatMsg>) => {
        setMessages((m) =>
          m.map((msg) => (msg.id === assistantId ? { ...msg, ...patch } : msg)),
        );
      };

      // If the backend copilot isn't wired, use the local keyword responder
      // so the experience never looks broken.
      if (!llmEnabled) {
        const reply = localFallback(value);
        setTimeout(() => {
          updateAssistant({ text: reply, streaming: false });
          setIsStreaming(false);
        }, 200);
        return;
      }

      let streamedText = "";
      let sawError = false;

      const handle = assistantApi.streamChat(
        {
          message: value,
          conversationId: conversationId ?? undefined,
          locale,
        },
        {
          onConversation: (id) => {
            if (id) setConversationId(id);
          },
          onToken: (delta) => {
            streamedText += delta;
            updateAssistant({ text: streamedText, streaming: true });
          },
          onError: (code, message) => {
            sawError = true;
            // If the backend says LLM is disabled, fall back to local.
            if (code === "LLM_DISABLED" || code === "LLM_BUDGET_EXCEEDED") {
              const reply = localFallback(value);
              updateAssistant({
                text: reply,
                streaming: false,
                error: code === "LLM_BUDGET_EXCEEDED" ? message : undefined,
              });
            } else {
              updateAssistant({
                text:
                  streamedText ||
                  (locale === "ar"
                    ? "تعذّر الاتصال بالمساعد الذكي. حاول لاحقاً."
                    : "I couldn't reach the AI copilot. Please try again."),
                streaming: false,
                error: `${code}: ${message}`,
              });
            }
            setIsStreaming(false);
          },
          onDone: () => {
            if (!sawError) {
              updateAssistant({
                text: streamedText || placeholder.text,
                streaming: false,
              });
            }
            setIsStreaming(false);
          },
        },
      );
      streamRef.current = handle;
    },
    [draft, locale, llmEnabled, conversationId, localFallback],
  );

  useEffect(() => () => streamRef.current?.abort(), []);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const suggestions = [
    t("dock.suggest.summary", "Give me a quick summary"),
    t("dock.suggest.time", "When is the best time to post?"),
    t("dock.suggest.sentiment", "How is our sentiment looking?"),
    t("dock.suggest.top", "What is our top post?"),
  ];

  const hasAccounts = (accountsQ.data ?? []).length > 0;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      {/* Floating launcher */}
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={t("dock.open", "Open SmartMENA assistant")}
          className={cn(
            "fixed bottom-6 end-6 z-40 h-14 w-14 rounded-full shadow-xl",
            "bg-gradient-to-br from-primary to-[hsl(var(--viz-4))] text-primary-fg",
            "grid place-items-center",
            "transition-transform hover:scale-[1.05] active:scale-[0.98]",
            "focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30",
          )}
        >
          <Sparkles className="h-6 w-6" />
          {unread > 0 ? (
            <span className="absolute -top-1 -end-1 min-w-[20px] h-5 px-1 rounded-full bg-danger text-fg-inverse text-[10px] font-semibold grid place-items-center shadow-md">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-fg/20 backdrop-blur-[2px]",
            "data-[state=open]:animate-fade-in",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed end-0 top-0 bottom-0 z-50 w-full sm:w-[420px] max-w-full",
            "bg-bg-elevated border-s border-border shadow-2xl",
            "flex flex-col",
            "data-[state=open]:animate-slide-in-right",
            "focus:outline-none",
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            {t("dock.title", "SmartMENA assistant")}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {t(
              "dock.description",
              "AI insights and chat for your workspace.",
            )}
          </DialogPrimitive.Description>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-primary-soft text-primary grid place-items-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-fg truncate">
                    {t("dock.title", "SmartMENA assistant")}
                  </span>
                  <Badge
                    tone={llmEnabled ? "success" : "neutral"}
                    size="sm"
                    title={
                      llmEnabled
                        ? t(
                            "dock.mode.live",
                            "Live AI copilot (Azure OpenAI)",
                          )
                        : t(
                            "dock.mode.local",
                            "Grounded fallback · enable Azure OpenAI for richer answers",
                          )
                    }
                  >
                    {llmEnabled
                      ? t("dock.mode.liveShort", "AI")
                      : t("dock.mode.localShort", "Local")}
                  </Badge>
                </div>
                <div className="text-[11px] text-fg-muted truncate">
                  {hasAccounts
                    ? t("dock.subtitle", "Grounded in your workspace data")
                    : t("dock.emptyHint", "Connect an account to get personalized answers")}
                </div>
              </div>
            </div>
            <DialogPrimitive.Close
              className="rounded-md p-1.5 text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors"
              aria-label={t("common.close", "Close")}
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          {/* Tabs */}
          <div className="px-4 pt-3">
            <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
              <TabBtn active={tab === "insights"} onClick={() => setTab("insights")}>
                {t("dock.tab.insights", "Insights")}
                {insights.length > 0 ? (
                  <Badge tone="neutral" size="sm" className="ms-1">
                    {insights.length}
                  </Badge>
                ) : null}
              </TabBtn>
              <TabBtn active={tab === "chat"} onClick={() => setTab("chat")}>
                {t("dock.tab.chat", "Chat")}
              </TabBtn>
            </div>
          </div>

          {/* Body */}
          {tab === "insights" ? (
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {insightsQ.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 w-full rounded-lg bg-surface-muted animate-pulse"
                  />
                ))
              ) : insights.length > 0 ? (
                insights.map((i) => {
                  const title = locale === "ar" ? i.title_ar : i.title_en;
                  const body = locale === "ar" ? i.body_ar : i.body_en;
                  const tone: "warning" | "success" | "info" =
                    i.severity === "warning"
                      ? "warning"
                      : i.severity === "opportunity"
                        ? "success"
                        : "info";
                  return (
                    <div
                      key={i.id}
                      className="rounded-lg border border-border bg-surface p-3"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge tone={tone} size="sm">
                          {t(`insights.severity.${i.severity}`)}
                        </Badge>
                        <span className="text-sm font-medium text-fg">
                          {title}
                        </span>
                        <span className="ms-auto text-[10px] text-fg-subtle">
                          {relativeDate(i.generated_at, locale)}
                        </span>
                      </div>
                      {body ? (
                        <p className="text-xs text-fg-muted mt-1.5 leading-relaxed">
                          {body}
                        </p>
                      ) : null}
                      <div className="mt-2 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTab("chat");
                            const ask =
                              locale === "ar"
                                ? `أخبرني المزيد عن: ${title ?? ""}`
                                : `Tell me more about: ${title ?? ""}`;
                            send(ask);
                          }}
                          leftIcon={<MessageSquarePlus className="h-3 w-3" />}
                        >
                          {t("dock.ask", "Ask")}
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center">
                  <div className="mx-auto h-10 w-10 rounded-full bg-primary-soft text-primary grid place-items-center">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="mt-3 text-sm font-medium text-fg">
                    {t("dock.empty.title", "No insights yet")}
                  </div>
                  <p className="mt-1 text-xs text-fg-muted max-w-[260px] mx-auto">
                    {t(
                      "dock.empty.desc",
                      "Generate AI insights to see signals about your content and audience.",
                    )}
                  </p>
                  <Button size="sm" className="mt-3" asChild>
                    <Link href="/insights">
                      {t("insights.generate", "Generate insights")}
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
              >
                {messages.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="mx-auto h-10 w-10 rounded-full bg-primary-soft text-primary grid place-items-center">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div className="mt-3 text-sm font-medium text-fg">
                      {t("dock.chat.greeting", "Ask about your performance")}
                    </div>
                    <p className="mt-1 text-xs text-fg-muted max-w-[260px] mx-auto">
                      {t(
                        "dock.chat.hint",
                        "Answers are grounded in your workspace data.",
                      )}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => send(s)}
                          className="text-[11px] px-2.5 h-7 rounded-full border border-border bg-surface hover:bg-surface-muted text-fg-muted hover:text-fg transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((m) => (
                    <Bubble
                      key={m.id}
                      role={m.role}
                      text={m.text}
                      streaming={m.streaming}
                      error={m.error}
                    />
                  ))
                )}
              </div>

              <div className="border-t border-border p-3">
                <div className="relative flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={t(
                      "dock.chat.placeholder",
                      "Ask a question…",
                    )}
                    className={cn(
                      "flex-1 resize-none rounded-lg bg-surface border border-border",
                      "px-3 py-2 text-sm text-fg placeholder:text-fg-subtle",
                      "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
                      "max-h-32",
                    )}
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={() => {
                      if (isStreaming) {
                        streamRef.current?.abort();
                        setIsStreaming(false);
                        setMessages((m) =>
                          m.map((msg) =>
                            msg.streaming ? { ...msg, streaming: false } : msg,
                          ),
                        );
                        return;
                      }
                      send();
                    }}
                    disabled={!isStreaming && !draft.trim()}
                    aria-label={
                      isStreaming
                        ? t("dock.chat.stop", "Stop")
                        : t("dock.chat.send", "Send")
                    }
                  >
                    {isStreaming ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="mt-1.5 text-[10px] text-fg-subtle">
                  {t(
                    "dock.chat.foot",
                    "Press Enter to send · Shift+Enter for a new line",
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-selected={active}
      role="tab"
      className={cn(
        "inline-flex items-center gap-1 h-7 px-3 rounded-md text-xs font-medium transition-colors",
        active
          ? "bg-surface-muted text-fg shadow-sm"
          : "text-fg-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function Bubble({
  role,
  text,
  streaming,
  error,
}: {
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
  error?: string;
}) {
  const isUser = role === "user";
  const isEmptyStreaming = streaming && !text;
  return (
    <div
      className={cn(
        "flex items-start gap-2",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "shrink-0 h-7 w-7 rounded-full grid place-items-center",
          isUser
            ? "bg-primary text-primary-fg"
            : "bg-primary-soft text-primary",
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
      </div>
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-primary text-primary-fg rounded-tr-sm"
            : "bg-surface border border-border text-fg rounded-tl-sm",
          error ? "border-danger/40" : "",
        )}
      >
        {isEmptyStreaming ? (
          <span className="inline-flex items-center gap-1 text-fg-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-fg-muted animate-pulse" />
            <span
              className="h-1.5 w-1.5 rounded-full bg-fg-muted animate-pulse"
              style={{ animationDelay: "120ms" }}
            />
            <span
              className="h-1.5 w-1.5 rounded-full bg-fg-muted animate-pulse"
              style={{ animationDelay: "240ms" }}
            />
          </span>
        ) : (
          <>
            {text}
            {streaming ? (
              <span className="ms-0.5 inline-block w-1.5 h-3.5 align-[-2px] bg-fg/60 animate-pulse" />
            ) : null}
          </>
        )}
        {error && !streaming ? (
          <div className="mt-1 text-[10px] text-danger/80">{error}</div>
        ) : null}
      </div>
    </div>
  );
}
