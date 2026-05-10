'use client';

import React, { useMemo } from 'react';

interface SparkLineProps {
  data: number[];
  color: string;
  height?: number;
  width?: number;
}

export default function SparkLine({ data, color, height = 28, width = 120 }: SparkLineProps) {
  const path = useMemo(() => {
    if (!data || data.length === 0) return { line: '', last: [0, 0] };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);

    const pts: [number, number][] = data.map((v, i) => [
      i * stepX,
      height - ((v - min) / range) * (height - 4) - 2,
    ]);

    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = pts[i - 1];
      const [cx, cy] = pts[i];
      const mx = (px + cx) / 2;
      d += ` Q ${mx} ${py} ${mx} ${(py + cy) / 2} T ${cx} ${cy}`;
    }

    return {
      line: d,
      last: pts[pts.length - 1],
    };
  }, [data, height, width]);

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Smooth line */}
      <path d={path.line} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />

      {/* Endpoint dot */}
      <circle cx={path.last[0]} cy={path.last[1]} r={2.5} fill={color} />
    </svg>
  );
}
