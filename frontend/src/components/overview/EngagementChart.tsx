"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n/I18nProvider";
import { TOKENS } from "@/lib/design-tokens";
import { analyticsApi } from "@/lib/api";

interface EngagementChartProps {
  primary?: string;
  platform?: 'all' | 'meta_instagram' | 'meta_facebook';
}

export default function EngagementChart({
  primary = "oklch(46% 0.108 320)",
  platform = 'all',
}: EngagementChartProps) {
  const { t, locale } = useI18n();
  const ar = locale === "ar";

  const timeseriesQ = useQuery({
    queryKey: ["analytics", "timeseries", { metric: "engagement", groupBy: "day" }],
    queryFn: () => analyticsApi.timeseries({ metric: "engagement", groupBy: "day" }),
  });

  const platformBreakdownQ = useQuery({
    queryKey: ["analytics", "platform"],
    queryFn: analyticsApi.platformBreakdown,
  });

  // Transform data for chart
  const data = useMemo(() => {
    const points = timeseriesQ.data?.points ?? [];
    const platformData = platformBreakdownQ.data ?? [];

    // Get last 7 days
    const last7 = points.slice(-7);

    // For demo, split engagement between IG and FB based on platform breakdown ratio
    const igBreakdown = platformData.find(p => p.provider === 'meta_instagram');
    const fbBreakdown = platformData.find(p => p.provider === 'meta_facebook');

    const totalEng = (igBreakdown?.engagements ?? 0) + (fbBreakdown?.engagements ?? 0);
    const igRatio = totalEng > 0 ? (igBreakdown?.engagements ?? 0) / totalEng : 0.6;
    const fbRatio = totalEng > 0 ? (fbBreakdown?.engagements ?? 0) / totalEng : 0.4;

    return last7.map(p => {
      const date = new Date(p.bucket);
      const dayNames = ar
        ? ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      return {
        label: dayNames[date.getDay()],
        instagram: Math.round(p.value * igRatio),
        facebook: Math.round(p.value * fbRatio),
      };
    });
  }, [timeseriesQ.data, platformBreakdownQ.data, ar]);

  const W = 600;
  const H = 200;
  const padL = 38;
  const padR = 16;
  const padT = 14;
  const padB = 26;

  const labels = {
    kicker: ar ? 'تحليل' : 'analysis',
    title: ar ? 'التفاعل بمرور الوقت' : 'Engagement over time',
    instagram: ar ? 'انستغرام' : 'Instagram',
    facebook: ar ? 'فيسبوك' : 'Facebook',
  };

  const lines = platform === 'all'
    ? [
        { key: 'instagram' as const, color: TOKENS.ig, label: labels.instagram },
        { key: 'facebook' as const, color: TOKENS.fb, label: labels.facebook },
      ]
    : platform === 'meta_instagram'
    ? [{ key: 'instagram' as const, color: TOKENS.ig, label: labels.instagram }]
    : [{ key: 'facebook' as const, color: TOKENS.fb, label: labels.facebook }];

  if (data.length === 0) {
    return (
      <div
        style={{
          background: TOKENS.surface,
          border: `1px solid ${TOKENS.hairline}`,
          borderRadius: 14,
          padding: '18px 18px 12px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: 'rotate(-0.2deg)',
          boxShadow: '0 2px 8px rgba(40,30,30,0.04)',
        }}
      >
        <div
          style={{
            fontFamily: ar ? "'Kalam', cursive" : "'Caveat', cursive",
            fontSize: 15,
            color: TOKENS.ink[500],
          }}
        >
          {ar ? 'لا توجد بيانات بعد ✿' : 'no data yet ✿'}
        </div>
      </div>
    );
  }

  const allVals = data.flatMap(d => lines.map(l => d[l.key]));
  const maxV = Math.max(...allVals, 1) * 1.1;

  const toX = (i: number) => padL + (i / (data.length - 1)) * (W - padL - padR);
  const toY = (v: number) => padT + (1 - v / maxV) * (H - padT - padB);

  const yTicks = [0, Math.round(maxV * 0.5), Math.round(maxV)];

  return (
    <div
      style={{
        background: TOKENS.surface,
        border: `1px solid ${TOKENS.hairline}`,
        borderRadius: 14,
        padding: '18px 18px 12px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transform: 'rotate(-0.2deg)',
        boxShadow: '0 2px 8px rgba(40,30,30,0.04)',
      }}
    >
      {/* Header: kicker + title (left), legend (right) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
          flexDirection: ar ? 'row-reverse' : 'row',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9.5,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: TOKENS.ink[500],
              fontWeight: 500,
            }}
          >
            {labels.kicker}
          </div>
          <h3
            style={{
              fontFamily: ar
                ? "'IBM Plex Sans Arabic', sans-serif"
                : 'Newsreader, serif',
              fontWeight: 500,
              fontSize: 18,
              color: TOKENS.ink[900],
              marginTop: 2,
            }}
          >
            {labels.title}
          </h3>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 14,
            flexDirection: ar ? 'row-reverse' : 'row',
          }}
        >
          {lines.map(l => (
            <div
              key={l.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexDirection: ar ? 'row-reverse' : 'row',
              }}
            >
              <div style={{ width: 14, height: 2, background: l.color, borderRadius: 1 }} />
              <span
                style={{
                  fontSize: 10.5,
                  color: TOKENS.ink[600],
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                {l.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', flex: 1, overflow: 'visible' }}
      >
        <defs>
          {lines.map(l => (
            <linearGradient key={l.key} id={`grad-${l.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={l.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={l.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Dashed grid + Y labels */}
        {yTicks.map(t => (
          <g key={t}>
            <line
              x1={padL}
              y1={toY(t)}
              x2={W - padR}
              y2={toY(t)}
              stroke={TOKENS.hairline}
              strokeWidth={1}
              strokeDasharray="2 4"
            />
            <text
              x={padL - 6}
              y={toY(t) + 4}
              textAnchor="end"
              fontSize={9.5}
              fill={TOKENS.ink[500]}
              fontFamily="'IBM Plex Mono', monospace"
            >
              {t >= 1000 ? (t / 1000).toFixed(1) + 'K' : t}
            </text>
          </g>
        ))}

        {/* X labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={toX(i)}
            y={H - 6}
            textAnchor="middle"
            fontSize={9.5}
            fill={TOKENS.ink[500]}
            fontFamily="'IBM Plex Mono', monospace"
          >
            {d.label}
          </text>
        ))}

        {/* Lines + area fill + point dots */}
        {lines.map(l => {
          const pts = data.map((d, i) => [toX(i), toY(d[l.key])]);
          const path = pts
            .map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
            .join(' ');
          const area = `${path} L ${(W - padR).toFixed(1)} ${(H - padB).toFixed(1)} L ${padL} ${(H - padB).toFixed(1)} Z`;

          return (
            <g key={l.key}>
              <path d={area} fill={`url(#grad-${l.key})`} />
              <path
                d={path}
                fill="none"
                stroke={l.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {pts.map((p, i) => (
                <circle
                  key={i}
                  cx={p[0]}
                  cy={p[1]}
                  r={2.6}
                  fill={TOKENS.surface}
                  stroke={l.color}
                  strokeWidth={1.5}
                />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
