"use client";

import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n/I18nProvider";
import { TOKENS } from "@/lib/design-tokens";
import { hashtagTrendsApi } from "@/lib/api";

interface HashtagRadarProps {
  primary?: string;
}

export default function HashtagRadar({ primary = "oklch(46% 0.108 320)" }: HashtagRadarProps) {
  const { t, locale } = useI18n();
  const ar = locale === "ar";
  const handFont = ar ? "'Kalam', cursive" : "'Caveat', cursive";

  const hashtagsQ = useQuery({
    queryKey: ["hashtags"],
    queryFn: hashtagTrendsApi.list,
  });

  const title = ar ? 'الوسوم الرائجة' : 'Trending Hashtags';
  const subtitle = ar ? 'زخم ٢٤ ساعة' : 'last 24h momentum';

  const hashtags = hashtagsQ.data?.hashtags ?? [];

  // Take top 6 and calculate momentum as percentage of max engagement
  const topHashtags = hashtags
    .filter(h => h.latest_snapshot?.total_engagement) // Only show hashtags with data
    .sort((a, b) => (b.latest_snapshot?.total_engagement ?? 0) - (a.latest_snapshot?.total_engagement ?? 0))
    .slice(0, 6);

  const maxEngagement = Math.max(...topHashtags.map(h => h.latest_snapshot?.total_engagement ?? 0), 1);

  // If no data, show placeholder
  if (topHashtags.length === 0) {
    return (
      <div
        style={{
          background: TOKENS.surface,
          border: `1px solid ${TOKENS.hairline}`,
          borderRadius: 12,
          padding: '14px 16px',
          transform: 'rotate(0.3deg)',
          boxShadow: '0 2px 6px rgba(40,30,30,0.04)',
        }}
      >
        <div style={{ marginBottom: 12, textAlign: ar ? 'right' : 'left' }}>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: TOKENS.ink[500],
            }}
          >
            {ar ? 'وسوم' : 'hashtags'}
          </div>
          <h3
            style={{
              fontFamily: ar
                ? "'IBM Plex Sans Arabic', sans-serif"
                : 'Newsreader, serif',
              fontWeight: 500,
              fontSize: 15,
              color: TOKENS.ink[900],
              marginTop: 2,
            }}
          >
            {title}
          </h3>
          <div
            style={{
              fontFamily: handFont,
              fontSize: 13.5,
              color: 'oklch(46% 0.108 320)',
              marginTop: 2,
            }}
          >
            {subtitle}
          </div>
        </div>
        <div
          style={{
            textAlign: 'center',
            padding: '24px 16px',
            fontFamily: handFont,
            fontSize: 15,
            color: TOKENS.ink[500],
          }}
        >
          {ar ? 'لا توجد بيانات بعد ✿' : 'no data yet ✿'}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: TOKENS.surface,
        border: `1px solid ${TOKENS.hairline}`,
        borderRadius: 12,
        padding: '14px 16px',
        transform: 'rotate(0.3deg)',
        boxShadow: '0 2px 6px rgba(40,30,30,0.04)',
      }}
    >
      <div style={{ marginBottom: 12, textAlign: ar ? 'right' : 'left' }}>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: TOKENS.ink[500],
          }}
        >
          {ar ? 'وسوم' : 'hashtags'}
        </div>
        <h3
          style={{
            fontFamily: ar
              ? "'IBM Plex Sans Arabic', sans-serif"
              : 'Newsreader, serif',
            fontWeight: 500,
            fontSize: 15,
            color: TOKENS.ink[900],
            marginTop: 2,
          }}
        >
          {title}
        </h3>
        <div
          style={{
            fontFamily: handFont,
            fontSize: 13.5,
            color: 'oklch(46% 0.108 320)',
            marginTop: 2,
          }}
        >
          {subtitle}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {topHashtags.map((h, i) => {
          const engagement = h.latest_snapshot?.total_engagement ?? 0;
          const momentum = Math.round(engagement / maxEngagement * 100);
          const tag = h.display_name || (h.tag.startsWith('#') ? h.tag : `#${h.tag}`);

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexDirection: ar ? 'row-reverse' : 'row',
              }}
            >
              <div
                style={{
                  minWidth: 110,
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: TOKENS.ink[800],
                  fontFamily: /[؀-ۿ]/.test(tag)
                    ? "'IBM Plex Sans Arabic', sans-serif"
                    : "'IBM Plex Sans', sans-serif",
                  textAlign: ar ? 'right' : 'left',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {tag}
              </div>
              <div
                style={{
                  flex: 1,
                  height: 6,
                  background: TOKENS.ink[100],
                  borderRadius: 999,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    [ar ? 'right' : 'left']: 0,
                    top: 0,
                    bottom: 0,
                    width: momentum + '%',
                    background: `linear-gradient(${ar ? '270deg' : '90deg'}, ${primary} 0%, oklch(64% 0.108 320) 100%)`,
                    borderRadius: 999,
                    transition: 'width 300ms ease',
                  }}
                />
              </div>
              <div
                style={{
                  minWidth: 30,
                  fontFamily: 'Newsreader, serif',
                  fontSize: 13,
                  fontWeight: 500,
                  color: TOKENS.ink[900],
                  textAlign: ar ? 'left' : 'right',
                }}
              >
                {momentum}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
