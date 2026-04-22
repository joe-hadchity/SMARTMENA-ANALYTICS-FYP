import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

/**
 * Shimmer skeleton placeholder. Pair with TanStack Query's `isLoading`
 * to hold the layout and signal "content coming".
 */
export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton", className)} {...props} />;
}
