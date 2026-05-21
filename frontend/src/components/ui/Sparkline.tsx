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
  strokeWidth = 2,
  fill = true,
  color,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  strokeWidth?: number;
  fill?: boolean;
  color?: string;
}) {
  const gradId = useId();
  const shadowId = useId();
  const points = data.length > 1 ? data : [0, 0];

  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  const step = points.length > 1 ? width / (points.length - 1) : 0;
  const y = (v: number) => height - ((v - min) / range) * (height - 6) - 3;

  const coords = points.map((v, i) => [i * step, y(v)] as const);
  const path = coords
    .map(([x, yy], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${yy.toFixed(2)}`)
    .join(" ");
  const areaPath = `${path} L${width} ${height} L0 ${height} Z`;

  const lineColor = color || "currentColor";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        {fill ? (
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.2} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        ) : null}
        {/* Drop shadow for the line */}
        <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
          <feOffset dx="0" dy="1" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {fill ? <path d={areaPath} fill={`url(#${gradId})`} /> : null}
      <path
        d={path}
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${shadowId})`}
      />
    </svg>
  );
}
