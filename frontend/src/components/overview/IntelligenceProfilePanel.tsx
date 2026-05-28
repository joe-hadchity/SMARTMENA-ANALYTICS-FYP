"use client";

import { Activity, Brain, Compass, TrendingUp } from "lucide-react";

import type {
  IntelligenceProfileResponse,
  IntelligenceProfileScore,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

type Props = {
  data?: IntelligenceProfileResponse;
  loading?: boolean;
};

const SCORE_META = [
  {
    key: "brandHealth" as const,
    title: "Brand Health",
    subtitle: "How strong the brand signal looks today.",
    icon: Activity,
  },
  {
    key: "campaignReadiness" as const,
    title: "Campaign Readiness",
    subtitle: "Whether the next campaign is ready to move.",
    icon: Brain,
  },
  {
    key: "marketMomentum" as const,
    title: "Market Momentum",
    subtitle: "How active the market and references are.",
    icon: TrendingUp,
  },
];

export default function IntelligenceProfilePanel({ data, loading }: Props) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
      <div className="flex flex-col gap-2 border-b border-border/70 px-5 py-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">
            <Compass className="h-3.5 w-3.5" />
            SmartMENA Intelligence Profile
          </div>
          <h2 className="mt-1 text-lg font-semibold text-fg">
            Three scores, with the drivers that moved them
          </h2>
        </div>
        <p className="max-w-xl text-xs leading-relaxed text-fg-muted">
          A compact decision profile built from audience mood, campaign evidence,
          competitor activity, and trend signals.
        </p>
      </div>

      <div className="grid grid-cols-1 divide-y divide-border/70 xl:grid-cols-3 xl:divide-x xl:divide-y-0">
        {SCORE_META.map((meta) => (
          <ScoreBlock
            key={meta.key}
            icon={meta.icon}
            title={meta.title}
            subtitle={meta.subtitle}
            score={data?.scores[meta.key]}
            loading={loading}
          />
        ))}
      </div>
    </section>
  );
}

function ScoreBlock({
  icon: Icon,
  title,
  subtitle,
  score,
  loading,
}: {
  icon: typeof Activity;
  title: string;
  subtitle: string;
  score?: IntelligenceProfileScore;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="p-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-5 h-12 w-24" />
        <Skeleton className="mt-5 h-28 w-full" />
      </div>
    );
  }

  if (!score) {
    return (
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-fg">{title}</h3>
            <p className="mt-1 text-xs text-fg-muted">{subtitle}</p>
          </div>
          <Icon className="h-4 w-4 text-fg-subtle" />
        </div>
        <div className="mt-6 rounded-md border border-dashed border-border bg-surface-muted px-4 py-5 text-sm text-fg-muted">
          Score unavailable until the workspace has enough synced evidence.
        </div>
      </div>
    );
  }

  return (
    <article className="flex min-h-[360px] flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-fg">{title}</h3>
          <p className="mt-1 text-xs text-fg-muted">{subtitle}</p>
        </div>
        <span className="grid h-8 w-8 place-items-center rounded-md bg-surface-muted text-fg-muted">
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-semibold tracking-tight text-fg tabular-nums">
              {score.score}
            </span>
            <span className="text-sm font-medium text-fg-subtle">/100</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                statusClass(score.score),
              )}
            >
              {score.status}
            </span>
            <span className="text-[11px] text-fg-subtle">
              {Math.round(score.confidence * 100)}% confidence
            </span>
          </div>
        </div>
        <ScoreRing score={score.score} />
      </div>

      <p className="mt-4 min-h-[44px] text-xs leading-relaxed text-fg-muted">
        {score.explanation}
      </p>

      <div className="mt-4 space-y-2">
        {score.microDrivers.map((driver) => (
          <div
            key={driver.label}
            className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-surface-muted/50 px-3 py-2"
            title={driver.unavailableReason}
          >
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-fg">
                {driver.label}
              </div>
              <div className="text-[10px] text-fg-subtle">
                component {driver.componentScore}/100
                {driver.unavailableReason ? " - neutral until data arrives" : ""}
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                impactClass(driver.direction),
              )}
            >
              {driver.impact > 0 ? "+" : ""}
              {driver.impact.toFixed(1)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-4">
        <div className="rounded-md border border-brand-200 bg-brand-50/60 px-3 py-2 dark:border-brand-800 dark:bg-brand-950/30">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-600">
            Suggested next move
          </div>
          <p className="mt-1 text-xs leading-relaxed text-fg">
            {score.suggestedNextMove}
          </p>
        </div>
      </div>
    </article>
  );
}

function ScoreRing({ score }: { score: number }) {
  const angle = Math.round((score / 100) * 360);
  return (
    <div
      className="grid h-16 w-16 shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(hsl(var(--primary)) ${angle}deg, hsl(var(--border)) 0deg)`,
      }}
      aria-hidden="true"
    >
      <div className="h-12 w-12 rounded-full bg-surface" />
    </div>
  );
}

function statusClass(score: number) {
  if (score >= 80) return "bg-success/10 text-success";
  if (score >= 65) return "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300";
  if (score >= 50) return "bg-warning/10 text-warning";
  return "bg-danger/10 text-danger";
}

function impactClass(direction: "positive" | "negative" | "neutral") {
  if (direction === "positive") return "bg-success/10 text-success";
  if (direction === "negative") return "bg-danger/10 text-danger";
  return "bg-fg-subtle/10 text-fg-muted";
}
