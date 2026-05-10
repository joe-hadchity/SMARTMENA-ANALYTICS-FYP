'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useI18n } from '@/i18n/I18nProvider';
import { TOKENS, formatNumber, formatPct, formatDelta } from '@/lib/design-tokens';
import Icon from '@/components/ui/Icon';

interface ChannelMetric {
  value: number;
  delta: number;
  isPct?: boolean;
}

interface ChannelSummaryCardProps {
  platform: 'meta_instagram' | 'meta_facebook';
  handle?: string;
  metrics: {
    reach: ChannelMetric;
    engagements: ChannelMetric;
    posts: ChannelMetric;
    engRate: ChannelMetric;
  };
}

const PLATFORM_CONFIG = {
  meta_instagram: {
    name: { en: 'Instagram', ar: 'إنستغرام' },
    icon: 'InstagramLogo' as const,
    color: '#E1306C',
  },
  meta_facebook: {
    name: { en: 'Facebook', ar: 'فيسبوك' },
    icon: 'FacebookLogo' as const,
    color: '#1877F2',
  },
};

const METRIC_LABELS = {
  en: {
    reach: 'Reach',
    engagements: 'Engagements',
    posts: 'Posts',
    engRate: 'Eng. Rate',
  },
  ar: {
    reach: 'الوصول',
    engagements: 'التفاعلات',
    posts: 'المنشورات',
    engRate: 'معدل التفاعل',
  },
};

export function ChannelSummaryCard({
  platform,
  handle = '',
  metrics,
}: ChannelSummaryCardProps) {
  const { locale } = useI18n();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const lang = locale === 'ar' ? 'ar' : 'en';
  const dark = mounted && resolvedTheme === 'dark';
  const config = PLATFORM_CONFIG[platform];
  const iconName = config.icon;
  const labels = METRIC_LABELS[lang];

  const renderMetric = (key: keyof typeof metrics, label: string) => {
    const metric = metrics[key];
    const isPositive = metric.delta > 0;
    const deltaColor = isPositive
      ? dark
        ? TOKENS.teal[400]
        : TOKENS.teal[700]
      : dark
        ? TOKENS.terra[400]
        : TOKENS.terra[700];

    const formattedValue = metric.isPct
      ? formatPct(metric.value, lang)
      : formatNumber(metric.value, lang);
    const formattedDelta = formatDelta(metric.delta, true, lang);

    return (
      <div key={key} className="flex flex-col gap-1">
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color: dark ? TOKENS.ink[400] : TOKENS.ink[500],
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: "'IBM Plex Sans', 'IBM Plex Sans Arabic', sans-serif",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: -0.3,
            color: dark ? TOKENS.ink[50] : TOKENS.ink[900],
            lineHeight: 1,
          }}
        >
          {formattedValue}
        </div>
        <div
          className="flex items-center gap-0.5"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            fontWeight: 500,
            color: deltaColor,
          }}
        >
          <span>{isPositive ? '↑' : '↓'}</span>
          <span>{formattedDelta}</span>
        </div>
      </div>
    );
  };

  return (
    <div
      className="rounded-lg p-4 border"
      style={{
        background: dark ? TOKENS.surfaceDark : TOKENS.surface,
        borderColor: dark ? TOKENS.hairlineDark : TOKENS.hairline,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: `${config.color}15`, color: config.color }}
        >
          <Icon name={iconName} size={16} weight="bold" />
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
            {config.name[lang]}
          </div>
          {handle && (
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                color: dark ? TOKENS.ink[400] : TOKENS.ink[500],
              }}
            >
              {handle}
            </div>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-3">
        {renderMetric('reach', labels.reach)}
        {renderMetric('engagements', labels.engagements)}
        {renderMetric('posts', labels.posts)}
        {renderMetric('engRate', labels.engRate)}
      </div>
    </div>
  );
}
