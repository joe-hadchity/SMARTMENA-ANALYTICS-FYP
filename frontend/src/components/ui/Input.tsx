"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
  invalid?: boolean;
};

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, leftAddon, rightAddon, invalid, ...props },
  ref,
) {
  const base =
    "w-full rounded-lg border bg-surface text-sm text-fg placeholder:text-fg-subtle " +
    "transition-[border-color,box-shadow] duration-150 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 " +
    "disabled:opacity-60 disabled:cursor-not-allowed";

  if (leftAddon || rightAddon) {
    return (
      <div
        className={cn(
          "flex items-center rounded-lg border bg-surface transition-[border-color,box-shadow] duration-150",
          "focus-within:ring-2 focus-within:ring-ring",
          invalid ? "border-danger" : "border-border",
        )}
      >
        {leftAddon ? (
          <span className="pl-2.5 pr-1 text-fg-subtle text-xs flex items-center">
            {leftAddon}
          </span>
        ) : null}
        <input
          ref={ref}
          className={cn(
            "flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-fg-subtle",
            leftAddon && "pl-1",
            rightAddon && "pr-1",
            className,
          )}
          {...props}
        />
        {rightAddon ? (
          <span className="pl-1 pr-2.5 text-fg-subtle text-xs flex items-center">
            {rightAddon}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <input
      ref={ref}
      className={cn(
        base,
        "px-3 py-2",
        invalid ? "border-danger" : "border-border",
        className,
      )}
      {...props}
    />
  );
});

export { Input };
