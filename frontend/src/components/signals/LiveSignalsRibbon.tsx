"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  MessageCircle,
  Radio,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { inboxApi, insightsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { InboxItem, Insight } from "@/lib/types";

type SignalTone = "positive" | "warning" | "risk" | "info";
type SignalFilter = "all" | SignalTone;

type LiveSignal = {
  id: string;
  label: string;
  detail: string;
  href: string;
  tone: SignalTone;
  time?: string | null;
};

export default function LiveSignalsRibbon({ collapsed }: { collapsed: boolean }) {
  const [hidden, setHidden] = useState(false);
  const [filter, setFilter] = useState<SignalFilter>("all");

  const inboxQ = useQuery({
    queryKey: ["live-signals", "inbox"],
    queryFn: () => inboxApi.list({ limit: 12, status: "all", type: "all" }),
    refetchInterval: 20_000,
  });

  const summaryQ = useQuery({
    queryKey: ["live-signals", "inbox-summary"],
    queryFn: inboxApi.summary,
    refetchInterval: 20_000,
  });

  const insightsQ = useQuery({
    queryKey: ["live-signals", "insights"],
    queryFn: () => insightsApi.list({ limit: 8 }),
    refetchInterval: 60_000,
  });

  const signals = useMemo(
    () => buildSignals(inboxQ.data ?? [], insightsQ.data ?? [], summaryQ.data?.unread ?? 0),
    [inboxQ.data, insightsQ.data, summaryQ.data?.unread],
  );

  const isLoading = inboxQ.isLoading || insightsQ.isLoading;
  const hasError = inboxQ.isError && insightsQ.isError;
  const visibleSignals = signals.length ? signals : fallbackSignals(hasError, isLoading);
  const filteredSignals =
    filter === "all"
      ? visibleSignals
      : visibleSignals.filter((signal) => signal.tone === filter);
  const displaySignals = filteredSignals.length ? filteredSignals : [emptyFilterSignal(filter)];
  const timeline = [...displaySignals, ...displaySignals];
  const counts = countSignals(visibleSignals);

  if (hidden) {
    return (
      <div
        className={cn(
          "fixed bottom-4 z-30",
          collapsed ? "left-4 lg:left-[88px]" : "left-4 lg:left-[272px]",
        )}
      >
        <button
        type="button"
        onClick={() => setHidden(false)}
          className="flex items-center gap-2 rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs font-semibold text-fg shadow-md backdrop-blur-xl transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <Radio className="h-3.5 w-3.5 text-primary" />
          Live Signals
          <Badge tone="brand" size="sm">
            {visibleSignals.length}
          </Badge>
          <ChevronUp className="h-3.5 w-3.5 text-fg-muted" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 right-0 z-30 border-t border-border bg-bg-elevated/96 shadow-[0_-10px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl xl:right-[384px]",
        collapsed ? "lg:left-[72px]" : "lg:left-64",
      )}
    >
      <div className="flex min-h-[86px] flex-col gap-2 px-4 py-2.5 md:px-5">
        <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/inbox"
            className="group flex shrink-0 items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <span className="relative grid h-7 w-7 place-items-center rounded-md bg-primary-soft text-primary">
            <Radio className="h-3.5 w-3.5" />
            <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-success" />
          </span>
          <span>
            <span className="block text-xs font-semibold text-fg">Live Signals</span>
            <span className="hidden text-[10px] text-fg-muted md:block">Inbox and decision pulses</span>
          </span>
        </Link>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            <FilterButton active={filter === "all"} onClick={() => setFilter("all")} label="All" count={visibleSignals.length} />
            <FilterButton active={filter === "positive"} onClick={() => setFilter("positive")} label="Positive" count={counts.positive} tone="positive" />
            <FilterButton active={filter === "warning"} onClick={() => setFilter("warning")} label="Warn" count={counts.warning} tone="warning" />
            <FilterButton active={filter === "risk"} onClick={() => setFilter("risk")} label="Risk" count={counts.risk} tone="risk" />
            <FilterButton active={filter === "info"} onClick={() => setFilter("info")} label="Info" count={counts.info} tone="info" />
          </div>

          <button
            type="button"
            onClick={() => setHidden(true)}
            className="ms-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-fg-muted transition-colors hover:border-primary/40 hover:text-fg"
          >
            Hide
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="live-signals-track flex w-max items-center gap-2">
            {timeline.map((signal, index) => (
              <SignalPill key={`${signal.id}-${index}`} signal={signal} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SignalPill({ signal }: { signal: LiveSignal }) {
  const Icon = toneIcon(signal.tone);

  return (
    <Link
      href={signal.href}
      className="group flex h-10 w-[315px] max-w-[78vw] items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-sm shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <span
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center rounded-md",
          signal.tone === "info" && "bg-info-soft text-info",
          signal.tone === "positive" && "bg-success-soft text-success",
          signal.tone === "warning" && "bg-warning-soft text-warning",
          signal.tone === "risk" && "bg-danger-soft text-danger",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate text-xs font-semibold text-fg">{signal.label}</span>
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", toneDot(signal.tone))} />
          {signal.time ? (
            <span className="shrink-0 text-[10px] text-fg-subtle">{signal.time}</span>
          ) : null}
        </span>
        <span className="block truncate text-[11px] text-fg-muted">{signal.detail}</span>
      </span>
    </Link>
  );
}

function FilterButton({
  active,
  onClick,
  label,
  count,
  tone = "info",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone?: SignalTone;
}) {
  const Icon = tone === "positive" ? CheckCircle2 : tone === "warning" ? AlertTriangle : tone === "risk" ? ShieldAlert : Info;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-primary-fg"
          : "border-border bg-surface text-fg-muted hover:border-primary/40 hover:text-fg",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
      <span
        className={cn(
          "rounded px-1 py-0.5 text-[10px]",
          active ? "bg-primary-fg/15 text-primary-fg" : "bg-surface-muted text-fg-subtle",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function buildSignals(inbox: InboxItem[], insights: Insight[], unread: number): LiveSignal[] {
  const inboxSignals = inbox
    .filter((item) => item.direction === "inbound")
    .slice(0, 5)
    .map((item) => ({
      id: `inbox-${item.id}`,
      label: item.item_type === "comment" ? "New comment" : "New DM",
      detail: `${item.author_username ? `@${item.author_username}: ` : ""}${item.body}`,
      href: "/inbox",
      tone: "info" as const,
      time: relativeTime(item.published_at || item.created_at),
    }));

  const insightSignals = insights.slice(0, 5).map((insight) => ({
    id: `insight-${insight.id}`,
    label: insightTitle(insight),
    detail: insightBody(insight),
    href: "/insights",
    tone:
      insight.severity === "warning"
        ? ("warning" as const)
        : insight.severity === "opportunity"
          ? ("positive" as const)
          : ("info" as const),
    time: relativeTime(insight.generated_at),
  }));

  const summarySignal: LiveSignal | null =
    unread > 0
      ? {
          id: "summary-unread",
          label: `${unread} unread audience ${unread === 1 ? "signal" : "signals"}`,
          detail: "Open the inbox before replying or archiving.",
          href: "/inbox",
          tone: "risk",
        }
      : null;

  return [summarySignal, ...inboxSignals, ...insightSignals].filter(Boolean) as LiveSignal[];
}

function fallbackSignals(hasError: boolean, isLoading: boolean): LiveSignal[] {
  if (isLoading) {
    return [
      {
        id: "loading",
        label: "Listening for signals",
        detail: "Checking Meta inbox, AI insights, and workspace activity.",
        href: "/inbox",
        tone: "info",
      },
    ];
  }
  if (hasError) {
    return [
      {
        id: "error",
        label: "Signal feed needs attention",
        detail: "Some live sources did not respond. Backend may need a refresh.",
        href: "/connections",
        tone: "risk",
      },
    ];
  }
  return [
    {
      id: "quiet",
      label: "No urgent signals",
      detail: "SmartMENA is listening for new DMs, comments, and insight changes.",
      href: "/inbox",
      tone: "positive",
    },
    {
      id: "webhook",
      label: "Meta webhook ready",
      detail: "New audience messages will appear here as they arrive.",
      href: "/connections",
      tone: "info",
    },
  ];
}

function emptyFilterSignal(filter: SignalFilter): LiveSignal {
  return {
    id: `empty-${filter}`,
    label: `No ${filter} signals`,
    detail: "Try another filter or wait for the next workspace update.",
    href: "/inbox",
    tone: filter === "all" ? "info" : filter,
  };
}

function countSignals(signals: LiveSignal[]) {
  return signals.reduce(
    (acc, signal) => {
      acc[signal.tone] += 1;
      return acc;
    },
    { positive: 0, warning: 0, risk: 0, info: 0 } as Record<SignalTone, number>,
  );
}

function toneIcon(tone: SignalTone) {
  if (tone === "positive") return CheckCircle2;
  if (tone === "warning") return AlertTriangle;
  if (tone === "risk") return ShieldAlert;
  return tone === "info" ? MessageCircle : Sparkles;
}

function toneLabel(tone: SignalTone) {
  if (tone === "positive") return "Positive";
  if (tone === "warning") return "Warn";
  if (tone === "risk") return "Risk";
  return "Info";
}

function toneDot(tone: SignalTone) {
  if (tone === "positive") return "bg-success";
  if (tone === "warning") return "bg-warning";
  if (tone === "risk") return "bg-danger";
  return "bg-info";
}

function insightTitle(insight: Insight) {
  return insight.title_en || insight.title_ar || titleCase(insight.insight_type.replace(/_/g, " "));
}

function insightBody(insight: Insight) {
  return insight.body_en || insight.body_ar || "Review this workspace signal.";
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function relativeTime(value?: string | null) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  const diff = Date.now() - time;
  const minutes = Math.max(0, Math.round(diff / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}
