"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowUp,
  Bot,
  Brain,
  ChevronRight,
  Clock3,
  Gauge,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { analyticsApi, assistantApi, insightsApi, inboxApi } from "@/lib/api";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Insight } from "@/lib/types";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
};

export default function DecisionBriefPanel() {
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamRef = useRef<{ abort: () => void } | null>(null);

  const overviewQ = useQuery({
    queryKey: ["decision-brief", "overview"],
    queryFn: analyticsApi.overview,
    refetchInterval: 60_000,
  });
  const sentimentQ = useQuery({
    queryKey: ["decision-brief", "sentiment"],
    queryFn: analyticsApi.sentimentBreakdown,
    refetchInterval: 60_000,
  });
  const topQ = useQuery({
    queryKey: ["decision-brief", "top-posts"],
    queryFn: () => analyticsApi.topPosts({ limit: 5, sortBy: "engagement" }),
    refetchInterval: 60_000,
  });
  const insightsQ = useQuery({
    queryKey: ["decision-brief", "insights"],
    queryFn: () => insightsApi.list({ limit: 12 }),
    refetchInterval: 60_000,
  });
  const inboxSummaryQ = useQuery({
    queryKey: ["decision-brief", "inbox-summary"],
    queryFn: inboxApi.summary,
    refetchInterval: 30_000,
  });

  const brief = useMemo(
    () =>
      buildBrief({
        overview: overviewQ.data,
        sentiment: sentimentQ.data,
        topPosts: topQ.data ?? [],
        insights: insightsQ.data ?? [],
        unread: inboxSummaryQ.data?.unread ?? 0,
      }),
    [overviewQ.data, sentimentQ.data, topQ.data, insightsQ.data, inboxSummaryQ.data?.unread],
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 top-24 z-30 flex items-center gap-2 rounded-full border border-border bg-bg-elevated px-3 py-2 text-xs font-semibold text-fg shadow-lg backdrop-blur-xl transition-colors hover:border-primary/40 hover:bg-primary/5"
      >
        <Brain className="h-4 w-4 text-primary" />
        AI Decision Brief
        <Badge tone={brief.tone} size="sm">
          {brief.score}
        </Badge>
      </button>
    );
  }

  const send = () => {
    const clean = draft.trim();
    if (!clean || isStreaming) return;
    const userMsg: ChatMsg = {
      id: `u_${Date.now()}`,
      role: "user",
      text: clean,
    };
    const assistantId = `a_${Date.now()}`;
    setMessages((items) => [
      ...items,
      userMsg,
      { id: assistantId, role: "assistant", text: "", streaming: true },
    ]);
    setDraft("");
    setIsStreaming(true);

    const contextPrompt = [
      clean,
      "",
      "Answer as SmartMENA's AI Decision Brief. Be concise, practical, and grounded in the current workspace.",
      `Current brief score: ${brief.score}/100.`,
      `Confidence: ${brief.confidence}%.`,
      `Main opportunity: ${brief.opportunity}.`,
      `Main risk: ${brief.risk}.`,
      `Best window: ${brief.bestWindow}.`,
      `Audience signal: ${brief.audience}.`,
    ].join("\n");

    const stream = assistantApi.streamChat(
      { message: contextPrompt, conversationId, locale: "en" },
      {
        onConversation: (id) => setConversationId(id),
        onToken: (delta) => {
          setMessages((items) =>
            items.map((item) =>
              item.id === assistantId ? { ...item, text: item.text + delta } : item,
            ),
          );
        },
        onError: (_code, message) => {
          setMessages((items) =>
            items.map((item) =>
              item.id === assistantId
                ? { ...item, text: message || "Assistant could not answer.", streaming: false }
                : item,
            ),
          );
          setIsStreaming(false);
        },
        onDone: () => {
          setMessages((items) =>
            items.map((item) => (item.id === assistantId ? { ...item, streaming: false } : item)),
          );
          setIsStreaming(false);
        },
      },
    );
    streamRef.current = stream;
    void stream.done.finally(() => setIsStreaming(false));
  };

  return (
    <aside className="fixed bottom-[132px] right-3 top-20 z-30 hidden w-[360px] flex-col overflow-hidden rounded-lg border border-border bg-bg-elevated shadow-xl backdrop-blur-xl xl:flex">
      <div className="border-b border-border bg-surface px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary-soft text-primary">
            <Brain className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-fg">AI Decision Brief</h2>
            <p className="text-[11px] text-fg-muted">Score, risk, window, next move.</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-md text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
            aria-label="Hide AI Decision Brief"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <section className="border-b border-border pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                Readiness
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-semibold leading-none text-fg">{brief.score}</span>
                <span className="text-xs text-fg-muted">/100</span>
                <Badge tone={brief.tone} size="sm">
                  {brief.verdict}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-fg-subtle">Confidence</div>
              <div className="text-lg font-semibold text-fg">{brief.confidence}%</div>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div
              className={cn(
                "h-full rounded-full",
                brief.tone === "success" && "bg-success",
                brief.tone === "warning" && "bg-warning",
                brief.tone === "danger" && "bg-danger",
                brief.tone === "info" && "bg-info",
              )}
              style={{ width: `${brief.score}%` }}
            />
          </div>
        </section>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <BriefTile icon={Gauge} label="Confidence" value={`${brief.confidence}%`} />
          <BriefTile icon={Clock3} label="Best window" value={brief.bestWindow} />
          <BriefTile icon={Target} label="Opportunity" value={brief.opportunity} />
          <BriefTile icon={ShieldAlert} label="Main risk" value={brief.risk} />
        </div>

        <section className="mt-3 space-y-3 border-t border-border pt-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Suggested move
            </div>
            <p className="mt-1 text-sm leading-relaxed text-fg">{brief.recommendation}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
            <Users className="h-4 w-4 text-primary" />
              Audience
          </div>
            <p className="mt-1 text-sm leading-relaxed text-fg-muted">{brief.audience}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
              <Brain className="h-3.5 w-3.5 text-primary" />
              Why
            </div>
            <p className="mt-1 text-sm leading-relaxed text-fg-muted">{brief.why}</p>
          </div>
        </section>

        <div className="mt-4 space-y-2 border-t border-border pt-3">
          {messages.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-surface-muted/50 p-3 text-xs leading-relaxed text-fg-muted">
              Ask why the score changed, what to publish next, or how to reduce risk.
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "rounded-md border p-2.5 text-xs leading-relaxed",
                  message.role === "user"
                    ? "ms-6 border-primary/20 bg-primary/5 text-fg"
                    : "me-6 border-border bg-surface text-fg-muted",
                )}
              >
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-fg">
                  {message.role === "user" ? (
                    <MessageSquare className="h-3.5 w-3.5" />
                  ) : (
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  )}
                  {message.role === "user" ? "You" : "Decision AI"}
                  {message.streaming ? <span className="text-fg-subtle">typing...</span> : null}
                </div>
                {message.text || "Thinking..."}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border-t border-border bg-surface p-2.5">
        <div className="flex gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            rows={2}
            className="input min-h-[42px] flex-1 resize-none text-sm"
            placeholder="Ask what to do next..."
          />
          <Button
            className="h-auto self-stretch"
            onClick={send}
            disabled={!draft.trim() || isStreaming}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

function BriefTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-surface px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 line-clamp-2 text-xs font-semibold leading-snug text-fg">{value}</div>
    </div>
  );
}

function buildBrief({
  overview,
  sentiment,
  topPosts,
  insights,
  unread,
}: {
  overview: Awaited<ReturnType<typeof analyticsApi.overview>> | undefined;
  sentiment: Awaited<ReturnType<typeof analyticsApi.sentimentBreakdown>> | undefined;
  topPosts: Awaited<ReturnType<typeof analyticsApi.topPosts>>;
  insights: Insight[];
  unread: number;
}) {
  const engagement = overview?.averages.engagementRate ?? 0;
  const roi = overview?.averages.predictedRoi ?? 0;
  const positiveShare = sentiment?.shares.positive ?? 0;
  const warningCount = insights.filter((item) => item.severity === "warning").length;
  const opportunityCount = insights.filter((item) => item.severity === "opportunity").length;

  const baseScore =
    42 +
    Math.min(22, engagement * 240) +
    Math.min(16, Math.max(0, roi) * 6) +
    positiveShare * 16 +
    opportunityCount * 2 -
    warningCount * 4 -
    Math.min(12, unread * 2);
  const score = clamp(Math.round(baseScore), 18, 94);
  const confidence = clamp(
    Math.round(48 + Math.min(22, (overview?.totals.syncedPosts ?? 0) * 2) + insights.length * 2),
    42,
    91,
  );

  const warning = insights.find((item) => item.severity === "warning");
  const opportunity = insights.find((item) => item.severity === "opportunity");
  const bestTime = insights.find((item) => item.insight_type === "best_posting_time");
  const topPost = topPosts[0];

  const verdict = score >= 72 ? "Strong opportunity" : score >= 52 ? "Needs focus" : "Risky move";
  const tone = score >= 72 ? "success" : score >= 52 ? "warning" : "danger";
  const bestWindow =
    extractWindow(bestTime) || (topPost?.posted_at ? "Repeat the top post window" : "Evening 19:00-22:00");
  const audience =
    sentiment && sentiment.total > 0
      ? `${formatPercent(positiveShare, 0, "en")} positive audience mood across ${sentiment.total} analyzed items.`
      : "Audience mood needs more comments or captions before the model can be confident.";
  const risk =
    unread > 0
      ? `${unread} unread audience ${unread === 1 ? "message" : "messages"}`
      : warning
        ? insightTitle(warning)
        : "Low recent risk";
  const mainOpportunity = opportunity
    ? insightTitle(opportunity)
    : topPost
      ? `${topPost.post_type || "Post"} content is leading engagement`
      : "Sync more posts to reveal the strongest opportunity";

  return {
    score,
    confidence,
    verdict,
    tone: tone as "success" | "warning" | "danger" | "info",
    bestWindow,
    audience,
    risk,
    opportunity: mainOpportunity,
    recommendation:
      score >= 72
        ? "Move forward with a focused campaign variation and keep the strongest audience angle visible."
        : score >= 52
          ? "Revise the campaign before publishing: tighten the hook, reduce risk, and post in the strongest window."
          : "Do not publish as-is. Resolve the main risk and gather more audience signal first.",
    why:
      opportunity || warning
        ? [opportunity ? insightBody(opportunity) : null, warning ? insightBody(warning) : null]
            .filter(Boolean)
            .join(" ")
        : topPost
          ? `Your strongest recent post generated ${topPost.engagement} engagements, so the brief favors similar structure and timing.`
          : "The brief is using current workspace coverage, sentiment, ROI, inbox pressure, and recent AI insights.",
  };
}

function insightTitle(insight: Insight) {
  return insight.title_en || insight.title_ar || insight.insight_type.replace(/_/g, " ");
}

function insightBody(insight: Insight) {
  return insight.body_en || insight.body_ar || "";
}

function extractWindow(insight?: Insight) {
  if (!insight) return null;
  const body = insightBody(insight);
  const match = body.match(/\b([01]?\d|2[0-3])(?::00)?\s*[–-]\s*([01]?\d|2[0-3])(?::00)?\b/);
  return match ? `${match[1].padStart(2, "0")}:00-${match[2].padStart(2, "0")}:00` : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
