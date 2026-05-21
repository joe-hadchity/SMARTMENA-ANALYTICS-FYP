// ── dashboard-extras.jsx ────────────────────────────────────
// BrandMark · HashtagRadar · BestTimeStrip · LastPost
// TodoList · ReminderCard · Hijri helpers

// React hooks accessed via React.* to avoid Babel top-level collisions

// ── HIJRI HELPER ────────────────────────────────────────────
// Simple Umm al-Qura approximation via Julian day arithmetic.
function gregorianToHijri(date) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  let jd;
  if ((y < 1582) || (y == 1582 && m < 10) || (y == 1582 && m == 10 && d < 15)) {
    jd = (367 * y) - Math.floor((7 * (y + 5001 + Math.floor((m - 9) / 7))) / 4) +
         Math.floor((275 * m) / 9) + d + 1729777;
  } else {
    jd = Math.floor((1461 * (y + 4800 + Math.floor((m - 14) / 12))) / 4) +
         Math.floor((367 * (m - 2 - 12 * Math.floor((m - 14) / 12))) / 12) -
         Math.floor((3 * Math.floor((y + 4900 + Math.floor((m - 14) / 12)) / 100)) / 4) +
         d - 32075;
  }
  jd = jd - 1948440 + 10632;
  const n = Math.floor((jd - 1) / 10631);
  jd = jd - 10631 * n + 354;
  const j = (Math.floor((10985 - jd) / 5316)) * (Math.floor((50 * jd) / 17719)) +
            (Math.floor(jd / 5670)) * (Math.floor((43 * jd) / 15238));
  jd = jd - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) -
       (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
  const month = Math.floor((24 * jd) / 709);
  const day = jd - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { year, month, day };
}

// ── BRAND MARK ──────────────────────────────────────────────
function BrandMark({ lang, primary, variant = 'sidebar' }) {
  const ar = lang === 'ar';
  const inSidebar = variant === 'sidebar';
  const fg = inSidebar ? 'oklch(22% 0.050 320)' : TOKENS.ink[900];
  const sub = inSidebar ? 'oklch(52% 0.050 320)' : TOKENS.ink[500];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9,
      flexDirection: ar ? 'row-reverse' : 'row',
    }}>
      {/* mark: dashed circle with serif S */}
      <div style={{ position: 'relative', width: 30, height: 30, flexShrink: 0 }}>
        <svg width="30" height="30" viewBox="0 0 30 30" style={{ display: 'block' }}>
          <circle cx="15" cy="15" r="13" fill="none" stroke={primary} strokeWidth="1.4" strokeDasharray="2.4 2.6" />
          <circle cx="15" cy="15" r="9.5" fill={primary} />
        </svg>
        <span style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: 14, color: '#fff', lineHeight: 1,
        }}>S</span>
      </div>
      <div style={{ textAlign: ar ? 'right' : 'left' }}>
        <div style={{
          fontFamily: ar ? "'IBM Plex Sans Arabic', sans-serif" : 'Newsreader, serif',
          fontWeight: 500, fontSize: 16, letterSpacing: '-0.01em',
          color: fg, lineHeight: 1,
        }}>{STRINGS[lang].brand}</div>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 8.5, letterSpacing: '0.16em', textTransform: 'uppercase',
          color: sub, marginTop: 3,
        }}>analytics ✦ MENA</div>
      </div>
    </div>
  );
}

// ── HASHTAG RADAR (horizontal bar/momentum) ─────────────────
function HashtagRadar({ lang, primary }) {
  const ar = lang === 'ar';
  const s = STRINGS[lang];
  const maxMomentum = Math.max(...HASHTAGS.map(h => h.momentum));

  return (
    <div style={{
      background: TOKENS.surface,
      border: `1px solid ${TOKENS.hairline}`,
      borderRadius: 12, padding: '14px 16px',
      transform: 'rotate(0.3deg)',
      boxShadow: '0 2px 6px rgba(40,30,30,0.04)',
    }}>
      <div style={{ marginBottom: 12, textAlign: ar ? 'right' : 'left' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKENS.ink[500] }}>{ar ? 'وسوم' : 'hashtags'}</div>
        <h3 style={{ fontFamily: ar ? "'IBM Plex Sans Arabic', sans-serif" : 'Newsreader, serif', fontWeight: 500, fontSize: 15, color: TOKENS.ink[900], marginTop: 2 }}>{s.hashtagsTitle}</h3>
        <div style={{ fontFamily: ar ? "'Kalam', cursive" : "'Caveat', cursive", fontSize: 13.5, color: 'oklch(46% 0.108 320)', marginTop: 2 }}>{s.hashtagsSub}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {HASHTAGS.map((h, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: ar ? 'row-reverse' : 'row' }}>
            <div style={{
              minWidth: 110, fontSize: 11.5, fontWeight: 500, color: TOKENS.ink[800],
              fontFamily: /[\u0600-\u06FF]/.test(h.tag) ? "'IBM Plex Sans Arabic', sans-serif" : "'IBM Plex Sans', sans-serif",
              textAlign: ar ? 'right' : 'left',
              whiteSpace: 'nowrap',
            }}>{h.tag}</div>
            <div style={{ flex: 1, height: 6, background: TOKENS.ink[100], borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
              <div style={{
                position: 'absolute', [ar ? 'right' : 'left']: 0, top: 0, bottom: 0,
                width: (h.momentum / maxMomentum * 100) + '%',
                background: `linear-gradient(${ar ? '270deg' : '90deg'}, ${primary} 0%, oklch(64% 0.108 320) 100%)`,
                borderRadius: 999,
              }}></div>
            </div>
            <div style={{
              minWidth: 30, fontFamily: 'Newsreader, serif', fontSize: 13, fontWeight: 500,
              color: TOKENS.ink[900], textAlign: ar ? 'left' : 'right',
            }}>{h.momentum}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── BEST TIME STRIP (7×4 heatmap) ────────────────────────────
function BestTimeStrip({ lang, primary }) {
  const ar = lang === 'ar';
  const s = STRINGS[lang];
  const rows = ar ? BEST_TIME.rowsAr : BEST_TIME.rows;
  const cols = ar ? BEST_TIME.colsAr : BEST_TIME.cols;

  return (
    <div style={{
      background: TOKENS.surface,
      border: `1px solid ${TOKENS.hairline}`,
      borderRadius: 12, padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 22,
      flexDirection: ar ? 'row-reverse' : 'row',
    }}>
      <div style={{ flexShrink: 0, textAlign: ar ? 'right' : 'left', minWidth: 180 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKENS.ink[500] }}>{ar ? 'وقت' : 'timing'}</div>
        <h3 style={{ fontFamily: ar ? "'IBM Plex Sans Arabic', sans-serif" : 'Newsreader, serif', fontWeight: 500, fontSize: 15, color: TOKENS.ink[900], marginTop: 2 }}>{s.bestTimeLabel}</h3>
        <div style={{ fontFamily: ar ? "'Kalam', cursive" : "'Caveat', cursive", fontSize: 17, color: 'oklch(46% 0.108 320)', marginTop: 4, lineHeight: 1.2 }}>{s.bestTime}</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, direction: 'ltr' }}>
        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '32px repeat(4, 1fr)', gap: 4 }}>
          <div></div>
          {cols.map((c, i) => (
            <div key={i} style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase',
              color: TOKENS.ink[500], textAlign: 'center',
            }}>{c}</div>
          ))}
        </div>
        {/* Rows */}
        {BEST_TIME.data.map((row, ri) => (
          <div key={ri} style={{ display: 'grid', gridTemplateColumns: '32px repeat(4, 1fr)', gap: 4, alignItems: 'center' }}>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9.5, color: TOKENS.ink[600], textAlign: ar ? 'left' : 'right', paddingRight: 4,
            }}>{rows[ri]}</div>
            {row.map((v, ci) => {
              const isPeak = ri === BEST_TIME.peak.row && ci === BEST_TIME.peak.col;
              const bg = `color-mix(in oklch, ${primary} ${Math.round(v*100)}%, oklch(96% 0.018 80))`;
              return (
                <div key={ci} style={{
                  height: 22, borderRadius: 5,
                  background: bg,
                  border: isPeak ? `1.5px dashed oklch(46% 0.108 320)` : '1px solid rgba(0,0,0,0.02)',
                  position: 'relative',
                }}>
                  {isPeak && (
                    <span style={{
                      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Caveat', cursive", fontSize: 13, color: '#fff',
                    }}>✦</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── LAST POST ────────────────────────────────────────────────
function LastPost({ lang, primary }) {
  const ar = lang === 'ar';
  const s = STRINGS[lang];
  const handFont = ar ? "'Kalam', cursive" : "'Caveat', cursive";
  const post = LAST_POST;
  const color = post.platform === 'instagram' ? TOKENS.ig : TOKENS.fb;

  return (
    <div style={{
      background: TOKENS.surface,
      border: `1px solid ${TOKENS.hairline}`,
      borderRadius: 12, padding: 14,
      transform: 'rotate(-0.4deg)',
      boxShadow: '0 2px 8px rgba(40,30,30,0.05)',
      position: 'relative',
      height: '100%',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Rotated sticker */}
      <div style={{
        position: 'absolute', top: -10, [ar ? 'left' : 'right']: -8,
        transform: `rotate(${ar ? '-8deg' : '8deg'})`,
        background: 'oklch(94% 0.030 60)',
        border: '1px dashed oklch(50% 0.130 60)',
        padding: '3px 9px', borderRadius: 4,
        fontFamily: handFont, fontSize: 13, color: 'oklch(38% 0.110 60)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        zIndex: 2,
      }}>{s.justPublished}</div>

      {/* Image placeholder with gradient blobs */}
      <div style={{
        height: 110, borderRadius: 8, overflow: 'hidden',
        position: 'relative',
        background: `radial-gradient(circle at 30% 40%, oklch(80% 0.090 60) 0%, transparent 50%),
                     radial-gradient(circle at 75% 65%, oklch(78% 0.080 320) 0%, transparent 55%),
                     linear-gradient(135deg, oklch(94% 0.030 40), oklch(92% 0.024 80))`,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(45deg, transparent 0 6px, rgba(255,255,255,0.04) 6px 7px)',
        }}></div>
        <div style={{
          position: 'absolute', bottom: 8, [ar ? 'right' : 'left']: 10,
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'oklch(40% 0.090 50)',
          background: 'rgba(255,255,255,0.7)',
          padding: '2px 7px', borderRadius: 3,
        }}>product · hijaz reel</div>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: ar ? 'row-reverse' : 'row' }}>
        <div style={{ width: 22, height: 22, borderRadius: 5, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Newsreader, serif', color, fontSize: 10.5, fontWeight: 600 }}>IG</div>
        <span style={{ fontSize: 12, fontWeight: 600, color: TOKENS.ink[900], fontFamily: "'IBM Plex Mono', monospace" }}>{post.handle}</span>
        <span style={{ flex: 1 }}></span>
        <span style={{ fontSize: 10, color: TOKENS.ink[500], fontFamily: "'IBM Plex Mono', monospace" }}>{ar ? post.timeAgoAr : post.timeAgo}</span>
      </div>

      {/* Body — caveat handwritten */}
      <div style={{
        fontFamily: handFont,
        fontSize: ar ? 16 : 17,
        lineHeight: 1.35,
        color: TOKENS.ink[800],
        textAlign: ar ? 'right' : 'left',
      }}>{ar ? post.bodyAr : post.body}</div>

      {/* Stats vertical list */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 4,
        paddingTop: 10, borderTop: `1px dashed ${TOKENS.hairline}`,
      }}>
        {[
          [s.likes,    post.stats.likes],
          [s.comments, post.stats.comments],
          [s.saves,    post.stats.saves],
          [s.shares,   post.stats.shares],
        ].map(([k, v], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', flexDirection: ar ? 'row-reverse' : 'row' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: TOKENS.ink[500], letterSpacing: '0.08em', textTransform: 'uppercase' }}>{k}</span>
            <span style={{ fontFamily: 'Newsreader, serif', fontSize: 14, fontWeight: 500, color: TOKENS.ink[900], letterSpacing: '-0.01em' }}>{fmtVal(v, 'compact')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TODO LIST (kawaii torn-paper) ────────────────────────────
function TodoList({ lang, primary }) {
  const ar = lang === 'ar';
  const s = STRINGS[lang];
  const handFont = ar ? "'Kalam', cursive" : "'Caveat', cursive";
  const today = new Date(2026, 4, 11);
  const greg = `${today.getDate()} ${STRINGS[lang].months[today.getMonth()]} ${today.getFullYear()}`;

  const [items, setItems] = React.useState(TODOS.map(t => ({ ...t })));

  function toggleDone(id) {
    setItems(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }
  function moveTomorrow(id) {
    setItems(prev => prev.map(t => t.id === id ? { ...t, moved: !t.moved } : t));
  }

  return (
    <div style={{
      background: TOKENS.surface,
      border: `1px solid ${TOKENS.hairline}`,
      borderRadius: 12,
      padding: '18px 22px 22px',
      position: 'relative',
      // torn-paper top edge via clip-path
      clipPath: 'polygon(0 8px, 3% 4px, 7% 10px, 12% 3px, 18% 8px, 24% 2px, 32% 9px, 40% 4px, 48% 10px, 56% 3px, 64% 9px, 72% 5px, 80% 10px, 88% 4px, 94% 9px, 100% 6px, 100% 100%, 0 100%)',
      height: '100%',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 4px 14px rgba(40,30,30,0.05)',
    }}>
      {/* tape strip */}
      <div style={{
        position: 'absolute', top: -4, [ar ? 'right' : 'left']: '50%', transform: 'translateX(-50%) rotate(-1.5deg)',
        width: 70, height: 16,
        background: 'oklch(92% 0.024 80 / 0.85)',
        border: '1px solid oklch(82% 0.040 80 / 0.6)',
      }}></div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexDirection: ar ? 'row-reverse' : 'row', marginBottom: 12 }}>
        <div style={{ textAlign: ar ? 'right' : 'left' }}>
          <h3 style={{
            fontFamily: handFont, fontWeight: 500, fontSize: 28,
            color: 'oklch(38% 0.094 320)', lineHeight: 1,
          }}>{s.todo.title}</h3>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: TOKENS.ink[500], letterSpacing: '0.08em', marginTop: 5 }}>
            {s.todo.sub}{greg}
          </div>
        </div>
        <div style={{
          fontFamily: 'Newsreader, serif', fontSize: 24, fontWeight: 500,
          color: 'oklch(46% 0.108 320)',
        }}>
          {items.filter(t=>t.done).length}<span style={{ color: TOKENS.ink[400] }}>/{items.length}</span>
        </div>
      </div>

      {/* Items */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {items.map((t, i) => {
          const text = ar ? TODOS_AR[t.id] : t.text;
          const rot = ((i % 2 === 0) ? -0.4 : 0.4) + (i*0.05 - 0.15);
          return (
            <div key={t.id} style={{
              background: TOKENS.pastel[t.pastel],
              border: '1px solid rgba(0,0,0,0.04)',
              borderRadius: 7,
              padding: '8px 12px',
              display: 'flex', alignItems: 'center', gap: 10,
              flexDirection: ar ? 'row-reverse' : 'row',
              transform: `rotate(${rot}deg)`,
              boxShadow: '0 1px 4px rgba(40,30,30,0.06), 0 0 0 1px rgba(255,255,255,0.4) inset',
              opacity: t.done ? 0.6 : 1,
              transition: 'opacity 180ms',
            }}>
              {/* Hand-drawn checkbox */}
              <button
                onClick={() => toggleDone(t.id)}
                style={{
                  width: 20, height: 20, flexShrink: 0,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <path d="M2 3 Q3 2 5 3 L17 3 Q19 2.5 18 4 L18 16 Q19 18 17 17 L4 17 Q1.5 17.5 2.5 16 Z"
                    fill="rgba(255,255,255,0.5)"
                    stroke={TOKENS.ink[700]} strokeWidth="1.3" strokeLinejoin="round" />
                  {t.done && (
                    <path d="M4.5 10.5 L8.5 14 L16 5.5"
                      fill="none" stroke={primary} strokeWidth="2.2"
                      strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </svg>
              </button>
              <span style={{
                flex: 1,
                fontFamily: ar ? "'IBM Plex Sans Arabic', sans-serif" : "'IBM Plex Sans', sans-serif",
                fontSize: 12.5, color: TOKENS.ink[800],
                textDecoration: t.done ? 'line-through' : 'none',
                textDecorationStyle: 'wavy', textDecorationColor: 'rgba(0,0,0,0.3)',
                textAlign: ar ? 'right' : 'left',
              }}>{text}</span>
              <button
                onClick={() => moveTomorrow(t.id)}
                style={{
                  fontFamily: handFont, fontSize: 13,
                  color: t.moved ? 'oklch(40% 0.090 150)' : 'oklch(46% 0.108 320)',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '2px 6px', flexShrink: 0,
                }}
              >{t.moved ? s.todo.moved : s.todo.moveTomorrow}</button>
            </div>
          );
        })}
      </div>

      {/* Caveat subtext */}
      <div style={{
        marginTop: 14,
        fontFamily: handFont, fontSize: 15,
        color: 'oklch(50% 0.013 50)',
        textAlign: ar ? 'right' : 'left',
        transform: 'rotate(-0.6deg)',
      }}>{ar ? 'لا تنسى رشفة قهوة بين المهام ✿' : "don't forget a sip of coffee between tasks ✿"}</div>
    </div>
  );
}

// ── REMINDER CARD ────────────────────────────────────────────
function ReminderCard({ lang, primary }) {
  const ar = lang === 'ar';
  const s = STRINGS[lang];
  const handFont = ar ? "'Kalam', cursive" : "'Caveat', cursive";

  return (
    <div style={{
      background: TOKENS.surface,
      border: `1px solid ${TOKENS.hairline}`,
      borderRadius: 12, padding: '14px 16px',
      transform: 'rotate(0.4deg)',
      boxShadow: '0 2px 6px rgba(40,30,30,0.04)',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ textAlign: ar ? 'right' : 'left' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKENS.ink[500] }}>{ar ? 'جدول' : 'schedule'}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexDirection: ar ? 'row-reverse' : 'row', justifyContent: ar ? 'flex-end' : 'flex-start' }}>
          <h3 style={{ fontFamily: ar ? "'IBM Plex Sans Arabic', sans-serif" : 'Newsreader, serif', fontWeight: 500, fontSize: 15, color: TOKENS.ink[900], marginTop: 2 }}>{s.reminder.title}</h3>
          <span style={{ fontFamily: handFont, fontSize: 14, color: 'oklch(46% 0.108 320)' }}>{s.reminder.sub}</span>
        </div>
      </div>

      {REMINDERS.map(r => {
        if (r.empty) {
          return (
            <div key={r.id} style={{
              border: '1.5px dashed oklch(84% 0.030 80)',
              borderRadius: 8,
              padding: '12px 14px',
              background: 'oklch(98% 0.014 80)',
              display: 'flex', alignItems: 'center', gap: 10,
              flexDirection: ar ? 'row-reverse' : 'row',
            }}>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5,
                letterSpacing: '0.10em', textTransform: 'uppercase',
                color: TOKENS.ink[500], minWidth: 70,
                textAlign: ar ? 'right' : 'left',
              }}>{s.reminder.tomorrow}</span>
              <span style={{ flex: 1, fontFamily: handFont, fontSize: 15, color: TOKENS.ink[500], textAlign: ar ? 'right' : 'left' }}>{s.reminder.nothing}</span>
            </div>
          );
        }
        const platColor = r.platform === 'instagram' ? TOKENS.ig : TOKENS.fb;
        return (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            flexDirection: ar ? 'row-reverse' : 'row',
            padding: '10px 12px',
            background: 'oklch(97% 0.014 320 / 0.5)',
            border: `1px solid ${TOKENS.hairline}`,
            borderRadius: 8,
          }}>
            <div style={{ minWidth: 70, textAlign: ar ? 'right' : 'left' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.ink[500] }}>{s.reminder.today}</div>
              <div style={{ fontFamily: 'Newsreader, serif', fontSize: 14, fontWeight: 500, color: TOKENS.ink[900] }}>{ar ? r.timeAr : r.time}</div>
            </div>
            {/* tiny product thumb */}
            <div style={{
              width: 30, height: 30, borderRadius: 6, flexShrink: 0,
              background: `radial-gradient(circle at 30% 30%, oklch(80% 0.090 60), oklch(70% 0.130 30))`,
              border: '1px solid rgba(0,0,0,0.06)',
            }}></div>
            <div style={{ flex: 1, textAlign: ar ? 'right' : 'left', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexDirection: ar ? 'row-reverse' : 'row' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: platColor, flexShrink: 0 }}></span>
                <span style={{ fontSize: 10, color: TOKENS.ink[500], fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.08em' }}>{r.platform}</span>
              </div>
              <div style={{
                fontFamily: ar ? "'IBM Plex Sans Arabic', sans-serif" : "'IBM Plex Sans', sans-serif",
                fontSize: 12.5, fontWeight: 500, color: TOKENS.ink[900],
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{ar ? r.titleAr : r.title}</div>
            </div>
            {r.captionReady && (
              <div style={{
                border: '1.5px dashed oklch(50% 0.090 150)',
                color: 'oklch(40% 0.090 150)',
                padding: '3px 8px', borderRadius: 999,
                fontFamily: handFont, fontSize: 13,
                background: 'oklch(96% 0.030 150 / 0.5)',
                whiteSpace: 'nowrap',
              }}>{s.reminder.captionReady}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, {
  gregorianToHijri,
  BrandMark, HashtagRadar, BestTimeStrip,
  LastPost, TodoList, ReminderCard,
});
