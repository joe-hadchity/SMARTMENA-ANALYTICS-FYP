// ── dashboard-app.jsx ───────────────────────────────────────
// Root App + layout grid + Tweaks panel.

// hooks accessed via React.* to avoid Babel top-level scope collisions

// ── TWEAKS DEFAULTS ──────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "lang": "en",
  "dark": false,
  "platform": "all",
  "period": "30D",
  "primary": "plum"
}/*EDITMODE-END*/;

function getPrimaryFromPreset(presetId) {
  const p = PRIMARY_PRESETS.find(p => p.id === presetId) || PRIMARY_PRESETS[0];
  return p.swatch;
}

// ── TWEAKS PANEL (floating bottom-right) ─────────────────────
function TweaksPanel({ open, onClose, tweaks, setTweak, primary }) {
  if (!open) return null;
  const Section = ({ title, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 14, borderBottom: `1px dashed ${TOKENS.hairline}`, marginBottom: 14 }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKENS.ink[500] }}>{title}</div>
      {children}
    </div>
  );
  const Pills = ({ value, options, onChange }) => (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          flex: 1, padding: '5px 10px',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, fontWeight: 500, letterSpacing: '0.04em',
          color: value === o.value ? '#fff' : TOKENS.ink[700],
          background: value === o.value ? primary : 'transparent',
          border: `1px solid ${value === o.value ? primary : TOKENS.hairline}`,
          borderRadius: 6, cursor: 'pointer',
        }}>{o.label}</button>
      ))}
    </div>
  );
  return (
    <div style={{
      position: 'fixed', bottom: 18, right: 18, zIndex: 10000,
      width: 280, background: TOKENS.surface,
      border: `1px solid ${TOKENS.hairline}`,
      borderRadius: 12, padding: 16,
      boxShadow: '0 12px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.04)',
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: 'Newsreader, serif', fontSize: 18, fontWeight: 500, color: TOKENS.ink[900] }}>Tweaks</div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, color: TOKENS.ink[500], padding: 2 }}>×</button>
      </div>
      <Section title="Language">
        <Pills value={tweaks.lang} onChange={v => setTweak('lang', v)} options={[{value:'en',label:'EN'},{value:'ar',label:'ع'}]} />
      </Section>
      <Section title="Appearance">
        <Pills value={tweaks.dark ? 'dark' : 'light'} onChange={v => setTweak('dark', v === 'dark')} options={[{value:'light',label:'LIGHT'},{value:'dark',label:'DARK'}]} />
      </Section>
      <Section title="Platform">
        <Pills value={tweaks.platform} onChange={v => setTweak('platform', v)} options={[{value:'all',label:'ALL'},{value:'instagram',label:'IG'},{value:'facebook',label:'FB'}]} />
      </Section>
      <Section title="Period">
        <Pills value={tweaks.period} onChange={v => setTweak('period', v)} options={[{value:'7D',label:'7D'},{value:'30D',label:'30D'},{value:'90D',label:'90D'}]} />
      </Section>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKENS.ink[500] }}>Primary Color</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {PRIMARY_PRESETS.map(p => (
            <button key={p.id} onClick={() => setTweak('primary', p.id)} title={p.label} style={{
              flex: 1, height: 44, borderRadius: 8,
              background: p.swatch,
              border: tweaks.primary === p.id ? `2.5px solid ${TOKENS.ink[900]}` : '2.5px solid transparent',
              cursor: 'pointer', position: 'relative',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <span style={{
                position: 'absolute', bottom: -16, left: 0, right: 0,
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.08em',
                color: TOKENS.ink[600],
              }}>{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── APP ──────────────────────────────────────────────────────
function App() {
  const [tweaks, setTweaks] = React.useState(TWEAK_DEFAULTS);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);
  const [active, setActive] = React.useState('overview');

  const setTweak = (k, v) => {
    setTweaks(prev => {
      const next = { ...prev, [k]: v };
      try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*'); } catch(e) {}
      return next;
    });
  };

  // Edit-mode wiring
  React.useEffect(() => {
    const onMsg = (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === '__activate_edit_mode')   setTweaksOpen(true);
      if (e.data.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', onMsg);
    try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch(e) {}
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const ar = tweaks.lang === 'ar';
  const primary = getPrimaryFromPreset(tweaks.primary);

  // Apply dir on body for RTL
  React.useEffect(() => {
    document.documentElement.setAttribute('dir', ar ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', tweaks.lang);
  }, [tweaks.lang]);

  // Dark mode: simple body bg swap (most components style-driven from light tokens)
  const bg = tweaks.dark ? 'oklch(18% 0.014 50)' : TOKENS.bg;

  return (
    <div style={{
      display: 'flex',
      flexDirection: ar ? 'row-reverse' : 'row',
      width: '100vw', height: '100vh',
      background: bg,
      color: tweaks.dark ? '#eee' : TOKENS.ink[900],
      // grid texture overlay
      backgroundImage: tweaks.dark
        ? `repeating-linear-gradient(0deg, transparent 0 24px, rgba(255,255,255,0.025) 24px 25px),
           repeating-linear-gradient(90deg, transparent 0 24px, rgba(255,255,255,0.025) 24px 25px)`
        : `repeating-linear-gradient(0deg, transparent 0 24px, rgba(50,30,30,0.04) 24px 25px),
           repeating-linear-gradient(90deg, transparent 0 24px, rgba(50,30,30,0.04) 24px 25px)`,
      backgroundAttachment: 'fixed',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Warm tint blobs in opposing corners */}
      <div style={{
        position: 'fixed', top: -120, [ar ? 'left' : 'right']: -120,
        width: 360, height: 360, borderRadius: '50%',
        background: `radial-gradient(circle, oklch(88% 0.060 320 / 0.45) 0%, transparent 70%)`,
        pointerEvents: 'none', zIndex: 0,
      }}></div>
      <div style={{
        position: 'fixed', bottom: -140, [ar ? 'right' : 'left']: -100,
        width: 320, height: 320, borderRadius: '50%',
        background: `radial-gradient(circle, oklch(92% 0.050 60 / 0.5) 0%, transparent 70%)`,
        pointerEvents: 'none', zIndex: 0,
      }}></div>

      <Sidebar active={active} onNav={setActive} lang={tweaks.lang} primary={primary} />

      <main style={{
        flex: 1, height: '100vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        position: 'relative', zIndex: 1,
      }}>
        <TopBar
          period={tweaks.period} onPeriod={v => setTweak('period', v)}
          platform={tweaks.platform} onPlatform={v => setTweak('platform', v)}
          lang={tweaks.lang} onLangToggle={() => setTweak('lang', ar ? 'en' : 'ar')}
          dark={tweaks.dark} onDarkToggle={() => setTweak('dark', !tweaks.dark)}
          primary={primary}
        />

        <div style={{
          flex: 1, padding: '20px 28px 32px',
          display: 'flex', flexDirection: 'column', gap: 14,
          maxWidth: 1480, width: '100%',
          margin: '0 auto',
        }}>
          {/* HERO */}
          <HeroBanner lang={tweaks.lang} primary={primary} />

          {/* PLATFORM STRIP */}
          <PlatformStrip lang={tweaks.lang} primary={primary} />

          {/* KPI STRIP */}
          <KPIStrip lang={tweaks.lang} primary={primary} />

          {/* ROW 1: TodoList (2/3) + right column (1/3) */}
          <div style={{
            display: 'grid', gridTemplateColumns: ar ? '1fr 2fr' : '2fr 1fr',
            gap: 14, alignItems: 'stretch',
          }}>
            {ar ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <HashtagRadar lang={tweaks.lang} primary={primary} />
                  <ReminderCard lang={tweaks.lang} primary={primary} />
                </div>
                <TodoList lang={tweaks.lang} primary={primary} />
              </>
            ) : (
              <>
                <TodoList lang={tweaks.lang} primary={primary} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <HashtagRadar lang={tweaks.lang} primary={primary} />
                  <ReminderCard lang={tweaks.lang} primary={primary} />
                </div>
              </>
            )}
          </div>

          {/* ROW 2: LastPost (1/3) + EngagementChart (2/3) */}
          <div style={{
            display: 'grid', gridTemplateColumns: ar ? '2fr 1fr' : '1fr 2fr',
            gap: 14, alignItems: 'stretch',
          }}>
            {ar ? (
              <>
                <EngagementChart period={tweaks.period} platform={tweaks.platform} lang={tweaks.lang} primary={primary} />
                <LastPost lang={tweaks.lang} primary={primary} />
              </>
            ) : (
              <>
                <LastPost lang={tweaks.lang} primary={primary} />
                <EngagementChart period={tweaks.period} platform={tweaks.platform} lang={tweaks.lang} primary={primary} />
              </>
            )}
          </div>

          {/* ROW 3: BestTime full width */}
          <BestTimeStrip lang={tweaks.lang} primary={primary} />

          {/* ROW 4: ChannelSummary full width */}
          <ChannelSummary lang={tweaks.lang} primary={primary} />
        </div>
      </main>

      <TweaksPanel
        open={tweaksOpen}
        onClose={() => { setTweaksOpen(false); try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch(e) {} }}
        tweaks={tweaks} setTweak={setTweak} primary={primary}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
