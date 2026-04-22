"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * Tiny, dependency-free sparkline. Uses raw SVG so it stays cheap and
 * doesn't drag a recharts ResponsiveContainer into every KPI card.
 *
 * Colour is picked up from the current text colour (`currentColor`) so
 * it inherits trend tone from the KPI card (green for up, red for down).
 */
export function Sparkline({
  data,
  width = 120,
  height = 36,
  className,
  strokeWidth = 1.75,
  fill = true,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  strokeWidth?: number;
  fill?: boolean;
}) {
  const gradId = useId();
  const points = data.length > 1 ? data : [0, 0];

  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  const step = points.length > 1 ? width / (points.length - 1) : 0;
  const y = (v: number) => height - ((v - min) / range) * (height - 4) - 2;

  const coords = points.map((v, i) => [i * step, y(v)] as const);
  const path = coords
    .map(([x, yy], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${yy.toFixed(2)}`)
    .join(" ");
  const areaPath = `${path} L${width} ${height} L0 ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {fill ? (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity={0.25} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>
      ) : null}
      {fill ? <path d={areaPath} fill={`url(#${gradId})`} /> : null}
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
