"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Full-width empty state used when a section has nothing to display.
 * Fancier than `CardEmpty` (illustration tile + background orbs). Use
 * this at the page level so the first-time experience feels deliberate.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  cta,
  secondary,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  cta?: ReactNode;
  secondary?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-surface",
        "px-6 py-14 sm:py-16 text-center",
        className,
      )}
    >
      <div className="absolute inset-0 bg-orbs pointer-events-none" />
      <div className="relative flex flex-col items-center max-w-md mx-auto">
        {Icon ? (
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-2xl gradient-tile blur-xl opacity-60" />
            <div className="relative h-12 w-12 rounded-2xl gradient-tile grid place-items-center text-white shadow-md">
              <Icon className="h-5 w-5" />
            </div>
          </div>
        ) : null}
        <h3 className="text-base font-semibold tracking-tight text-fg">{title}</h3>
        {description ? (
          <p className="mt-1.5 text-sm text-fg-muted">{description}</p>
        ) : null}
        {cta || secondary ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {cta}
            {secondary}
          </div>
        ) : null}
      </div>
    </div>
  );
}
