'use client';

import React from 'react';
import { TOKENS } from '@/lib/design-tokens';

interface BrandMarkProps {
  size?: number;
  dark?: boolean;
}

export default function BrandMark({ size = 48, dark = false }: BrandMarkProps) {
  const primaryColor = dark ? TOKENS.teal[400] : TOKENS.teal[600];
  const secondaryColor = dark ? TOKENS.amber[400] : TOKENS.amber[500];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="SmartMENA"
    >
      {/* Background circle */}
      <circle
        cx="24"
        cy="24"
        r="22"
        fill={primaryColor}
        opacity="0.1"
      />

      {/* Chart line symbol */}
      <path
        d="M12 32L18 24L24 26L30 18L36 20"
        stroke={primaryColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Accent dot */}
      <circle
        cx="36"
        cy="20"
        r="3"
        fill={secondaryColor}
      />

      {/* Secondary dots */}
      <circle cx="12" cy="32" r="2" fill={primaryColor} opacity="0.6" />
      <circle cx="18" cy="24" r="2" fill={primaryColor} opacity="0.6" />
      <circle cx="24" cy="26" r="2" fill={primaryColor} opacity="0.6" />
      <circle cx="30" cy="18" r="2" fill={primaryColor} opacity="0.6" />
    </svg>
  );
}
