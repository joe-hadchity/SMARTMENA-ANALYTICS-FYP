"use client";

import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n/I18nProvider";
import { TOKENS } from "@/lib/design-tokens";
import { formatNumber } from "@/lib/format";
import { socialAccountsApi, analyticsApi } from "@/lib/api";
import type { Provider } from "@/lib/types";

function Delta({ delta }: { delta: number }) {
  const isGood = delta > 0;
  const color = isGood ? 'oklch(40% 0.090 150)' : 'oklch(50% 0.150 25)';
  return (
    <span
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10.5,
        fontWeight: 600,
        color,
        letterSpacing: '0.02em',
      }}
    >
      {delta > 0 ? '▲ +' : '▼ '}{Math.abs(delta).toFixed(1)}%
    </span>
  );
}

interface PlatformStripProps {
  primary?: string;
}

export default function PlatformStrip({ primary = "oklch(46% 0.108 320)" }: PlatformStripProps) {
  const { t, locale } = useI18n();
  const ar = locale === "ar";

  const accountsQ = useQuery({
    queryKey: ["social-accounts"],
    queryFn: socialAccountsApi.list,
  });

  const platformBreakdownQ = useQuery({
    queryKey: ["analytics", "platform"],
    queryFn: analyticsApi.platformBreakdown,
  });

  const followerLabel = ar ? 'متابع' : 'followers';
  const postsLabel = ar ? 'منشور' : 'posts';
  const engLabel = ar ? 'تفاعل' : 'engagement';

  const accounts = accountsQ.data ?? [];
  const platformData = platformBreakdownQ.data ?? [];

  // Filter for Instagram and Facebook accounts only
  const displayAccounts = accounts
    .filter(acc => acc.provider === 'meta_instagram' || acc.provider === 'meta_facebook')
    .slice(0, 2); // Show max 2

  if (displayAccounts.length === 0) {
    return null; // Don't show if no accounts connected
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: displayAccounts.length === 1 ? '1fr' : '1fr 1fr',
        gap: 12,
        direction: ar ? 'rtl' : 'ltr',
      }}
    >
      {displayAccounts.map(account => {
        const isInstagram = account.provider === 'meta_instagram';
        const platColor = isInstagram ? TOKENS.ig : TOKENS.fb;
        const platformLabel = isInstagram
          ? (ar ? 'انستغرام' : 'Instagram')
          : (ar ? 'فيسبوك' : 'Facebook');

        // Find platform breakdown data for this account
        const breakdown = platformData.find(p =>
          (isInstagram && p.provider === 'meta_instagram') ||
          (!isInstagram && p.provider === 'meta_facebook')
        );

        const posts = breakdown?.posts ?? 0;
        const reach = breakdown?.reach ?? 0;
        const engagements = breakdown?.engagements ?? 0;
        const engagementRate = reach > 0 ? (engagements / reach) * 100 : 0;

        // Get followers from metadata
        const followers = (account.metadata?.followers_count as number) ?? 0;

        // Calculate progress bar (engagement rate capped at 10%)
        const barProgress = Math.min(engagementRate / 10, 1);

        return (
          <div
            key={account.id}
            style={{
              background: TOKENS.surface,
              border: `1px solid ${TOKENS.hairline}`,
              borderRadius: 12,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top color bar */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: platColor,
                opacity: 0.85,
              }}
            />

            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexDirection: ar ? 'row-reverse' : 'row',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  flexDirection: ar ? 'row-reverse' : 'row',
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    background: platColor + '14',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Newsreader, serif',
                    fontSize: 13,
                    color: platColor,
                    fontWeight: 600,
                  }}
                >
                  {isInstagram ? 'IG' : 'FB'}
                </div>
                <div style={{ textAlign: ar ? 'right' : 'left' }}>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: TOKENS.ink[900],
                      fontFamily: ar
                        ? "'IBM Plex Sans Arabic', sans-serif"
                        : "'IBM Plex Sans', sans-serif",
                    }}
                  >
                    {platformLabel}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: TOKENS.ink[500],
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >
                    {account.handle || account.display_name || '—'}
                  </div>
                </div>
              </div>
              {engagementRate > 0 && <Delta delta={engagementRate} />}
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: followerLabel, value: formatNumber(followers, locale) },
                { label: postsLabel, value: posts },
                { label: engLabel, value: engagementRate > 0 ? engagementRate.toFixed(2) + '%' : '—' },
              ].map((m, i) => (
                <div key={i} style={{ textAlign: ar ? 'right' : 'left' }}>
                  <div
                    style={{
                      fontFamily: 'Newsreader, serif',
                      fontSize: 18,
                      fontWeight: 500,
                      color: TOKENS.ink[900],
                      letterSpacing: '-0.01em',
                      lineHeight: 1,
                    }}
                  >
                    {m.value}
                  </div>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 9.5,
                      color: TOKENS.ink[500],
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginTop: 4,
                    }}
                  >
                    {m.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Bar marker */}
            <div
              style={{
                height: 4,
                background: TOKENS.ink[100],
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: (barProgress * 100) + '%',
                  height: '100%',
                  background: primary,
                  borderRadius: 999,
                  transition: 'width 300ms ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
