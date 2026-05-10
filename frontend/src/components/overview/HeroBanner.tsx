'use client';

import React from 'react';
import BrandMark from './BrandMark';
import { TOKENS, toHijri, HIJRI_MONTHS_EN, HIJRI_MONTHS_AR } from '@/lib/design-tokens';

interface HeroBannerProps {
  lang?: 'en' | 'ar';
  dark?: boolean;
  dir?: 'ltr' | 'rtl';
}

export default function HeroBanner({ lang = 'en', dark = false, dir = 'ltr' }: HeroBannerProps) {
  const isAr = lang === 'ar';
  const today = new Date();
  const hij = toHijri(today);
  const hijMonths = isAr ? HIJRI_MONTHS_AR : HIJRI_MONTHS_EN;

  const hijLabel = isAr
    ? `${new Intl.NumberFormat('ar-EG').format(hij.day)} ${hijMonths[hij.month - 1]} ${new Intl.NumberFormat('ar-EG', { useGrouping: false }).format(hij.year)}هـ`
    : `${hij.day} ${hijMonths[hij.month - 1]} ${hij.year} AH`;

  const gregLabel = isAr
    ? today.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })
    : today.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  const monthLabel = isAr
    ? today.toLocaleDateString('ar-EG', { month: 'long' }).toUpperCase()
    : today.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

  const yearLabel = today.getFullYear().toString();

  const backgroundGradient = dark
    ? `linear-gradient(${dir === 'rtl' ? '270deg' : '90deg'}, oklch(22% 0.040 195) 0%, oklch(18% 0.020 195) 60%, ${TOKENS.surfaceDark} 100%)`
    : `linear-gradient(${dir === 'rtl' ? '270deg' : '90deg'}, oklch(94% 0.045 195) 0%, oklch(96% 0.025 195) 50%, oklch(98% 0.012 80) 100%)`;

  return (
    <div
      className="relative overflow-hidden rounded-[10px] border min-h-[92px] flex items-center"
      style={{
        padding: '20px 28px',
        borderColor: dark ? TOKENS.hairlineDark : 'oklch(88% 0.022 195)',
        background: backgroundGradient,
        borderLeft: dir === 'ltr' ? `3px solid ${dark ? TOKENS.teal[500] : TOKENS.teal[600]}` : undefined,
        borderRight: dir === 'rtl' ? `3px solid ${dark ? TOKENS.teal[500] : TOKENS.teal[600]}` : undefined,
      }}
    >
      {/* Background month/year decoration */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 -translate-y-1/2 select-none pointer-events-none"
        style={{
          [dir === 'rtl' ? 'left' : 'right']: 110,
          fontFamily: "'IBM Plex Sans', 'IBM Plex Sans Arabic', sans-serif",
          fontWeight: 700,
          fontSize: 64,
          letterSpacing: -2,
          color: dark ? 'oklch(50% 0.020 60 / 0.18)' : 'oklch(60% 0.030 60 / 0.22)',
          whiteSpace: 'nowrap',
          lineHeight: 1,
        }}
      >
        {monthLabel} {yearLabel}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 min-w-0 flex items-center gap-4">
        <BrandMark size={48} dark={dark} />

        <div className="min-w-0 flex-1">
          {/* Performance Overview label with dates */}
          <div
            className="flex items-center gap-2 flex-wrap mb-1"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: dark ? TOKENS.teal[200] : TOKENS.teal[700],
            }}
          >
            <span>{isAr ? 'نظرة عامة على الأداء' : 'Performance Overview'}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span style={{ fontWeight: 500 }}>{gregLabel}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span
              style={{
                fontFamily: "'IBM Plex Sans Arabic', 'IBM Plex Mono', monospace",
                fontWeight: 500,
                color: dark ? TOKENS.amber[300] : TOKENS.terra[700],
              }}
            >
              {hijLabel}
            </span>
          </div>

          {/* Main tagline */}
          <div
            style={{
              fontFamily: "'IBM Plex Sans', 'IBM Plex Sans Arabic', sans-serif",
              fontWeight: 600,
              fontSize: 22,
              letterSpacing: -0.4,
              color: dark ? TOKENS.ink[50] : TOKENS.ink[900],
              lineHeight: 1.15,
            }}
          >
            {isAr ? 'اعمل بذكاء، لا بجهد.' : 'Work smarter, not harder.'}
          </div>

          {/* Subtitle */}
          <div
            className="mt-1"
            style={{
              fontSize: 12,
              fontFamily: "'IBM Plex Sans', 'IBM Plex Sans Arabic', sans-serif",
              color: dark ? TOKENS.ink[300] : TOKENS.ink[600],
            }}
          >
            {isAr ? 'وصولك ارتفع ١٨٪ — استمر في التقدم.' : 'Your reach is up 18% — keep it going.'}
          </div>
        </div>
      </div>

      {/* Reach callout */}
      <div
        className="relative z-10 flex-shrink-0"
        style={{ textAlign: dir === 'rtl' ? 'left' : 'right' }}
      >
        <div
          style={{
            fontFamily: "'IBM Plex Sans', 'IBM Plex Sans Arabic', sans-serif",
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: -1,
            lineHeight: 1,
            color: dark ? 'oklch(78% 0.130 155)' : 'oklch(48% 0.140 155)',
          }}
        >
          +18%
        </div>
        <div
          className="mt-0.5"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 1.4,
            color: dark ? TOKENS.teal[200] : TOKENS.teal[700],
          }}
        >
          {isAr ? 'الوصول' : 'REACH'}
        </div>
      </div>
    </div>
  );
}
