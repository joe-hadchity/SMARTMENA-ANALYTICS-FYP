'use client';

import React from 'react';
import { TOKENS } from '@/lib/design-tokens';
import Icon from '@/components/ui/Icon';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface TimeSlot {
  day: string;
  dayAr: string;
  hour: number;
  score: number;
}

interface BestTimeToPostProps {
  lang?: 'en' | 'ar';
}

const MOCK_TIME_SLOTS: TimeSlot[] = [
  { day: 'Sunday', dayAr: 'الأحد', hour: 20, score: 92 },
  { day: 'Tuesday', dayAr: 'الثلاثاء', hour: 19, score: 88 },
  { day: 'Thursday', dayAr: 'الخميس', hour: 21, score: 85 },
  { day: 'Saturday', dayAr: 'السبت', hour: 18, score: 82 },
];

export default function BestTimeToPost({ lang = 'en' }: BestTimeToPostProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const dark = mounted && resolvedTheme === 'dark';
  const isAr = lang === 'ar';

  const formatHour = (hour: number) => {
    if (isAr) {
      const period = hour >= 12 ? 'م' : 'ص';
      const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${new Intl.NumberFormat('ar-EG').format(h)}:${new Intl.NumberFormat('ar-EG').format(0).padStart(2, '0')} ${period}`;
    }
    const period = hour >= 12 ? 'PM' : 'AM';
    const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${h}:00 ${period}`;
  };

  return (
    <div
      className="rounded-lg p-5 border"
      style={{
        background: dark ? TOKENS.surfaceDark : TOKENS.surface,
        borderColor: dark ? TOKENS.hairlineDark : TOKENS.hairline,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: dark
              ? `${TOKENS.amber[500]}20`
              : `${TOKENS.amber[400]}15`,
            color: dark ? TOKENS.amber[400] : TOKENS.amber[600],
          }}
        >
          <Icon name="Clock" size={16} weight="bold" />
        </div>
        <div className="flex-1">
          <div
            style={{
              fontFamily: "'IBM Plex Sans', 'IBM Plex Sans Arabic', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              color: dark ? TOKENS.ink[50] : TOKENS.ink[900],
            }}
          >
            {isAr ? 'أفضل أوقات النشر' : 'Best Time to Post'}
          </div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              color: dark ? TOKENS.ink[400] : TOKENS.ink[500],
            }}
          >
            {isAr ? 'بناءً على بيانات الـ 30 يومًا الماضية' : 'Based on last 30 days'}
          </div>
        </div>
      </div>

      {/* Time Slots */}
      <div className="space-y-2">
        {MOCK_TIME_SLOTS.map((slot, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-2 rounded-md transition-all"
            style={{
              background: dark
                ? 'oklch(20% 0.014 48)'
                : 'oklch(98% 0.006 50)',
            }}
          >
            {/* Day */}
            <div
              className="flex-1"
              style={{
                fontFamily: "'IBM Plex Sans', 'IBM Plex Sans Arabic', sans-serif",
                fontSize: 13,
                fontWeight: 500,
                color: dark ? TOKENS.ink[200] : TOKENS.ink[700],
              }}
            >
              {isAr ? slot.dayAr : slot.day}
            </div>

            {/* Time */}
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                fontWeight: 600,
                color: dark ? TOKENS.teal[300] : TOKENS.teal[700],
                minWidth: 80,
                textAlign: 'right',
              }}
            >
              {formatHour(slot.hour)}
            </div>

            {/* Score bar */}
            <div className="flex items-center gap-2" style={{ minWidth: 100 }}>
              <div
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{
                  background: dark ? TOKENS.ink[800] : TOKENS.ink[100],
                }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${slot.score}%`,
                    background: `linear-gradient(90deg, ${dark ? TOKENS.teal[600] : TOKENS.teal[500]}, ${dark ? TOKENS.amber[500] : TOKENS.amber[400]})`,
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  fontWeight: 600,
                  color: dark ? TOKENS.ink[400] : TOKENS.ink[500],
                  minWidth: 28,
                  textAlign: 'right',
                }}
              >
                {slot.score}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div
        className="mt-3 pt-3 border-t text-center"
        style={{
          borderColor: dark ? TOKENS.hairlineDark : TOKENS.hairline,
          fontFamily: "'IBM Plex Sans', 'IBM Plex Sans Arabic', sans-serif",
          fontSize: 11,
          color: dark ? TOKENS.ink[500] : TOKENS.ink[400],
        }}
      >
        {isAr ? '⚡ جدولة المنشورات في هذه الأوقات تزيد التفاعل بنسبة 40٪' : '⚡ Posting at these times increases engagement by 40%'}
      </div>
    </div>
  );
}
