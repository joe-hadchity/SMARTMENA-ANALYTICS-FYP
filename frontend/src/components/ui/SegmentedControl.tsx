"use client";

import { cn } from "@/lib/utils";

/**
 * Horizontal one-of-many picker. Smaller + more dense than Tabs; we use
 * it for time-range switching, view toggles, etc.
 */
export type SegmentedOption<V extends string> = {
  value: V;
  label: string;
};

export function SegmentedControl<V extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: {
  options: SegmentedOption<V>[];
  value: V;
  onChange: (next: V) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const btnSize =
    size === "sm" ? "h-7 px-2.5 text-[11px]" : "h-8 px-3 text-xs";
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-border bg-surface p-0.5 shadow-xs",
        className,
      )}
      role="tablist"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-md transition-colors font-medium",
              btnSize,
              active
                ? "bg-surface-muted text-fg shadow-sm"
                : "text-fg-muted hover:text-fg",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
