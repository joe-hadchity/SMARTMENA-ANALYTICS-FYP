import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type Crumb = { label: string; href?: string };

/**
 * Page-level header with three intentionally different rhythms.
 *
 *   • "default"  — full editorial header for destination pages (Insights, Reports).
 *                  Eyebrow + bold title + subtitle + breadcrumbs.
 *
 *   • "compact"  — single inline row for list/tool pages (Posts, Campaigns,
 *                  Connections). Title left, actions right. No subtitle.
 *
 *   • "inline"   — minimal hairline header for tool pages (Compose, Calendar)
 *                  where the workspace below should dominate.
 *
 * Picking the right variant per page is the single biggest fix for the
 * "every screen looks the same" feel.
 */
export default function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  breadcrumbs,
  variant = "default",
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  breadcrumbs?: Crumb[];
  variant?: "default" | "compact" | "inline";
  className?: string;
}) {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
          className,
        )}
      >
        <h1 className="text-xl font-semibold tracking-tight text-fg truncate">
          {title}
        </h1>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {actions}
          </div>
        ) : null}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "mb-3 flex items-center justify-between gap-3 text-sm",
          className,
        )}
      >
        <span className="font-medium text-fg-muted">{title}</span>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mb-6 border-b border-border/70 pb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1 text-xs text-fg-muted mb-2"
          >
            {breadcrumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {c.href ? (
                  <Link
                    href={c.href}
                    className="hover:text-fg transition-colors"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-fg">{c.label}</span>
                )}
                {i < breadcrumbs.length - 1 ? (
                  <ChevronRight className="h-3 w-3 text-fg-subtle rtl:rotate-180" />
                ) : null}
              </span>
            ))}
          </nav>
        ) : null}

        {eyebrow ? (
          <div className="text-[11px] uppercase tracking-[0.12em] text-fg-subtle font-semibold mb-1.5">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-[1.65rem] font-semibold leading-tight text-fg">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-sm text-fg-muted mt-2 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      ) : null}
    </div>
  );
}
