import type { ReactNode } from "react";
import { Sparkle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * One-line italic caption shown beneath a chart or KPI block.
 * Carries a single editorial insight ("Engagement peaked Tue 7-9pm GST").
 *
 * Captions are what separate a "data display" from "analytics" — they
 * tell the user what the chart *means*, not just what it shows.
 */
export default function InsightCaption({
  children,
  emphasis,
  className,
}: {
  children: ReactNode;
  /** Highlighted span inside the caption — e.g. a metric value or time. */
  emphasis?: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mt-3 flex items-start gap-1.5 text-[12px] italic leading-snug text-fg-muted",
        className,
      )}
    >
      <Sparkle className="mt-0.5 h-3 w-3 shrink-0 text-primary/70 not-italic" aria-hidden />
      <span>
        {children}
        {emphasis ? (
          <span className="ms-1 font-medium not-italic text-fg">{emphasis}</span>
        ) : null}
      </span>
    </p>
  );
}
