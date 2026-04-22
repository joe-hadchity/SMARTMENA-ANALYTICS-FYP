import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * Status and tag chip. Call it Badge for the modern SaaS feel; we still
 * export a `Chip` alias so existing call sites keep working.
 */
const badgeStyles = cva(
  "inline-flex items-center gap-1 font-medium whitespace-nowrap rounded-full transition-colors",
  {
    variants: {
      tone: {
        neutral: "bg-surface-muted text-fg-muted border border-border",
        brand: "bg-primary-soft text-primary",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-danger",
        info: "bg-info-soft text-info",
        solid: "bg-fg text-fg-inverse",
        outline: "bg-transparent text-fg border border-border",
      },
      size: {
        sm: "h-5 px-2 text-[10px] tracking-wide",
        md: "h-6 px-2.5 text-xs",
        lg: "h-7 px-3 text-sm",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeStyles> & { dot?: boolean };

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, tone, size, dot, children, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(badgeStyles({ tone, size }), className)}
      {...props}
    >
      {dot ? (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full bg-current",
            tone === "solid" ? "opacity-80" : "opacity-90",
          )}
        />
      ) : null}
      {children}
    </span>
  );
});

// Backwards-compat alias so existing pages that imported Chip still work.
const Chip = Badge;

export { Badge, Chip, badgeStyles };
