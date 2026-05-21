"use client";

import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n/I18nProvider";
import { TOKENS } from "@/lib/design-tokens";
import { scheduledPostsApi } from "@/lib/api";

interface ReminderCardProps {
  primary?: string;
}

export default function ReminderCard({ primary = "oklch(46% 0.108 320)" }: ReminderCardProps) {
  const { t, locale } = useI18n();
  const ar = locale === "ar";
  const handFont = ar ? "'Kalam', cursive" : "'Caveat', cursive";

  const scheduledQ = useQuery({
    queryKey: ["scheduled-posts", "upcoming"],
    queryFn: () => scheduledPostsApi.list({
      status: "scheduled",
      limit: 2,
    }),
  });

  const strings = {
    title: ar ? 'الجدول القادم' : 'Upcoming Schedule',
    sub: ar ? 'خلال يومين' : 'next 2 days',
    today: ar ? 'اليوم' : 'Today',
    tomorrow: ar ? 'غداً' : 'Tomorrow',
    captionReady: ar ? '✓ التعليق جاهز' : '✓ caption ready',
    nothing: ar ? 'لا شيء بعد ✿' : 'nothing scheduled yet ✿',
  };

  const scheduled = scheduledQ.data ?? [];
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const tomorrowEnd = new Date(todayEnd);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  // Group by today/tomorrow
  const today = scheduled.filter(p => {
    const scheduledDate = new Date(p.scheduled_at);
    return scheduledDate <= todayEnd;
  }).slice(0, 1)[0];

  const tomorrow = scheduled.filter(p => {
    const scheduledDate = new Date(p.scheduled_at);
    return scheduledDate > todayEnd && scheduledDate <= tomorrowEnd;
  }).slice(0, 1)[0];

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (ar) {
      // Arabic numerals
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
      const h = hours.toString().split('').map(d => arabicNums[parseInt(d)]).join('');
      const m = minutes.toString().padStart(2, '0').split('').map(d => arabicNums[parseInt(d)]).join('');
      return `${h}:${m} ${hours >= 12 ? 'م' : 'ص'}`;
    }
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div
      style={{
        background: TOKENS.surface,
        border: `1px solid ${TOKENS.hairline}`,
        borderRadius: 12,
        padding: '14px 16px',
        transform: 'rotate(0.4deg)',
        boxShadow: '0 2px 6px rgba(40,30,30,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: ar ? 'right' : 'left' }}>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: TOKENS.ink[500],
          }}
        >
          {ar ? 'جدول' : 'schedule'}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            flexDirection: ar ? 'row-reverse' : 'row',
            justifyContent: ar ? 'flex-end' : 'flex-start',
          }}
        >
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
            {strings.title}
          </h3>
          <span
            style={{
              fontFamily: handFont,
              fontSize: 14,
              color: 'oklch(46% 0.108 320)',
            }}
          >
            {strings.sub}
          </span>
        </div>
      </div>

      {/* Today */}
      {today ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexDirection: ar ? 'row-reverse' : 'row',
            padding: '10px 12px',
            background: 'oklch(97% 0.014 320 / 0.5)',
            border: `1px solid ${TOKENS.hairline}`,
            borderRadius: 8,
          }}
        >
          <div style={{ minWidth: 70, textAlign: ar ? 'right' : 'left' }}>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9.5,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: TOKENS.ink[500],
              }}
            >
              {strings.today}
            </div>
            <div
              style={{
                fontFamily: 'Newsreader, serif',
                fontSize: 14,
                fontWeight: 500,
                color: TOKENS.ink[900],
              }}
            >
              {formatTime(today.scheduled_at)}
            </div>
          </div>

          {/* Tiny product thumb */}
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              flexShrink: 0,
              background: 'radial-gradient(circle at 30% 30%, oklch(80% 0.090 60), oklch(70% 0.130 30))',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          />

          <div
            style={{
              flex: 1,
              textAlign: ar ? 'right' : 'left',
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                flexDirection: ar ? 'row-reverse' : 'row',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: today.platform === 'meta_instagram' ? TOKENS.ig : TOKENS.fb,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: TOKENS.ink[500],
                  fontFamily: "'IBM Plex Mono', monospace",
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {today.platform === 'meta_instagram' ? 'instagram' : 'facebook'}
              </span>
            </div>
            <div
              style={{
                fontFamily: ar
                  ? "'IBM Plex Sans Arabic', sans-serif"
                  : "'IBM Plex Sans', sans-serif",
                fontSize: 12.5,
                fontWeight: 500,
                color: TOKENS.ink[900],
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {today.caption?.substring(0, 30) || (ar ? 'منشور مجدول' : 'Scheduled post')}
              {(today.caption?.length ?? 0) > 30 ? '...' : ''}
            </div>
          </div>

          {today.caption && (
            <div
              style={{
                border: '1.5px dashed oklch(50% 0.090 150)',
                color: 'oklch(40% 0.090 150)',
                padding: '3px 8px',
                borderRadius: 999,
                fontFamily: handFont,
                fontSize: 13,
                background: 'oklch(96% 0.030 150 / 0.5)',
                whiteSpace: 'nowrap',
              }}
            >
              {strings.captionReady}
            </div>
          )}
        </div>
      ) : null}

      {/* Tomorrow */}
      {tomorrow ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexDirection: ar ? 'row-reverse' : 'row',
            padding: '10px 12px',
            background: 'oklch(97% 0.014 320 / 0.5)',
            border: `1px solid ${TOKENS.hairline}`,
            borderRadius: 8,
          }}
        >
          <div style={{ minWidth: 70, textAlign: ar ? 'right' : 'left' }}>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9.5,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: TOKENS.ink[500],
              }}
            >
              {strings.tomorrow}
            </div>
            <div
              style={{
                fontFamily: 'Newsreader, serif',
                fontSize: 14,
                fontWeight: 500,
                color: TOKENS.ink[900],
              }}
            >
              {formatTime(tomorrow.scheduled_at)}
            </div>
          </div>

          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              flexShrink: 0,
              background: 'radial-gradient(circle at 30% 30%, oklch(80% 0.090 60), oklch(70% 0.130 30))',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          />

          <div
            style={{
              flex: 1,
              textAlign: ar ? 'right' : 'left',
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                flexDirection: ar ? 'row-reverse' : 'row',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: tomorrow.platform === 'meta_instagram' ? TOKENS.ig : TOKENS.fb,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: TOKENS.ink[500],
                  fontFamily: "'IBM Plex Mono', monospace",
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {tomorrow.platform === 'meta_instagram' ? 'instagram' : 'facebook'}
              </span>
            </div>
            <div
              style={{
                fontFamily: ar
                  ? "'IBM Plex Sans Arabic', sans-serif"
                  : "'IBM Plex Sans', sans-serif",
                fontSize: 12.5,
                fontWeight: 500,
                color: TOKENS.ink[900],
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {tomorrow.caption?.substring(0, 30) || (ar ? 'منشور مجدول' : 'Scheduled post')}
              {(tomorrow.caption?.length ?? 0) > 30 ? '...' : ''}
            </div>
          </div>
        </div>
      ) : !today ? (
        <div
          style={{
            border: '1.5px dashed oklch(84% 0.030 80)',
            borderRadius: 8,
            padding: '12px 14px',
            background: 'oklch(98% 0.014 80)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexDirection: ar ? 'row-reverse' : 'row',
          }}
        >
          <span
            style={{
              flex: 1,
              fontFamily: handFont,
              fontSize: 15,
              color: TOKENS.ink[500],
              textAlign: ar ? 'right' : 'left',
            }}
          >
            {strings.nothing}
          </span>
        </div>
      ) : null}
    </div>
  );
}
