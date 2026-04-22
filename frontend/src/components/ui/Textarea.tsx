"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm",
        "placeholder:text-fg-subtle resize-y min-h-[72px]",
        "transition-[border-color,box-shadow] duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    />
  );
});

export { Textarea };
