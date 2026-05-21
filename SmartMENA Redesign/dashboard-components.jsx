// ── dashboard-components.jsx ────────────────────────────────
// Sidebar · TopBar · HeroBanner · KPIStrip · PlatformStrip
// EngagementChart · ChannelSummary

const { useState, useRef, useEffect, useMemo } = React;

// ── UTILS ────────────────────────────────────────────────────
function fmtVal(v, fmt) {
  if (fmt === 'raw') return String(v);
  if (fmt === 'compact') {
    if (v >= 1e6) return (v/1e6).toFixed(1)+'M';
    if (v >= 1e3) return (v/1e3).toFixed(1).replace(/\.0$/,'')+'K';
    return v.toLocaleString();
  }
  if (fmt === 'percent')    return v.toFixed(2)+'%';
  if (fmt === 'integer')    return v.toLocaleString();
  return String(v);
}

function Delta({ delta, good }) {
  const isGood = good === undefined ? delta > 0 : good;
  const color = isGood ? 'oklch(40% 0.090 150)' : 'oklch(50% 0.150 25)';
  return (
    <span style={{
      fontFamily: 'IBM Plex Mono, monospace', fontSize: 10.5, fontWeight: 600,
      color, letterSpacing: '0.02em',
    }}>{delta > 0 ? '▲ +' : '▼ '}{Math.abs(delta).toFixed(1)}%</span>
  );
}

// SparkLine — soft area + line
function SparkLine({ data, color, w = 64, h = 24 }) {
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - 2 - ((v - min) / range) * (h - 4),
  ]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;
  const gid = 'sp' + Math.round(Math.random()*1e9);
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r={2.2} fill={color} />
    </svg>
  );
}

// ── SIDEBAR ──────────────────────────────────────────────────
const NAV_ANALYTICS = [
  { id: 'overview',    glyph: '●', key: 'overview' },
  { id: 'insights',    glyph: '◇', key: 'insights' },
  { id: 'reports',     glyph: '▤', key: 'reports' },
  { id: 'trends',      glyph: '↗', key: 'trends' },
  { id: 'competitors', glyph: '◉', key: 'competitors' },
  { id: 'playbook',    glyph: '✦', key: 'playbook' },
];
const NAV_CONTENT = [
  { id: 'compose',     glyph: '✎', key: 'compose' },
  { id: 'calendar',    glyph: '▦', key: 'calendar' },
  { id: 'connections', glyph: '⌬', key: 'connections' },
];

function Sidebar({ active, onNav, lang, primary }) {
  const ar = lang === 'ar';
  const s = STRINGS[lang];

  // Warm-paper sidebar — soft plum-tinted cream
  const sideBg   = 'oklch(96% 0.014 320)';
  const sideBdr  = 'oklch(88% 0.022 320)';
  const inactiveC = 'oklch(40% 0.040 320)';
  const hoverBg   = 'oklch(93% 0.024 320)';
  const labelC    = 'oklch(52% 0.050 320)';

  const Item = ({ item }) => {
    const isActive = active === item.id;
    return (
      <button
        onClick={() => onNav(item.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          flexDirection: ar ? 'row-reverse' : 'row',
          width: '100%',
          padding: '8px 10px',
          background: isActive ? primary : 'transparent',
          color: isActive ? '#fff' : inactiveC,
          border: 'none', cursor: 'pointer',
          borderRadius: 7,
          fontSize: 12.5, fontWeight: isActive ? 600 : 400,
          fontFamily: ar ? "'IBM Plex Sans Arabic', sans-serif" : "'IBM Plex Sans', sans-serif",
          letterSpacing: ar ? 0 : '0.005em',
          transition: 'background 140ms, color 140ms',
          textAlign: ar ? 'right' : 'left',
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = hoverBg; }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{ width: 16, fontSize: 11, color: isActive ? '#fff' : labelC, textAlign: 'center', flexShrink: 0 }}>{item.glyph}</span>
        <span style={{ flex: 1 }}>{s.nav[item.key]}</span>
      </button>
    );
  };

  const SectionLabel = ({ label }) => (
    <div style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 9.5, fontWeight: 500, textTransform: 'uppercase',
      letterSpacing: '0.16em',
      color: labelC,
      padding: ar ? '14px 12px 6px 0' : '14px 0 6px 12px',
      textAlign: ar ? 'right' : 'left',
    }}>{label}</div>
  );

  return (
    <aside style={{
      width: 220, minWidth: 220, height: '100vh', flexShrink: 0,
      background: sideBg,
      backgroundImage: `repeating-linear-gradient(135deg, transparent 0 22px, oklch(60% 0.06 320 / 0.05) 22px 23px)`,
      color: inactiveC,
      display: 'flex', flexDirection: 'column',
      padding: '18px 10px 14px',
      gap: 2,
      position: 'relative',
      borderRight: ar ? 'none' : `1px solid ${sideBdr}`,
      borderLeft:  ar ? `1px solid ${sideBdr}` : 'none',
    }}>
      {/* Brand mark slot — filled by BrandMark from extras */}
      <div style={{ padding: '0 8px 4px', marginBottom: 4 }}>
        <BrandMark lang={lang} primary={primary} variant="sidebar" />
      </div>

      <SectionLabel label={s.sectionAnalytics} />
      {NAV_ANALYTICS.map(i => <Item key={i.id} item={i} />)}

      <SectionLabel label={s.sectionContent} />
      {NAV_CONTENT.map(i => <Item key={i.id} item={i} />)}

      <div style={{ flex: 1 }}></div>

      {/* Footer — analyst handle */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        flexDirection: ar ? 'row-reverse' : 'row',
        padding: '10px 8px',
        borderTop: `1px dashed ${sideBdr}`,
        marginTop: 4,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 7, flexShrink: 0,
          background: primary, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Newsreader, serif', fontSize: 13, fontWeight: 500,
        }}>LG</div>
        <div style={{ flex: 1, textAlign: ar ? 'right' : 'left', minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'oklch(22% 0.050 320)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: ar ? "'IBM Plex Sans Arabic', sans-serif" : "'IBM Plex Sans', sans-serif" }}>{s.brandName}</div>
          <div style={{ fontSize: 10, color: labelC, fontFamily: "'IBM Plex Mono', monospace" }}>{s.handle}</div>
        </div>
      </div>
    </aside>
  );
}

// ── TOPBAR ───────────────────────────────────────────────────
function TopBar({ period, onPeriod, platform, onPlatform, lang, onLangToggle, dark, onDarkToggle, primary }) {
  const ar = lang === 'ar';
  const s = STRINGS[lang];

  return (
    <header style={{
      height: 56, flexShrink: 0, display: 'flex', alignItems: 'center',
      padding: '0 22px', gap: 14,
      flexDirection: ar ? 'row-reverse' : 'row',
      borderBottom: `1px solid ${TOKENS.hairline}`,
      background: dark ? 'oklch(17% 0.013 50)' : 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(10px)',
    }}>
      {/* Search */}
      <div style={{
        flex: 1, maxWidth: 460,
        display: 'flex', alignItems: 'center', gap: 8,
        flexDirection: ar ? 'row-reverse' : 'row',
        height: 34, padding: '0 12px',
        background: dark ? 'rgba(255,255,255,0.04)' : TOKENS.ink[50],
        border: `1px solid ${TOKENS.hairline}`,
        borderRadius: 8,
      }}>
        <span style={{ color: TOKENS.ink[500], fontSize: 13 }}>⌕</span>
        <input
          placeholder={s.search}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontFamily: ar ? "'IBM Plex Sans Arabic', sans-serif" : "'IBM Plex Sans', sans-serif",
            fontSize: 12.5, color: TOKENS.ink[800],
            textAlign: ar ? 'right' : 'left',
          }}
        />
      </div>

      {/* Period tabs */}
      <div style={{ display: 'flex', gap: 0, flexDirection: ar ? 'row-reverse' : 'row', flexShrink: 0 }}>
        {PERIOD_OPTIONS.map(p => {
          const active = p === period;
          return (
            <button key={p} onClick={() => onPeriod(p)} style={{
              padding: '6px 10px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11, fontWeight: active ? 600 : 500,
              letterSpacing: '0.06em',
              color: active ? primary : TOKENS.ink[500],
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderBottom: active ? `2px solid ${primary}` : '2px solid transparent',
              marginBottom: -1,
            }}>{s.periods[p]}</button>
          );
        })}
      </div>

      <div style={{ width: 1, height: 18, background: TOKENS.hairline }} />

      {/* Platform tabs */}
      <div style={{ display: 'flex', gap: 4, flexDirection: ar ? 'row-reverse' : 'row', flexShrink: 0 }}>
        {PLATFORM_FILTERS.map(p => {
          const active = platform === p.id;
          return (
            <button key={p.id} onClick={() => onPlatform(p.id)} style={{
              padding: '5px 11px',
              fontFamily: ar ? "'IBM Plex Sans Arabic', sans-serif" : "'IBM Plex Sans', sans-serif",
              fontSize: 11.5, fontWeight: active ? 600 : 500,
              color: active ? '#fff' : TOKENS.ink[700],
              background: active ? p.color : 'transparent',
              border: `1px solid ${active ? p.color : TOKENS.hairline}`,
              borderRadius: 999, cursor: 'pointer',
            }}>{s.platforms[p.id]}</button>
          );
        })}
      </div>

      <div style={{ flex: 0 }} />

      {/* Lang toggle */}
      <button onClick={onLangToggle} title="Toggle language" style={{
        height: 32, padding: '0 11px', borderRadius: 8,
        border: `1px solid ${TOKENS.hairline}`,
        background: 'transparent',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em',
        color: TOKENS.ink[700], cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ color: !ar ? primary : TOKENS.ink[500] }}>EN</span>
        <span style={{ color: TOKENS.ink[400] }}>⇄</span>
        <span style={{ color: ar ? primary : TOKENS.ink[500], fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>ع</span>
      </button>

      {/* Dark toggle */}
      <button onClick={onDarkToggle} title="Toggle dark mode" style={{
        width: 32, height: 32, borderRadius: 8,
        border: `1px solid ${TOKENS.hairline}`,
        background: 'transparent', cursor: 'pointer',
        fontSize: 14, color: TOKENS.ink[700],
      }}>{dark ? '☼' : '☾'}</button>

      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: `linear-gradient(135deg, ${TOKENS.teal[400]}, ${TOKENS.amber[400]})`,
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Newsreader, serif', fontSize: 12.5, fontWeight: 500,
        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
      }}>SA</div>
    </header>
  );
}

// ── HERO BANNER ──────────────────────────────────────────────
function HeroBanner({ lang, primary }) {
  const ar = lang === 'ar';
  const s = STRINGS[lang];
  const today = new Date(2026, 4, 11); // May 11, 2026 — locked for demo
  const greg = `${today.getDate()} ${s.months[today.getMonth()]} ${today.getFullYear()}`;
  const hijri = gregorianToHijri(today);
  const hijriStr = `${hijri.day} ${s.hijriMonths[hijri.month-1]} ${hijri.year}`;
  const slogan = ar ? STRINGS.ar.tagline : STRINGS.en.tagline;
  const handFont = ar ? "'Kalam', cursive" : "'Caveat', cursive";

  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      borderRadius: 14,
      padding: '22px 26px',
      background: `linear-gradient(${ar ? '270deg' : '90deg'}, oklch(94% 0.040 320) 0%, oklch(96% 0.024 330) 55%, oklch(98% 0.014 80) 100%)`,
      borderLeft:  ar ? 'none' : `3px solid ${primary}`,
      borderRight: ar ? `3px solid ${primary}` : 'none',
      boxShadow: '0 2px 8px rgba(120,70,110,0.06)',
      display: 'flex', flexDirection: ar ? 'row-reverse' : 'row',
      alignItems: 'center', gap: 18,
    }}>
      {/* Decorative dashed circle */}
      <div style={{
        position: 'absolute',
        [ar ? 'left' : 'right']: -30, top: -30,
        width: 120, height: 120, borderRadius: '50%',
        border: `1.5px dashed ${primary}`, opacity: 0.18,
      }}></div>
      <div style={{
        position: 'absolute',
        [ar ? 'left' : 'right']: 50, top: 30,
        width: 8, height: 8, borderRadius: '50%',
        background: primary, opacity: 0.35,
      }}></div>

      <div style={{ flex: 1, textAlign: ar ? 'right' : 'left', minWidth: 0, position: 'relative' }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'oklch(38% 0.060 320)', marginBottom: 6,
        }}>{ar ? 'لوحة الأداء' : 'performance overview'}</div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap' }}>
          <h1 style={{
            fontFamily: ar ? "'IBM Plex Sans Arabic', sans-serif" : 'Newsreader, serif',
            fontWeight: 500, fontSize: 30, letterSpacing: '-0.01em',
            color: TOKENS.ink[900], lineHeight: 1.1,
          }}>{s.overview}</h1>
          <span style={{
            fontFamily: handFont, fontSize: 22, fontWeight: 500,
            color: 'oklch(46% 0.108 320)', lineHeight: 1,
          }}>— {slogan}</span>
        </div>
      </div>

      {/* Date stack */}
      <div style={{
        flexShrink: 0, textAlign: ar ? 'left' : 'right',
        padding: ar ? '0 14px 0 0' : '0 0 0 14px',
        borderLeft:  ar ? 'none' : `1px dashed oklch(60% 0.06 320 / 0.5)`,
        borderRight: ar ? `1px dashed oklch(60% 0.06 320 / 0.5)` : 'none',
      }}>
        <div style={{
          fontFamily: ar ? "'IBM Plex Sans Arabic', sans-serif" : "'IBM Plex Mono', monospace",
          fontSize: 12, color: TOKENS.ink[800], fontWeight: 600,
        }}>{greg}</div>
        <div style={{
          fontFamily: ar ? "'IBM Plex Sans Arabic', sans-serif" : 'Newsreader, serif',
          fontStyle: ar ? 'normal' : 'italic',
          fontSize: 12.5, color: 'oklch(40% 0.070 320)', marginTop: 2,
        }}>{hijriStr}</div>
      </div>
    </div>
  );
}

// ── PLATFORM STRIP (per-channel mini-cards) ──────────────────
function PlatformStrip({ lang, primary }) {
  const ar = lang === 'ar';
  const s = STRINGS[lang];
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
      direction: ar ? 'rtl' : 'ltr',
    }}>
      {PLATFORM_CARDS.map(c => {
        const platColor = c.id === 'instagram' ? TOKENS.ig : TOKENS.fb;
        return (
          <div key={c.id} style={{
            background: TOKENS.surface,
            border: `1px solid ${TOKENS.hairline}`,
            borderRadius: 12, padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 12,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: platColor, opacity: 0.85,
            }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: ar ? 'row-reverse' : 'row' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexDirection: ar ? 'row-reverse' : 'row' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 6,
                  background: platColor + '14',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Newsreader, serif', fontSize: 13, color: platColor, fontWeight: 600,
                }}>{c.id === 'instagram' ? 'IG' : 'FB'}</div>
                <div style={{ textAlign: ar ? 'right' : 'left' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: TOKENS.ink[900], fontFamily: ar ? "'IBM Plex Sans Arabic', sans-serif" : "'IBM Plex Sans', sans-serif" }}>{s.platforms[c.id]}</div>
                  <div style={{ fontSize: 10, color: TOKENS.ink[500], fontFamily: "'IBM Plex Mono', monospace" }}>{c.handle}</div>
                </div>
              </div>
              <Delta delta={c.engRate > 6 ? +6.2 : +3.4} />
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: s.followers, value: fmtVal(c.followers, 'compact') },
                { label: s.posts,     value: c.posts },
                { label: s.eng,       value: c.engRate.toFixed(2)+'%' },
              ].map((m, i) => (
                <div key={i} style={{ textAlign: ar ? 'right' : 'left' }}>
                  <div style={{ fontFamily: 'Newsreader, serif', fontSize: 18, fontWeight: 500, color: TOKENS.ink[900], letterSpacing: '-0.01em', lineHeight: 1 }}>{m.value}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: TOKENS.ink[500], letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* Bar marker */}
            <div style={{ height: 4, background: TOKENS.ink[100], borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: (c.bar*100)+'%', height: '100%', background: primary, borderRadius: 999 }}></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── KPI STRIP — 5 cells ──────────────────────────────────────
function KPIStrip({ lang, primary }) {
  const ar = lang === 'ar';
  const s = STRINGS[lang];
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr',
      gap: 0,
      background: TOKENS.surface,
      border: `1px solid ${TOKENS.hairline}`,
      borderRadius: 14, overflow: 'hidden',
      direction: ar ? 'rtl' : 'ltr',
    }}>
      {KPIS.map((k, i) => {
        const hero = k.hero;
        const showColor = hero ? primary : k.color;
        return (
          <div key={k.id} style={{
            padding: hero ? '20px 22px' : '18px 18px',
            background: hero ? `linear-gradient(${ar ? '270deg' : '90deg'}, oklch(96% 0.020 320) 0%, transparent 100%)` : 'transparent',
            borderRight: !ar && i < KPIS.length-1 ? `1px solid ${TOKENS.hairline}` : 'none',
            borderLeft:  ar && i < KPIS.length-1 ? `1px solid ${TOKENS.hairline}` : 'none',
            display: 'flex', flexDirection: 'column', gap: 8,
            position: 'relative',
          }}>
            {hero && (
              <div style={{
                position: 'absolute', top: 0, bottom: 0,
                [ar ? 'right' : 'left']: 0, width: 3,
                background: primary,
              }}></div>
            )}
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: TOKENS.ink[500], fontWeight: 500,
            }}>{s.kpis[k.key]}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexDirection: ar ? 'row-reverse' : 'row' }}>
              <div style={{
                fontFamily: 'Newsreader, serif',
                fontSize: hero ? 36 : 26,
                fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1,
                color: hero ? primary : TOKENS.ink[900],
              }}>{fmtVal(k.value, k.format)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: ar ? 'row-reverse' : 'row', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Delta delta={k.delta} good={k.deltaGood} />
                {hero && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: TOKENS.ink[500] }}>{s.vsLast}</span>}
              </div>
              <SparkLine data={k.spark} color={showColor} w={hero ? 70 : 56} h={hero ? 28 : 22} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── ENGAGEMENT CHART ─────────────────────────────────────────
function EngagementChart({ period, platform, lang, primary }) {
  const ar = lang === 'ar';
  const s = STRINGS[lang];
  const data = ENGAGEMENT_TIMELINE[period] || ENGAGEMENT_TIMELINE['7D'];
  const W = 600, H = 200, padL = 38, padR = 16, padT = 14, padB = 26;

  const lines = (
    platform === 'all'       ? [{ key: 'instagram', color: TOKENS.ig, label: 'Instagram' }, { key: 'facebook',  color: TOKENS.fb, label: 'Facebook' }]
    : platform === 'instagram' ? [{ key: 'instagram', color: TOKENS.ig, label: 'Instagram' }]
    : [{ key: 'facebook', color: TOKENS.fb, label: 'Facebook' }]
  );

  const allVals = data.flatMap(d => lines.map(l => d[l.key]));
  const maxV = Math.max(...allVals) * 1.1;
  const toX = i => padL + (i / (data.length - 1)) * (W - padL - padR);
  const toY = v => padT + (1 - v / maxV) * (H - padT - padB);

  const yTicks = [0, Math.round(maxV * 0.5), Math.round(maxV)];

  return (
    <div style={{
      background: TOKENS.surface,
      border: `1px solid ${TOKENS.hairline}`,
      borderRadius: 14, padding: '18px 18px 12px',
      height: '100%',
      display: 'flex', flexDirection: 'column',
      transform: 'rotate(-0.2deg)',
      boxShadow: '0 2px 8px rgba(40,30,30,0.04)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexDirection: ar ? 'row-reverse' : 'row' }}>
        <div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: TOKENS.ink[500], fontWeight: 500,
          }}>{ar ? 'تحليل' : 'analysis'}</div>
          <h3 style={{
            fontFamily: ar ? "'IBM Plex Sans Arabic', sans-serif" : 'Newsreader, serif',
            fontWeight: 500, fontSize: 18,
            color: TOKENS.ink[900], marginTop: 2,
          }}>{s.engOverTime}</h3>
        </div>
        <div style={{ display: 'flex', gap: 14, flexDirection: ar ? 'row-reverse' : 'row' }}>
          {lines.map(l => (
            <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 6, flexDirection: ar ? 'row-reverse' : 'row' }}>
              <div style={{ width: 14, height: 2, background: l.color, borderRadius: 1 }}></div>
              <span style={{ fontSize: 10.5, color: TOKENS.ink[600], fontFamily: "'IBM Plex Mono', monospace" }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', flex: 1, overflow: 'visible' }}>
        <defs>
          {lines.map(l => (
            <linearGradient key={l.key} id={`grad-${l.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={l.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={l.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid */}
        {yTicks.map(t => (
          <g key={t}>
            <line x1={padL} y1={toY(t)} x2={W - padR} y2={toY(t)} stroke={TOKENS.hairline} strokeWidth={1} strokeDasharray="2 4" />
            <text x={padL - 6} y={toY(t) + 4} textAnchor="end" fontSize={9.5} fill={TOKENS.ink[500]} fontFamily="'IBM Plex Mono', monospace">
              {t >= 1000 ? (t/1000).toFixed(1)+'K' : t}
            </text>
          </g>
        ))}

        {/* X labels */}
        {data.map((d, i) => (
          <text key={i} x={toX(i)} y={H - 6} textAnchor="middle" fontSize={9.5} fill={TOKENS.ink[500]} fontFamily="'IBM Plex Mono', monospace">{d.label}</text>
        ))}

        {/* Lines */}
        {lines.map(l => {
          const pts = data.map((d, i) => [toX(i), toY(d[l.key])]);
          const path = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
          const area = `${path} L ${(W-padR).toFixed(1)} ${(H-padB).toFixed(1)} L ${padL} ${(H-padB).toFixed(1)} Z`;
          return (
            <g key={l.key}>
              <path d={area} fill={`url(#grad-${l.key})`} />
              <path d={path} fill="none" stroke={l.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              {pts.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r={2.6} fill={TOKENS.surface} stroke={l.color} strokeWidth={1.5} />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── CHANNEL SUMMARY (bottom) ─────────────────────────────────
function ChannelSummary({ lang, primary }) {
  const ar = lang === 'ar';
  const s = STRINGS[lang];
  return (
    <div style={{
      background: TOKENS.surface,
      border: `1px solid ${TOKENS.hairline}`,
      borderRadius: 14, padding: '16px 18px',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        flexDirection: ar ? 'row-reverse' : 'row',
        marginBottom: 14,
      }}>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKENS.ink[500] }}>{ar ? 'بيانات القنوات' : 'channel data'}</div>
          <h3 style={{ fontFamily: ar ? "'IBM Plex Sans Arabic', sans-serif" : 'Newsreader, serif', fontWeight: 500, fontSize: 18, color: TOKENS.ink[900], marginTop: 2 }}>{s.channelSummary}</h3>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, direction: ar ? 'rtl' : 'ltr' }}>
        {CHANNEL_STATS.map(c => {
          const color = c.id === 'instagram' ? TOKENS.ig : TOKENS.fb;
          const stats = [
            { k: s.followers, v: fmtVal(c.followers, 'compact') },
            { k: s.kpis.reach, v: fmtVal(c.reach, 'compact') },
            { k: s.kpis.impressions, v: fmtVal(c.impressions, 'compact') },
            { k: s.posts, v: c.posts },
            { k: s.kpis.engagements, v: c.engRate.toFixed(2)+'%' },
            { k: ar ? 'الحفظ' : 'Saves', v: fmtVal(c.saves, 'compact') },
          ];
          return (
            <div key={c.id} style={{
              border: `1px dashed ${TOKENS.hairline}`,
              borderRadius: 10, padding: '14px 16px',
              background: TOKENS.ink[50] + '80',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: ar ? 'row-reverse' : 'row', marginBottom: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: color + '18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Newsreader, serif', color, fontSize: 12.5, fontWeight: 600,
                }}>{c.id === 'instagram' ? 'IG' : 'FB'}</div>
                <div style={{ flex: 1, textAlign: ar ? 'right' : 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TOKENS.ink[900], fontFamily: ar ? "'IBM Plex Sans Arabic', sans-serif" : "'IBM Plex Sans', sans-serif" }}>{s.platforms[c.id]}</div>
                  <div style={{ fontSize: 10, color: TOKENS.ink[500], fontFamily: "'IBM Plex Mono', monospace" }}>{c.handle}</div>
                </div>
                <div style={{ height: 2, flex: 0.7, background: color, opacity: 0.3, borderRadius: 999 }}></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, rowGap: 12 }}>
                {stats.map((m, i) => (
                  <div key={i} style={{ textAlign: ar ? 'right' : 'left' }}>
                    <div style={{ fontFamily: 'Newsreader, serif', fontSize: 17, fontWeight: 500, color: TOKENS.ink[900], letterSpacing: '-0.01em', lineHeight: 1 }}>{m.v}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: TOKENS.ink[500], letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }}>{m.k}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, {
  Sidebar, TopBar, HeroBanner, PlatformStrip, KPIStrip,
  EngagementChart, ChannelSummary,
  SparkLine, Delta, fmtVal,
});
