"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Single source of truth for every clickable in the app.
 *
 * Variants intentionally cover the patterns a SaaS dashboard actually uses:
 *   - primary:      main CTA
 *   - secondary:    paired with primary (non-destructive confirm, etc.)
 *   - outline:      neutral actions with visible edge
 *   - ghost:        tertiary inline actions (table rows, filters)
 *   - subtle:       like ghost but on a tinted background when active
 *   - danger:       destructive actions
 *   - link:         inline text trigger
 *
 * `asChild` lets a Link wrap the styles without nesting <a><button>.
 */
const buttonStyles = cva(
  [
    "inline-flex items-center justify-center gap-2 select-none",
    "text-sm font-medium whitespace-nowrap rounded-lg",
    "transition-[background-color,color,box-shadow,transform] duration-150 ease-out-soft",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-fg shadow-sm hover:bg-primary-hover active:translate-y-[1px]",
        secondary:
          "bg-surface-muted text-fg hover:bg-surface-hover border border-border",
        outline:
          "bg-surface text-fg border border-border hover:bg-surface-muted",
        ghost: "bg-transparent text-fg hover:bg-surface-muted",
        subtle:
          "bg-primary-soft text-primary hover:bg-primary/10",
        danger:
          "bg-danger text-white shadow-sm hover:bg-danger/90 active:translate-y-[1px]",
        link: "text-primary underline-offset-4 hover:underline px-0 py-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-3.5",
        lg: "h-10 px-4",
        xl: "h-11 px-5 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles> & {
    asChild?: boolean;
    loading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
  };

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    block,
    asChild = false,
    loading = false,
    disabled,
    leftIcon,
    rightIcon,
    children,
    ...props
  },
  ref,
) {
  // Radix Slot requires a SINGLE child, so when asChild we forward props
  // through the child (usually a <Link>) untouched and trust the caller
  // to place their own icons inside. The Button UI for asChild still gets
  // the full variant classes via `className`.
  if (asChild) {
    return (
      <Slot
        ref={ref as React.Ref<HTMLElement>}
        className={cn(buttonStyles({ variant, size, block }), className)}
        {...(props as React.HTMLAttributes<HTMLElement>)}
      >
        {children}
      </Slot>
    );
  }

  return (
    <button
      ref={ref}
      className={cn(buttonStyles({ variant, size, block }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
      {children}
      {loading ? null : rightIcon}
    </button>
  );
});

export { Button, buttonStyles };
