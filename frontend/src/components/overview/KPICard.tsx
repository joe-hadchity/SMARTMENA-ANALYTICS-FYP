'use client';

import React from 'react';
import { TOKENS, formatNumber, formatPct, formatDelta } from '@/lib/design-tokens';
import SparkLine from './SparkLine';

interface KPICardProps {
  label: string;
  value: number;
  delta: number;
  isPct?: boolean;
  sparkData?: number[];
  lang?: 'en' | 'ar';
  dark?: boolean;
  flexBasis?: string;
}

export default function KPICard({
  label,
  value,
  delta,
  isPct = false,
  sparkData,
  lang = 'en',
  dark = false,
  flexBasis = '1',
}: KPICardProps) {
  const isPositive = delta > 0;
  const deltaColor = isPositive
    ? dark
      ? TOKENS.teal[400]
      : TOKENS.teal[700]
    : dark
      ? TOKENS.terra[400]
      : TOKENS.terra[700];

  const formattedValue = isPct ? formatPct(value, lang) : formatNumber(value, lang);
  const formattedDelta = formatDelta(delta, true, lang);

  return (
    <div
      className="flex flex-col gap-2 py-3 px-4"
      style={{
        flex: flexBasis,
        borderRight: dark ? `1px solid ${TOKENS.hairlineDark}` : `1px solid ${TOKENS.hairline}`,
      }}
    >
      {/* Label */}
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: dark ? TOKENS.ink[400] : TOKENS.ink[500],
        }}
      >
        {label}
      </div>

      {/* Value */}
      <div
        style={{
          fontFamily: "'IBM Plex Sans', 'IBM Plex Sans Arabic', sans-serif",
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: -0.5,
          color: dark ? TOKENS.ink[50] : TOKENS.ink[900],
          lineHeight: 1,
        }}
      >
        {formattedValue}
      </div>

      {/* Delta + Sparkline */}
      <div className="flex items-center justify-between gap-2">
        <div
          className="flex items-center gap-1"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            fontWeight: 500,
            color: deltaColor,
          }}
        >
          <span>{isPositive ? '↑' : '↓'}</span>
          <span>{formattedDelta}</span>
        </div>

        {sparkData && sparkData.length > 0 && (
          <div style={{ width: 80, height: 20 }}>
            <SparkLine
              data={sparkData}
              color={dark ? TOKENS.teal[500] : TOKENS.teal[600]}
              height={20}
              width={80}
            />
          </div>
        )}
      </div>
    </div>
  );
}
