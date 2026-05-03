import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type Crumb = { label: string; href?: string };

export default function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  breadcrumbs,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  breadcrumbs?: Crumb[];
  className?: string;
}) {
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
