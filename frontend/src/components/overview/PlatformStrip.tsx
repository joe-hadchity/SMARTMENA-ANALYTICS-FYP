'use client';

import React from 'react';
import { TOKENS } from '@/lib/design-tokens';
import Icon from '@/components/ui/Icon';

interface PlatformStripProps {
  value: 'all' | 'ig' | 'fb';
  onChange: (value: 'all' | 'ig' | 'fb') => void;
  lang?: 'en' | 'ar';
  dark?: boolean;
}

const PLATFORMS = {
  en: {
    all: 'All Platforms',
    ig: 'Instagram',
    fb: 'Facebook',
  },
  ar: {
    all: 'كل المنصات',
    ig: 'إنستغرام',
    fb: 'فيسبوك',
  },
};

const ICONS = {
  all: 'SquaresFour',
  ig: 'InstagramLogo',
  fb: 'FacebookLogo',
} as const;

export default function PlatformStrip({
  value,
  onChange,
  lang = 'en',
  dark = false,
}: PlatformStripProps) {
  const t = PLATFORMS[lang];
  const items: Array<'all' | 'ig' | 'fb'> = ['all', 'ig', 'fb'];

  return (
    <div className="flex gap-2 items-center">
      {items.map((key) => {
        const iconName = ICONS[key];
        const isActive = value === key;

        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className="h-[30px] px-3.5 rounded-full flex items-center gap-1.5 transition-all"
            style={{
              fontFamily: "'IBM Plex Sans', 'IBM Plex Sans Arabic', sans-serif",
              fontSize: 12,
              fontWeight: 500,
              border: isActive
                ? `1px solid ${dark ? TOKENS.teal[700] : TOKENS.teal[700]}`
                : `1px solid ${dark ? TOKENS.hairlineDark : TOKENS.hairline}`,
              background: isActive
                ? dark
                  ? TOKENS.teal[700]
                  : TOKENS.teal[700]
                : dark
                  ? TOKENS.surfaceDark
                  : TOKENS.surface,
              color: isActive ? 'white' : dark ? TOKENS.ink[200] : TOKENS.ink[700],
            }}
          >
            <Icon name={iconName} size={12} weight={isActive ? 'bold' : 'regular'} />
            <span>{t[key]}</span>
          </button>
        );
      })}
    </div>
  );
}
