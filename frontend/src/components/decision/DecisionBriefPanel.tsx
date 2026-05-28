"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowUp,
  Bot,
  Brain,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  assistantApi,
  audienceInsightsApi,
  competitorsApi,
  inboxApi,
  trendIntelligenceApi,
  workspacesApi,
  type AudienceInsightsPayload,
} from "@/lib/api";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CompetitorComparisonResponse, Insight, TrendIntelligenceResponse } from "@/lib/types";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
};

export default function DecisionBriefPanel({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamRef = useRef<{ abort: () => void } | null>(null);

  const workspaceQ = useQuery({
    queryKey: ["workspace", "current"],
    queryFn: workspacesApi.current,
  });
  const competitorQ = useQuery({
    queryKey: ["decision-brief", "competitors", 30],
    queryFn: () => competitorsApi.comparison(30),
    refetchInterval: 60_000,
  });
  const trendQ = useQuery({
    queryKey: ["decision-brief", "trends", workspaceQ.data?.id],
    queryFn: () =>
      trendIntelligenceApi.get(workspaceQ.data!.id, {
        scope: "all",
        limit: 8,
      }),
    enabled: !!workspaceQ.data?.id,
    refetchInterval: 60_000,
  });
  const audienceQ = useQuery({
    queryKey: ["decision-brief", "audience", 30],
    queryFn: () => audienceInsightsApi.get({ days: 30 }),
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
        competitors: competitorQ.data,
        trends: trendQ.data,
        audience: audienceQ.data,
        unread: inboxSummaryQ.data?.unread ?? 0,
      }),
    [competitorQ.data, trendQ.data, audienceQ.data, inboxSummaryQ.data?.unread],
  );

  if (collapsed) {
    return (
      <aside className="sticky top-0 h-screen w-full border-s border-border bg-bg-elevated/95 backdrop-blur-xl">
        <div className="flex h-full flex-col items-center overflow-hidden px-2">
          <div className="flex w-full justify-center border-b border-border py-3">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="grid h-9 w-9 place-items-center rounded-md text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
              aria-label="Expand AI Decision Brief"
              title="Expand AI Decision Brief"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="flex w-full flex-1 flex-col items-center py-4">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="group flex w-full flex-col items-center rounded-md py-2 transition-colors hover:bg-surface-muted"
              title={`AI Decision Brief: ${brief.score}/100`}
            >
              <span className="relative grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                <Brain className="h-4 w-4" />
                <span
                  className={cn(
                    "absolute -end-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-bg-elevated",
                    brief.tone === "success" && "bg-success",
                    brief.tone === "warning" && "bg-warning",
                    brief.tone === "danger" && "bg-danger",
                    brief.tone === "info" && "bg-info",
                  )}
                />
              </span>
              <span className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
                Brief
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleCollapse}
              className="mt-3 flex h-14 w-full flex-col items-center justify-center rounded-md border border-border bg-surface-muted/45 transition-colors hover:bg-surface-muted"
              title={`Readiness: ${brief.score}/100`}
            >
              <span className="text-base font-semibold leading-none text-fg">{brief.score}</span>
              <span className="mt-1 text-[9px] uppercase tracking-wide text-fg-subtle">
                /100
              </span>
            </button>

            <div className="my-4 h-px w-8 bg-border" />

            <div className="flex w-full flex-col items-center gap-2">
              <CollapsedMetric
                icon={Target}
                value={brief.opportunity}
                label="Opportunity"
                tone="success"
                onClick={onToggleCollapse}
              />
              <CollapsedMetric
                icon={ShieldAlert}
                value={brief.risk}
                label="Main risk"
                tone="danger"
                onClick={onToggleCollapse}
              />
              <CollapsedMetric
                icon={Clock3}
                value={brief.bestWindow}
                label="Best window"
                tone="warning"
                onClick={onToggleCollapse}
              />
              <CollapsedMetric
                icon={Users}
                value={brief.audience}
                label="Audience"
                tone="info"
                onClick={onToggleCollapse}
              />
            </div>
          </div>
        </div>
      </aside>
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
    <aside className="sticky top-0 flex h-screen w-full flex-col overflow-hidden border-s border-border bg-bg-elevated/95 backdrop-blur-xl">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-7 w-7 place-items-center rounded-md text-primary">
            <Brain className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-fg">AI Decision Brief</h2>
            <p className="text-[11px] text-fg-muted">Score, risk, timing, next move.</p>
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="grid h-8 w-8 place-items-center rounded-md text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
            aria-label="Collapse AI Decision Brief"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <section className="border-b border-border/70 pb-4">
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
              <div className="text-base font-semibold text-fg">{brief.confidence}%</div>
            </div>
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-muted">
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
          <BriefTile icon={Target} label="Opportunity" value={brief.opportunity} />
          <BriefTile icon={ShieldAlert} label="Main risk" value={brief.risk} />
          <BriefTile icon={Clock3} label="Best Window" value={brief.bestWindow} />
          <BriefTile icon={Users} label="Audience" value={brief.audience} />
        </div>

        <section className="mt-4 space-y-3 border-t border-border/70 pt-4">
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

        <div className="mt-4 space-y-2 border-t border-border/70 pt-4">
          {messages.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-surface-muted/40 p-3 text-xs leading-relaxed text-fg-muted">
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
                    : "me-6 border-border bg-surface-muted/45 text-fg-muted",
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

      <div className="border-t border-border bg-bg-elevated/95 p-3">
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
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border/80 bg-surface-muted/35 px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 line-clamp-2 text-xs font-semibold leading-snug text-fg">{value}</div>
    </div>
  );
}

function CollapsedMetric({
  icon: Icon,
  value,
  label,
  tone,
  onClick,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  tone: "success" | "warning" | "danger" | "info";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative grid h-10 w-full place-items-center rounded-md text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
      title={`${label}: ${value}`}
    >
      <span
        className={cn(
          "absolute start-1 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full opacity-70",
          tone === "success" && "bg-success",
          tone === "warning" && "bg-warning",
          tone === "danger" && "bg-danger",
          tone === "info" && "bg-info",
        )}
      />
      <Icon className="h-4 w-4 transition-transform group-hover:scale-105" />
      <span className="sr-only">{`${label}: ${value}`}</span>
    </button>
  );
}

function buildBrief({
  competitors,
  trends,
  audience,
  unread,
}: {
  competitors: CompetitorComparisonResponse | undefined;
  trends: TrendIntelligenceResponse | undefined;
  audience: AudienceInsightsPayload | undefined;
  unread: number;
}) {
  const topTrend = [...(trends?.local_trends ?? []), ...(trends?.global_trends ?? [])].sort(
    (a, b) => b.trend_score - a.trend_score,
  )[0];
  const trendRecommendation = [...(trends?.recommendations ?? [])].sort(
    (a, b) => b.priority_score - a.priority_score,
  )[0];
  const sentiment = pickAudienceSentiment(audience);
  const positiveShare = sentiment?.total ? sentiment.positive / sentiment.total : 0;
  const negativeShare = sentiment?.total ? sentiment.negative / sentiment.total : 0;
  const competitorCoverage = competitors?.benchmark?.data_quality_score ?? 0;
  const trendStrength = topTrend?.trend_score ?? 0;
  const audienceCoverage = sentiment?.coverage ?? 0;
  const competitorAdvantage =
    competitors?.benchmark?.engagement_winner === "you"
      ? 12
      : competitors?.benchmark?.engagement_winner === "competitors"
        ? -10
        : 0;

  const baseScore =
    44 +
    competitorAdvantage +
    Math.min(16, competitorCoverage * 0.16) +
    Math.min(18, trendStrength * 0.18) +
    Math.min(12, audienceCoverage * 12) +
    positiveShare * 12 -
    negativeShare * 16 -
    Math.min(10, unread * 2);
  const score = clamp(Math.round(baseScore), 18, 94);
  const confidence = clamp(
    Math.round(
      42 +
        Math.min(24, competitorCoverage * 0.24) +
        Math.min(22, (topTrend?.evidence_count ?? 0) * 2) +
        Math.min(18, audienceCoverage * 18),
    ),
    42,
    91,
  );

  const opportunity = buildOpportunity(competitors, trends);
  const risk = buildRisk(competitors, trends, audience, unread);
  const bestWindow = buildBestWindow(audience);
  const audienceSignal = buildAudienceSignal(audience);
  const verdict = score >= 72 ? "Strong opportunity" : score >= 52 ? "Needs focus" : "Risky move";
  const tone = score >= 72 ? "success" : score >= 52 ? "warning" : "danger";

  return {
    score,
    confidence,
    verdict,
    tone: tone as "success" | "warning" | "danger" | "info",
    bestWindow,
    audience: audienceSignal,
    risk,
    opportunity,
    recommendation:
      score >= 72
        ? "Move forward with the competitor gap, active trend, and audience timing aligned."
        : score >= 52
          ? "Tighten the campaign around the strongest trend, then reduce the competitor or audience risk before publishing."
          : "Hold the campaign until competitor evidence, trend strength, or audience response improves.",
    why: [
      competitors?.benchmark?.format_gap?.message,
      trendRecommendation?.recommendation_text,
      audienceSignal,
    ]
      .filter(Boolean)
      .join(" "),
  };
}

function buildOpportunity(
  competitors?: CompetitorComparisonResponse,
  trends?: TrendIntelligenceResponse,
) {
  const competitorOpportunity = competitors?.opportunities?.find(
    (item) => item.priority === "high" || item.priority === "medium",
  );
  if (competitorOpportunity) return competitorOpportunity.title;

  const trendRecommendation = [...(trends?.recommendations ?? [])].sort(
    (a, b) => b.priority_score - a.priority_score,
  )[0];
  if (trendRecommendation) return trendRecommendation.recommendation_text;

  const topTheme = [...(trends?.campaign_theme_trends ?? [])].sort(
    (a, b) => b.trend_score - a.trend_score,
  )[0];
  if (topTheme) return topTheme.suggested_angle;

  const competitorFormat = competitors?.competitors_summary?.top_format;
  if (competitorFormat) return `Test competitor-leading ${formatLabel(competitorFormat)} content.`;

  return "Refresh competitors and trends to reveal the strongest opportunity.";
}

function buildRisk(
  competitors?: CompetitorComparisonResponse,
  trends?: TrendIntelligenceResponse,
  audience?: AudienceInsightsPayload,
  unread = 0,
) {
  if (unread > 0) {
    return `${unread} unread audience ${unread === 1 ? "message" : "messages"}`;
  }

  const sentiment = pickAudienceSentiment(audience);
  if (sentiment?.total) {
    const negativeShare = sentiment.negative / sentiment.total;
    if (negativeShare >= 0.3) {
      return `${formatPercent(negativeShare, 0, "en")} negative audience response`;
    }
  }

  if (competitors?.benchmark?.engagement_winner === "competitors") {
    return competitors.benchmark.best_benchmark
      ? `Competitor @${competitors.benchmark.best_benchmark.handle} is ahead`
      : "Competitors are ahead on engagement";
  }

  if (competitors?.benchmark?.data_quality_label === "thin") {
    return "Competitor evidence is still thin";
  }

  if (trends?.warnings?.length) {
    return "Trend evidence needs refresh";
  }

  return "Low current risk";
}

function buildBestWindow(audience?: AudienceInsightsPayload) {
  const topHour = [...(audience?.active_times?.by_hour ?? [])].sort((a, b) => b.score - a.score)[0];
  const topDay = [...(audience?.active_times?.by_day ?? [])].sort((a, b) => b.score - a.score)[0];
  if (topHour) {
    const start = String(topHour.hour).padStart(2, "0");
    const end = String((topHour.hour + 1) % 24).padStart(2, "0");
    return topDay?.day ? `${topDay.day} ${start}:00-${end}:00` : `${start}:00-${end}:00`;
  }
  return "Refresh audience activity";
}

function buildAudienceSignal(audience?: AudienceInsightsPayload) {
  const topCity = [...(audience?.top_cities ?? [])].sort((a, b) => b.value - a.value)[0];
  const topAge = [...(audience?.age_ranges ?? [])].sort((a, b) => b.value - a.value)[0];
  const sentiment = pickAudienceSentiment(audience);

  if (sentiment?.total) {
    const positive = sentiment.positive / sentiment.total;
    const place = topCity ? ` in ${topCity.name}` : "";
    const age = topAge ? `, strongest age ${topAge.range}` : "";
    return `${formatPercent(positive, 0, "en")} positive audience mood${place}${age}.`;
  }

  if (topCity || topAge) {
    return `${topCity ? `Top city: ${topCity.name}` : "Audience geography ready"}${
      topAge ? `, strongest age ${topAge.range}` : ""
    }.`;
  }

  return "Refresh audience insights to identify the active segment.";
}

function pickAudienceSentiment(audience?: AudienceInsightsPayload) {
  return (
    audience?.comment_sentiment_distribution ??
    audience?.sentiment_distribution ??
    audience?.caption_sentiment_distribution
  );
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
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
