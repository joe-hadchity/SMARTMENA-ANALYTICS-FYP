"use client";

import { ChevronDown } from "lucide-react";
import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "appearance-none w-full rounded-lg border border-border bg-surface px-3 py-2 pe-9 text-sm",
          "transition-[border-color,box-shadow] duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute end-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle pointer-events-none" />
    </div>
  );
});

export { Select };
