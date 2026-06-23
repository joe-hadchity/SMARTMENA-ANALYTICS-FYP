"use client";

import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n/I18nProvider";
import { TOKENS } from "@/lib/design-tokens";
import { hashtagTrendsApi, workspacesApi } from "@/lib/api";

interface HashtagRadarProps {
  primary?: string;
}

export default function HashtagRadar({ primary = "oklch(46% 0.108 320)" }: HashtagRadarProps) {
  const { t, locale } = useI18n();
  const ar = locale === "ar";
  const handFont = ar ? "'Kalam', cursive" : "'Caveat', cursive";

  const workspaceQ = useQuery({
    queryKey: ["workspace", "current"],
    queryFn: workspacesApi.current,
  });
  const workspaceId = workspaceQ.data?.id;

  // Same query key as trend-intelligence page so they share cache
  const hashtagsQ = useQuery({
    queryKey: ["hashtag-trends", workspaceId],
    queryFn: hashtagTrendsApi.list,
    enabled: Boolean(workspaceId),
  });

  const title = ar ? 'الوسوم الرائجة' : 'Trending Hashtags';
  const subtitle = ar ? 'زخم ٢٤ ساعة' : 'last 24h momentum';

  const hashtags = hashtagsQ.data?.hashtags ?? [];
  const suggested = hashtagsQ.data?.suggested_hashtags ?? [];

  // Hashtags with real engagement data
  const withData = hashtags
    .filter(h => h.latest_snapshot?.total_engagement)
    .sort((a, b) => (b.latest_snapshot?.total_engagement ?? 0) - (a.latest_snapshot?.total_engagement ?? 0))
    .slice(0, 6);

  // Fall back to suggested hashtags as pill display when no tracked data
  const hasSuggested = suggested.length > 0;
  const topHashtags = withData;

  const maxEngagement = Math.max(...topHashtags.map(h => h.latest_snapshot?.total_engagement ?? 0), 1);

  // No tracked data — show suggested hashtags as pills
  if (topHashtags.length === 0) {
    const pills = hasSuggested ? suggested : [];
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
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKENS.ink[500] }}>
            {ar ? 'وسوم' : 'hashtags'}
          </div>
          <h3 style={{ fontFamily: ar ? "'IBM Plex Sans Arabic', sans-serif" : 'Newsreader, serif', fontWeight: 500, fontSize: 15, color: TOKENS.ink[900], marginTop: 2 }}>
            {title}
          </h3>
          <div style={{ fontFamily: handFont, fontSize: 13.5, color: primary, marginTop: 2 }}>
            {ar ? 'وسوم مقترحة' : 'suggested for your niche'}
          </div>
        </div>
        {pills.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {pills.map((tag: string) => (
              <span
                key={tag}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: primary,
                  background: TOKENS.teal[50],
                  border: `1px solid ${TOKENS.teal[200]}`,
                  padding: '3px 9px',
                  borderRadius: 999,
                  letterSpacing: '0.02em',
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 16px', fontFamily: handFont, fontSize: 15, color: TOKENS.ink[500] }}>
            {ar ? 'لا توجد بيانات بعد ✿' : 'no data yet ✿'}
          </div>
        )}
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
