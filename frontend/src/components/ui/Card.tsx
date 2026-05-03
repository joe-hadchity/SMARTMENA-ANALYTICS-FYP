import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Composable card primitive.
 *
 * Default behaviour matches the v1 kit (auto p-5) so existing pages that
 * do `<Card>content</Card>` keep rendering correctly. New pages that
 * want to compose a richer header + content should pass `padded={false}`
 * and use <CardHeader> + <CardContent> to manage spacing.
 */
type CardProps = HTMLAttributes<HTMLDivElement> & {
  elevated?: boolean;
  padded?: boolean;
};

const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, elevated, padded = true, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "bg-surface border border-border rounded-md transition-colors",
        elevated ? "shadow-sm" : "shadow-xs",
        padded && "p-5",
        className,
      )}
      {...props}
    />
  );
});

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "px-5 pt-5 pb-3 flex items-start justify-between gap-4 border-b border-border/60",
          className,
        )}
        {...props}
      />
    );
  },
);

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, ...props }, ref) {
    return (
      <h3
        ref={ref}
        className={cn(
          "text-sm font-semibold text-fg leading-tight",
          className,
        )}
        {...props}
      />
    );
  },
);

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function CardDescription({ className, ...props }, ref) {
    return (
      <p
        ref={ref}
        className={cn("text-xs text-fg-muted mt-1 leading-snug", className)}
        {...props}
      />
    );
  },
);

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardContent({ className, ...props }, ref) {
    return <div ref={ref} className={cn("px-5 pb-5 pt-4", className)} {...props} />;
  },
);

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "px-5 py-3 border-t border-border/70 flex items-center gap-2",
          className,
        )}
        {...props}
      />
    );
  },
);

/**
 * Inline empty-state used inside cards where a full EmptyState would be
 * overkill. For the full hero-style empty state, use ./EmptyState.
 */
function CardEmpty({
  title,
  description,
  cta,
  className,
}: {
  title: string;
  description?: string;
  cta?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "p-10 text-center text-fg-muted text-sm flex flex-col items-center gap-2",
        className,
      )}
    >
      <div className="text-fg font-medium">{title}</div>
      {description ? (
        <div className="text-xs text-fg-subtle max-w-xs">{description}</div>
      ) : null}
      {cta ? <div className="mt-2">{cta}</div> : null}
    </div>
  );
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardEmpty,
};

// Back-compat for previous `EmptyState` export from this file.
export { CardEmpty as EmptyState };
