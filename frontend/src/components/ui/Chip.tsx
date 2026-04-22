/**
 * Back-compat shim. All new code should import { Badge } from "./Badge".
 * This file re-exports the same component under the old name so existing
 * pages that did `import Chip from "@/components/ui/Chip"` keep working.
 *
 * The legacy Chip API accepted `tone: "brand" | "green" | "amber" | "red" | "neutral"`,
 * we translate those to the new Badge tones.
 */
import { forwardRef, type HTMLAttributes } from "react";

import { Badge } from "./Badge";
import { cn } from "@/lib/utils";

type LegacyTone = "neutral" | "brand" | "green" | "amber" | "red";

const TONE_MAP = {
  neutral: "neutral",
  brand: "brand",
  green: "success",
  amber: "warning",
  red: "danger",
} as const;

type Props = HTMLAttributes<HTMLSpanElement> & { tone?: LegacyTone };

const Chip = forwardRef<HTMLSpanElement, Props>(function Chip(
  { tone = "neutral", className, ...props },
  ref,
) {
  return (
    <Badge
      ref={ref}
      tone={TONE_MAP[tone] as "neutral" | "brand" | "success" | "warning" | "danger"}
      size="sm"
      className={cn(className)}
      {...props}
    />
  );
});

export default Chip;
