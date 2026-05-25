"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { inboxApi, insightsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { InboxItem, Insight } from "@/lib/types";

type SignalTone = "positive" | "warning" | "risk" | "info";

type LiveSignal = {
  id: string;
  label: string;
  detail: string;
  href: string;
  tone: SignalTone;
  time?: string | null;
};

export default function LiveSignalsRibbon({
  collapsed,
  rightCollapsed,
}: {
  collapsed: boolean;
  rightCollapsed: boolean;
}) {
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
  const displaySignals = visibleSignals.slice(0, 8);
  const timeline = [...displaySignals, ...displaySignals];

  return (
    <div
      className={cn(
        "fixed bottom-0 right-0 z-30 border-t border-border bg-bg-elevated/95 backdrop-blur-xl",
        collapsed ? "lg:left-[72px]" : "lg:left-64",
        rightCollapsed ? "xl:right-[72px]" : "xl:right-[344px]",
      )}
    >
      <div className="flex h-12 items-center gap-3 px-3 md:px-4">
        <Link
          href="/inbox"
          className="group flex shrink-0 items-center gap-2 text-xs font-medium text-fg-muted transition-colors hover:text-fg"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="hidden sm:inline">Live Signals</span>
          <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] text-fg-subtle">
            {visibleSignals.length}
          </span>
        </Link>

        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="live-signals-track flex w-max items-center gap-1.5">
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
      className="group flex h-8 w-[295px] max-w-[76vw] items-center gap-2 rounded-md px-2 text-xs transition-colors hover:bg-surface-muted"
    >
      <span
        className={cn(
          "grid h-5 w-5 shrink-0 place-items-center rounded",
          signal.tone === "info" && "text-info",
          signal.tone === "positive" && "text-success",
          signal.tone === "warning" && "text-warning",
          signal.tone === "risk" && "text-danger",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium text-fg">{signal.label}</span>
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

function toneIcon(tone: SignalTone) {
  if (tone === "positive") return CheckCircle2;
  if (tone === "warning") return AlertTriangle;
  if (tone === "risk") return ShieldAlert;
  return MessageCircle;
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
