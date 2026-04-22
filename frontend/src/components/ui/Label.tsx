import { forwardRef, type LabelHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const Label = forwardRef<
  HTMLLabelElement,
  LabelHTMLAttributes<HTMLLabelElement>
>(function Label({ className, ...props }, ref) {
  return (
    <label
      ref={ref}
      className={cn(
        "text-xs font-medium text-fg-muted mb-1.5 inline-block",
        className,
      )}
      {...props}
    />
  );
});

export { Label };
