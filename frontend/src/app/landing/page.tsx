"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Facebook,
  Globe,
  Heart,
  Instagram,
  Languages,
  Layers,
  LineChart,
  MapPin,
  MessageSquare,
  Minus,
  PieChart,
  Quote,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  X,
  Zap,
  Zap as ZapIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <>
      <Nav />
      <main className="overflow-hidden">
        <Hero />
        <Integrations />
        <AssetShowcase />
        <Trust />
        <Features />
        <Demo />
        <Comparison />
        <Preview />
        <HowItWorks />
        <Stats />
        <Mena />
        <Testimonials />
        <Pricing />
        <Faq />
        <FinalCta />
        <Footer />
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// Reveal-on-scroll utility (pure IntersectionObserver, no deps)
// ---------------------------------------------------------------------------

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// Animated number counter — counts up when scrolled into view
function Counter({
  to,
  duration = 1500,
  suffix = "",
  prefix = "",
  decimals = 0,
}: {
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - t, 3);
            setValue(to * eased);
            if (t < 1) requestAnimationFrame(step);
            else setValue(to);
          };
          requestAnimationFrame(step);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border/60 bg-bg/80 backdrop-blur-md"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/landing" className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <span className="text-sm font-semibold tracking-tight">SmartMENA</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-fg-muted md:flex">
          <a href="#features" className="hover:text-fg">Features</a>
          <a href="#demo" className="hover:text-fg">Demo</a>
          <a href="#pricing" className="hover:text-fg">Pricing</a>
          <a href="#mena" className="hover:text-fg">MENA</a>
          <a href="#faq" className="hover:text-fg">FAQ</a>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden text-sm text-fg-muted hover:text-fg sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg hover:opacity-90"
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero() {
  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute right-1/4 top-40 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-fg-muted">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Built for the MENA market · v1.0 in beta
            </div>

            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Social analytics that{" "}
              <span className="relative inline-block">
                <span className="relative z-10">speaks Arabic</span>
                <span className="absolute inset-x-0 bottom-1 -z-0 h-3 bg-primary/20" />
              </span>
              .
            </h1>

            <p className="mt-6 text-balance text-lg leading-relaxed text-fg-muted">
              SmartMENA is the AI-powered analytics platform built for MENA SMEs.
              Real Instagram Graph data, bilingual sentiment, competitor benchmarks,
              and recommendations that understand your audience — not a generic global tool.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-fg shadow-sm transition hover:opacity-90 hover:shadow-md"
              >
                Start free trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-5 py-2.5 text-sm font-medium text-fg hover:bg-surface-hover"
              >
                Watch the demo
              </a>
            </div>

            <p className="mt-5 text-xs text-fg-subtle">
              No credit card required · 14-day free trial · Cancel anytime
            </p>
          </div>
        </Reveal>

        <Reveal delay={200} className="mt-20">
          <HeroVisual />
        </Reveal>
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="absolute -inset-6 rounded-3xl bg-gradient-to-tr from-primary/20 via-primary/5 to-transparent blur-2xl" />
      <div
        className="relative rounded-2xl border border-border bg-surface shadow-2xl shadow-primary/10"
        style={{ animation: "float 6s ease-in-out infinite" }}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <div className="rounded-md bg-surface-muted px-3 py-1 text-[10px] text-fg-subtle">
            smartmena.app/dashboard
          </div>
          <div className="h-2.5 w-12" />
        </div>

        <div className="grid grid-cols-12 gap-4 p-5">
          <MockKpi label="Followers" value="3,274" delta="+12%" colSpan={3} />
          <MockKpi label="Reach" value="110K" delta="+8%" colSpan={3} />
          <MockKpi label="Engagement" value="7.35%" delta="+1.2%" colSpan={3} />
          <MockKpi label="Sentiment" value="96% +" delta="positive" colSpan={3} />

          <div className="col-span-8 rounded-lg border border-border bg-bg p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-medium text-fg-muted">
                Engagement over time
              </span>
              <LineChart className="h-3 w-3 text-fg-subtle" />
            </div>
            <MockAreaChart />
          </div>

          <div className="col-span-4 rounded-lg border border-border bg-bg p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-medium text-fg-muted">
                Audience by city
              </span>
              <BarChart3 className="h-3 w-3 text-fg-subtle" />
            </div>
            <MockBars />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}

function MockKpi({
  label,
  value,
  delta,
  colSpan,
}: {
  label: string;
  value: string;
  delta: string;
  colSpan: number;
}) {
  return (
    <div className={`col-span-${colSpan} rounded-lg border border-border bg-bg p-3`}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-lg font-semibold tracking-tight">{value}</span>
        <span className="text-[10px] font-medium text-primary">{delta}</span>
      </div>
    </div>
  );
}

function MockAreaChart() {
  const points = [10, 28, 22, 40, 35, 55, 48, 65, 62, 78, 72, 90];
  const w = 100;
  const h = 40;
  const max = Math.max(...points);
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - (p / max) * h;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#grad)" />
      <path
        d={path}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MockBars() {
  const bars = [
    { name: "Beirut", value: 95 },
    { name: "Dubai", value: 60 },
    { name: "Riyadh", value: 45 },
    { name: "Cairo", value: 35 },
    { name: "Amman", value: 22 },
  ];
  return (
    <div className="space-y-1.5">
      {bars.map((b) => (
        <div key={b.name} className="flex items-center gap-2">
          <span className="w-12 text-[9px] text-fg-muted">{b.name}</span>
          <div className="flex-1 overflow-hidden rounded-sm bg-surface-muted">
            <div
              className="h-2 rounded-sm bg-primary/80"
              style={{ width: `${b.value}%` }}
            />
          </div>
          <span className="w-8 text-right text-[9px] font-mono text-fg-subtle">
            {b.value}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Integrations strip
// ---------------------------------------------------------------------------

function Integrations() {
  const items = [
    { icon: Instagram, name: "Instagram", note: "Graph API · live" },
    { icon: Facebook, name: "Facebook", note: "Pages · coming soon" },
    { icon: MessageSquare, name: "WhatsApp", note: "Business · roadmap" },
    { icon: Layers, name: "TikTok", note: "Q3 2026" },
  ];
  return (
    <section className="border-y border-border bg-bg py-12">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="mb-6 text-center text-xs font-medium uppercase tracking-widest text-fg-subtle">
            Connects to the platforms that matter
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {items.map((item, i) => (
              <Reveal key={item.name} delay={i * 80}>
                <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-primary/30">
                  <item.icon className="h-5 w-5 text-fg" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-tight">{item.name}</p>
                    <p className="text-[10px] text-fg-muted">{item.note}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Visual asset strip
// ---------------------------------------------------------------------------

function AssetShowcase() {
  const assets = [
    {
      src: "/landing/social-command-center.svg",
      title: "Social command center",
      copy: "Plan campaigns, monitor posts, read audience signals, and manage responses from one practical workspace.",
      label: "Management workspace",
    },
    {
      src: "/landing/mena-audience-map.svg",
      title: "MENA audience spread",
      copy: "A quick visual cue for local and diaspora markets across Lebanon, GCC, Europe, and North America.",
      label: "Audience intelligence",
    },
    {
      src: "/landing/signal-pipeline.svg",
      title: "Evidence-first signal flow",
      copy: "Meta Graph data, comments, competitors, hashtags, and trend signals flow into one decision layer.",
      label: "Product architecture",
    },
  ];

  return (
    <section className="border-b border-border bg-surface py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Product assets
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Built around real marketing decisions, not decorative dashboards.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            These visuals frame SmartMENA as a working management layer: brand posts,
            audience geography, and signal pipelines all connected to the same decision.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {assets.map((asset, index) => (
            <Reveal key={asset.title} delay={index * 90}>
              <article className="group overflow-hidden rounded-xl border border-border bg-bg transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
                <div className="border-b border-border bg-surface-muted/35 p-3">
                  <img
                    src={asset.src}
                    alt=""
                    className="h-48 w-full rounded-lg object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-5">
                  <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
                    {asset.label}
                  </span>
                  <h3 className="mt-4 text-base font-semibold tracking-tight">
                    {asset.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                    {asset.copy}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Trust strip
// ---------------------------------------------------------------------------

function Trust() {
  return (
    <section className="bg-surface-muted/30 py-14">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <Reveal>
              <div className="text-center">
                <p className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
                  <Counter to={475} suffix="+" />
                </p>
                <p className="mt-1 text-xs text-fg-muted">Real Graph posts analyzed</p>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div className="text-center">
                <p className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
                  <Counter to={7.35} decimals={2} suffix="%" />
                </p>
                <p className="mt-1 text-xs text-fg-muted">Live engagement rate</p>
              </div>
            </Reveal>
            <Reveal delay={160}>
              <div className="text-center">
                <p className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
                  <Counter to={96} suffix="% +" />
                </p>
                <p className="mt-1 text-xs text-fg-muted">Positive sentiment</p>
              </div>
            </Reveal>
            <Reveal delay={240}>
              <div className="text-center">
                <p className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
                  AR&nbsp;·&nbsp;EN
                </p>
                <p className="mt-1 text-xs text-fg-muted">Bilingual native</p>
              </div>
            </Reveal>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

function Features() {
  const features = [
    {
      icon: BarChart3,
      title: "Real-time analytics",
      copy: "Live KPIs from the Instagram Graph API — followers, reach, engagement, saves. No scraping, no estimates.",
    },
    {
      icon: Brain,
      title: "Bilingual sentiment",
      copy: "Caption + comment sentiment in Arabic and English, blended so you see what your audience actually feels.",
    },
    {
      icon: Target,
      title: "Competitor benchmarks",
      copy: "Side-by-side comparison with brands you compete with — engagement rate, posting cadence, content mix.",
    },
    {
      icon: Calendar,
      title: "Smart calendar",
      copy: "Published posts and scheduled drafts on the same grid, with engagement scores per post.",
    },
    {
      icon: Sparkles,
      title: "AI recommendations",
      copy: "Action-ready prompts: what to post, when, which hashtags work — derived from your performance data.",
    },
    {
      icon: TrendingUp,
      title: "Trend intelligence",
      copy: "Weekly hashtag momentum, MENA event calendar, and topic tracking — publish on the wave, not after it.",
    },
  ];

  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Features
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for the way MENA brands actually work.
          </h2>
          <p className="mt-4 text-fg-muted">
            Not a translated dashboard. Every feature is tuned for bilingual
            content, MENA holidays, and audiences that move between dialects.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 100}>
              <FeatureCard {...f} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  copy,
}: {
  icon: typeof BarChart3;
  title: string;
  copy: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-surface p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{copy}</p>
      <div className="pointer-events-none absolute -bottom-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Interactive Demo (tabbed)
// ---------------------------------------------------------------------------

type DemoTab = "overview" | "audience" | "competitors" | "sentiment";

function Demo() {
  const [tab, setTab] = useState<DemoTab>("overview");
  const tabs: Array<{ id: DemoTab; label: string; icon: typeof Activity }> = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "audience", label: "Audience", icon: Users },
    { id: "competitors", label: "Competitors", icon: Target },
    { id: "sentiment", label: "Sentiment", icon: Heart },
  ];

  return (
    <section id="demo" className="bg-surface-muted/30 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Live demo
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Take a look around.
          </h2>
          <p className="mt-4 text-fg-muted">
            Four core views, one platform. Click between them to see how SmartMENA surfaces
            real signal across your social presence.
          </p>
        </Reveal>

        <Reveal delay={150} className="mt-12">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
            {/* Browser chrome */}
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              </div>
              <div className="rounded-md bg-surface-muted px-3 py-1 text-[10px] text-fg-subtle">
                smartmena.app/{tab}
              </div>
              <div className="h-2.5 w-12" />
            </div>

            {/* Tab bar */}
            <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-bg/30 px-3 py-2">
              {tabs.map((t) => {
                const TabIcon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-fg shadow-sm"
                        : "text-fg-muted hover:bg-surface-muted hover:text-fg",
                    )}
                  >
                    <TabIcon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="min-h-[420px] p-6">
              {tab === "overview" ? <DemoOverview /> : null}
              {tab === "audience" ? <DemoAudience /> : null}
              {tab === "competitors" ? <DemoCompetitors /> : null}
              {tab === "sentiment" ? <DemoSentiment /> : null}
            </div>
          </div>
        </Reveal>

        <Reveal delay={250} className="mt-6 text-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Try it with your own account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function DemoOverview() {
  return (
    <div key="overview" className="grid grid-cols-12 gap-4" style={{ animation: "fadeIn 400ms ease-out" }}>
      <MockKpi label="Followers" value="3,274" delta="+12%" colSpan={3} />
      <MockKpi label="Reach" value="110,518" delta="+8%" colSpan={3} />
      <MockKpi label="Engagement" value="23,960" delta="+15%" colSpan={3} />
      <MockKpi label="Posts" value="472" delta="last 90d" colSpan={3} />

      <div className="col-span-8 rounded-lg border border-border bg-bg p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold">Engagement over time</span>
          <span className="text-[10px] text-fg-muted">Last 90 days</span>
        </div>
        <MockAreaChart />
      </div>

      <div className="col-span-4 space-y-2 rounded-lg border border-border bg-bg p-4">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Top insights
        </p>
        <DemoBullet text="Carousels drive 63 avg engagement" />
        <DemoBullet text="Peak hour: 7 PM" />
        <DemoBullet text="ER trending up +1.2%" />
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function DemoAudience() {
  const ages = [
    { range: "18-24", pct: 18 },
    { range: "25-34", pct: 26 },
    { range: "35-44", pct: 29 },
    { range: "45-54", pct: 16 },
    { range: "55+", pct: 11 },
  ];
  const cities = [
    { name: "Beirut", pct: 24 },
    { name: "Dubai", pct: 14 },
    { name: "Riyadh", pct: 9 },
    { name: "Doha", pct: 6 },
    { name: "Amman", pct: 5 },
  ];
  return (
    <div key="audience" className="grid grid-cols-12 gap-4" style={{ animation: "fadeIn 400ms ease-out" }}>
      <div className="col-span-12 grid grid-cols-3 gap-3 md:col-span-4 md:grid-cols-1">
        <MockKpi label="Followers" value="3,274" delta="+12%" colSpan={3} />
        <MockKpi label="Reach" value="110K" delta="+8%" colSpan={3} />
        <MockKpi label="ER" value="7.35%" delta="+1.2%" colSpan={3} />
      </div>

      <div className="col-span-12 rounded-lg border border-border bg-bg p-4 md:col-span-4">
        <p className="mb-3 text-xs font-semibold">Age distribution</p>
        <div className="space-y-2">
          {ages.map((a) => (
            <div key={a.range} className="flex items-center gap-2">
              <span className="w-12 text-[10px] text-fg-muted">{a.range}</span>
              <div className="flex-1 overflow-hidden rounded-sm bg-surface-muted">
                <div
                  className="h-2 rounded-sm bg-primary"
                  style={{ width: `${a.pct * 3.4}%` }}
                />
              </div>
              <span className="w-8 text-right text-[10px] font-mono text-fg-subtle">
                {a.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="col-span-12 rounded-lg border border-border bg-bg p-4 md:col-span-4">
        <p className="mb-3 text-xs font-semibold">Top cities</p>
        <div className="space-y-2">
          {cities.map((c) => (
            <div key={c.name} className="flex items-center gap-2">
              <MapPin className="h-3 w-3 text-fg-muted" />
              <span className="flex-1 text-xs">{c.name}</span>
              <span className="text-[10px] font-mono text-fg-subtle">{c.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function DemoCompetitors() {
  const competitors = [
    { name: "@yourbrand", followers: 3274, er: 7.35, posts: 12, you: true },
    { name: "@competitor_a", followers: 8421, er: 4.12, posts: 18 },
    { name: "@competitor_b", followers: 5602, er: 5.88, posts: 9 },
    { name: "@competitor_c", followers: 12104, er: 3.21, posts: 22 },
  ];
  return (
    <div key="competitors" className="space-y-3" style={{ animation: "fadeIn 400ms ease-out" }}>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead className="bg-surface-muted/50 text-fg-muted">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Account</th>
              <th className="px-3 py-2 text-right font-medium">Followers</th>
              <th className="px-3 py-2 text-right font-medium">ER</th>
              <th className="px-3 py-2 text-right font-medium">Posts / 30d</th>
              <th className="px-3 py-2 text-right font-medium">Rank</th>
            </tr>
          </thead>
          <tbody>
            {competitors
              .slice()
              .sort((a, b) => b.er - a.er)
              .map((c, i) => (
                <tr
                  key={c.name}
                  className={cn(
                    "border-t border-border",
                    c.you && "bg-primary/5 font-medium",
                  )}
                >
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-primary/60" />
                      {c.name}
                      {c.you ? (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium uppercase text-primary">
                          You
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    {c.followers.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    {c.er.toFixed(2)}%
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">{c.posts}</td>
                  <td className="px-3 py-2.5 text-right font-mono">#{i + 1}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-xs">
        <p className="flex items-center gap-2 font-medium">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          You&apos;re #1 by engagement rate — your audience is more reactive even though
          @competitor_c has 3.7× your followers.
        </p>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function DemoSentiment() {
  const samples = [
    { sentiment: "positive", text: "New product drop is live today with limited early access." },
    { sentiment: "positive", text: "Customer story: turning comments into campaign ideas." },
    { sentiment: "neutral", text: "Schedule update for this week's content calendar." },
    { sentiment: "negative", text: "Delayed response time created avoidable customer frustration." },
  ];

  return (
    <div key="sentiment" className="grid grid-cols-12 gap-4" style={{ animation: "fadeIn 400ms ease-out" }}>
      <div className="col-span-12 md:col-span-5">
        <div className="rounded-lg border border-border bg-bg p-4">
          <p className="mb-3 text-xs font-semibold">Caption sentiment</p>
          <div className="relative mx-auto h-40 w-40">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="hsl(var(--surface-muted))"
                strokeWidth="4"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#16a34a"
                strokeWidth="4"
                strokeDasharray="84 16"
                strokeDashoffset="0"
                strokeLinecap="round"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#dc2626"
                strokeWidth="4"
                strokeDasharray="4 96"
                strokeDashoffset="-84"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold tracking-tight">96%</span>
              <span className="text-[10px] uppercase tracking-wide text-fg-muted">
                Positive
              </span>
            </div>
          </div>
          <div className="mt-3 flex justify-around text-[10px]">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              Positive 84%
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-fg-subtle" />
              Neutral 12%
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-600" />
              Negative 4%
            </span>
          </div>
        </div>
      </div>

      <div className="col-span-12 md:col-span-7">
        <div className="rounded-lg border border-border bg-bg p-4">
          <p className="mb-3 text-xs font-semibold">Recent captions analyzed</p>
          <ul className="space-y-2">
            {samples.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-md border border-border/60 bg-surface px-3 py-2 text-xs"
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-2 w-2 shrink-0 rounded-full",
                    s.sentiment === "positive" && "bg-emerald-600",
                    s.sentiment === "neutral" && "bg-fg-subtle",
                    s.sentiment === "negative" && "bg-red-600",
                  )}
                />
                <span className="line-clamp-2 text-fg">{s.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function DemoBullet({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-surface-muted/50 px-2.5 py-1.5 text-[11px]">
      <span className="mt-1 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      <span>{text}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comparison table
// ---------------------------------------------------------------------------

function Comparison() {
  const rows: Array<{ label: string; smartmena: boolean; generic: boolean | "partial" }> = [
    { label: "Real Instagram Graph API data", smartmena: true, generic: true },
    { label: "Arabic-native sentiment analysis", smartmena: true, generic: false },
    { label: "MENA holiday + event calendar", smartmena: true, generic: false },
    { label: "Diaspora-aware audience mapping", smartmena: true, generic: false },
    { label: "Levantine / Khaleeji / Egyptian dialect support", smartmena: true, generic: false },
    { label: "Competitor benchmarks", smartmena: true, generic: "partial" },
    { label: "Bilingual UI (RTL ready)", smartmena: true, generic: false },
    { label: "AI recommendations grounded in your data", smartmena: true, generic: "partial" },
  ];

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            How we compare
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            SmartMENA vs generic global tools.
          </h2>
          <p className="mt-4 text-fg-muted">
            Global dashboards treat MENA as an afterthought. We treat it as the product.
          </p>
        </Reveal>

        <Reveal delay={150} className="mt-12">
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted/50 text-xs uppercase tracking-wide text-fg-muted">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Feature</th>
                  <th className="px-5 py-3 text-center font-medium text-primary">
                    SmartMENA
                  </th>
                  <th className="px-5 py-3 text-center font-medium">Generic tools</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.label}
                    className={cn(
                      "border-t border-border",
                      i % 2 === 1 && "bg-surface-muted/20",
                    )}
                  >
                    <td className="px-5 py-3.5">{row.label}</td>
                    <td className="px-5 py-3.5 text-center">
                      <CheckBadge value={row.smartmena} />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <CheckBadge value={row.generic} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CheckBadge({ value }: { value: boolean | "partial" }) {
  if (value === true) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
        <Minus className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-fg-subtle/10 text-fg-subtle">
      <X className="h-3.5 w-3.5" />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Live preview section
// ---------------------------------------------------------------------------

function Preview() {
  return (
    <section className="bg-surface-muted/30 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-widest text-primary">
              AI that works for you
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Insights, not just dashboards.
            </h2>
            <p className="mt-4 text-fg-muted">
              Every chart comes with a one-line takeaway, computed from your real numbers —
              no LLM hallucinations. We use AI where it earns its keep: sentiment, captioning,
              and recommendations grounded in your data.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                { icon: LineChart, text: "Real Meta Graph data, refreshed on demand" },
                { icon: Users, text: "Audience: gender, age, cities, countries" },
                { icon: MessageSquare, text: "Sentiment on captions + comments — AR + EN" },
                { icon: Zap, text: "Engagement-rate per post, computed live" },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <item.icon className="h-3 w-3" />
                  </span>
                  <span className="text-fg">{item.text}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>

          <Reveal delay={150}>
            <div className="relative">
              <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent blur-2xl" />
              <div className="relative space-y-3 rounded-xl border border-border bg-surface p-4 shadow-xl">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">AI insights</span>
                  <span className="ms-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    Live
                  </span>
                </div>
                <InsightLine text="29% of your audience is aged 35–44." />
                <InsightLine text="Beirut drives 24% of your audience — your strongest local market." />
                <InsightLine text="Peak engagement at 7PM — schedule key posts in the evening." />
                <InsightLine text="Carousels drive your highest engagement (63 per post)." />
                <InsightLine text="Caption tone is 96% positive — keep the upbeat voice." />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function InsightLine({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-surface-muted/50 px-3 py-2 text-xs">
      <span className="mt-0.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      <span className="text-fg">{text}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// How it works
// ---------------------------------------------------------------------------

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Connect Instagram",
      copy: "One-click authorization with the Instagram Graph API. Your data stays yours.",
    },
    {
      n: "02",
      title: "We crunch your data",
      copy: "Real metrics, real audience demographics, real sentiment — across hundreds of your posts.",
    },
    {
      n: "03",
      title: "Get clear recommendations",
      copy: "Know what to post, when, and how — bilingual prompts grounded in your actual numbers.",
    },
  ];

  return (
    <section id="how" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Up and running in minutes.
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 120}>
              <div className="relative">
                <div className="mb-4 font-mono text-xs font-semibold text-primary">
                  {s.n}
                </div>
                <h3 className="text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{s.copy}</p>
                {i < steps.length - 1 ? (
                  <div className="pointer-events-none absolute right-0 top-0 hidden h-px w-1/2 bg-gradient-to-r from-border to-transparent md:block" />
                ) : null}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Stats section (animated counters)
// ---------------------------------------------------------------------------

function Stats() {
  return (
    <section className="relative overflow-hidden bg-primary py-20 text-primary-fg sm:py-28">
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute left-1/4 top-0 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute right-1/4 bottom-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Built on real numbers.
          </h2>
          <p className="mt-4 text-primary-fg/80">
            Powered by actual Instagram Graph data, processed live, with no scraping or
            data shortcuts.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4">
          {[
            { value: 475, label: "Posts analyzed" },
            { value: 110, suffix: "K+", label: "Audience reach" },
            { value: 96, suffix: "%", label: "Positive sentiment" },
            { value: 24, suffix: "/7", label: "Live refresh" },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 100}>
              <div className="text-center">
                <p className="text-4xl font-semibold tracking-tight sm:text-5xl">
                  <Counter to={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-2 text-xs uppercase tracking-widest text-primary-fg/70">
                  {s.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// MENA-specific
// ---------------------------------------------------------------------------

function Mena() {
  return (
    <section id="mena" className="bg-primary/[0.03] py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-widest text-primary">
              MENA-native
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Designed in Beirut.{" "}
              <span className="text-fg-muted">For the region.</span>
            </h2>
            <p className="mt-4 text-fg-muted">
              Most analytics platforms treat MENA as an afterthought. We treat it as the
              product. Levantine, Khaleeji, and Egyptian dialect support. Holiday-aware
              scheduling. Diaspora-aware audience mapping.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {[
                { icon: Languages, label: "AR & EN bilingual" },
                { icon: Globe, label: "MENA event calendar" },
                { icon: Users, label: "Diaspora-aware" },
                { icon: Shield, label: "Data stays in-region" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs"
                >
                  <item.icon className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium text-fg">{item.label}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="relative">
              <div className="absolute -inset-6 rounded-2xl bg-gradient-to-tl from-primary/20 to-transparent blur-2xl" />
              <div className="relative grid grid-cols-2 gap-3" dir="rtl">
                {[
                  { ar: "أهلاً", en: "Hello" },
                  { ar: "ربحان", en: "Successful" },
                  { ar: "ترند", en: "Trending" },
                  { ar: "جمهور", en: "Audience" },
                ].map((w) => (
                  <div
                    key={w.en}
                    className="rounded-xl border border-border bg-surface p-4 transition-transform hover:-translate-y-0.5"
                  >
                    <p className="text-2xl font-semibold tracking-tight" lang="ar">
                      {w.ar}
                    </p>
                    <p className="mt-1 text-xs text-fg-muted" dir="ltr">
                      {w.en}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

function Testimonials() {
  const items = [
    {
      quote:
        "We finally know what our audience actually wants. Bilingual sentiment is the killer feature — no other tool understood our Arabic comments.",
      author: "Joe Hadchity",
      role: "Founder, MENA SME brand",
      stars: 5,
    },
    {
      quote:
        "SmartMENA is the first dashboard that doesn't make me translate everything. The MENA event calendar alone saved us hours of planning.",
      author: "Layla Rahman",
      role: "Marketing Lead, Beirut-based F&B",
      stars: 5,
    },
    {
      quote:
        "The competitor benchmarks taught us we were over-posting. Our engagement rate doubled in 30 days after we cut down on filler content.",
      author: "Omar K.",
      role: "Social Media Manager, Dubai",
      stars: 5,
    },
  ];

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Loved by MENA marketers
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            What teams are saying.
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {items.map((t, i) => (
            <Reveal key={t.author} delay={i * 120}>
              <figure className="group relative h-full rounded-xl border border-border bg-surface p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
                <Quote className="h-5 w-5 text-primary/40" />
                <blockquote className="mt-4 text-sm leading-relaxed text-fg">
                  {t.quote}
                </blockquote>
                <div className="mt-5 flex items-center gap-1">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star
                      key={j}
                      className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <figcaption className="mt-4 border-t border-border pt-4">
                  <p className="text-sm font-semibold tracking-tight">{t.author}</p>
                  <p className="text-xs text-fg-muted">{t.role}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

function Pricing() {
  const tiers: Array<{
    name: string;
    price: string;
    period?: string;
    description: string;
    features: string[];
    cta: string;
    highlighted?: boolean;
  }> = [
    {
      name: "Starter",
      price: "$0",
      period: "/month",
      description: "Get to know your audience.",
      features: [
        "1 Instagram account",
        "30-day analytics history",
        "Basic audience insights",
        "Sentiment on captions",
        "Email support",
      ],
      cta: "Start free",
    },
    {
      name: "Growth",
      price: "$49",
      period: "/month",
      description: "For SMEs scaling their social presence.",
      features: [
        "Up to 5 accounts",
        "Full analytics history",
        "AI recommendations",
        "Competitor benchmarks",
        "Bilingual sentiment + comments",
        "Smart scheduling",
        "Priority support",
      ],
      cta: "Start 14-day trial",
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For agencies and large MENA brands.",
      features: [
        "Unlimited accounts",
        "Multi-workspace",
        "Custom integrations",
        "Dedicated account manager",
        "SLA + data residency",
        "Onboarding & training",
      ],
      cta: "Talk to sales",
    },
  ];

  return (
    <section id="pricing" className="bg-surface-muted/30 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Pricing
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Simple pricing. Real value.
          </h2>
          <p className="mt-4 text-fg-muted">
            Start free. Upgrade when your social presence outgrows the basics.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {tiers.map((tier, i) => (
            <Reveal key={tier.name} delay={i * 120}>
              <div
                className={cn(
                  "relative flex h-full flex-col rounded-2xl border bg-surface p-7 transition-all",
                  tier.highlighted
                    ? "border-primary shadow-xl shadow-primary/10 lg:scale-[1.02]"
                    : "border-border hover:-translate-y-0.5 hover:border-primary/30",
                )}
              >
                {tier.highlighted ? (
                  <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-primary-fg">
                    <Sparkles className="h-3 w-3" />
                    Most popular
                  </span>
                ) : null}

                <h3 className="text-lg font-semibold tracking-tight">{tier.name}</h3>
                <p className="mt-1 text-xs text-fg-muted">{tier.description}</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight">
                    {tier.price}
                  </span>
                  {tier.period ? (
                    <span className="text-sm text-fg-muted">{tier.period}</span>
                  ) : null}
                </div>

                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-fg">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.name === "Enterprise" ? "mailto:hello@smartmena.app" : "/signup"}
                  className={cn(
                    "mt-7 inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition",
                    tier.highlighted
                      ? "bg-primary text-primary-fg hover:opacity-90"
                      : "border border-border bg-surface text-fg hover:bg-surface-hover",
                  )}
                >
                  {tier.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={400}>
          <p className="mt-10 text-center text-xs text-fg-subtle">
            All plans include AR/EN bilingual support, Instagram Graph API connection, and no setup fees.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

function Faq() {
  const items = [
    {
      q: "Do I need an Instagram Business account?",
      a: "Yes. SmartMENA uses the Instagram Graph API, which requires a Business or Creator account. Switching is free and takes about 60 seconds in the Instagram app.",
    },
    {
      q: "Is my data safe?",
      a: "All credentials are encrypted at rest. We never store your password — we use Meta's official OAuth flow. Data residency in MENA is available on Enterprise plans.",
    },
    {
      q: "Which platforms do you support?",
      a: "Instagram is fully supported today. Facebook Pages, WhatsApp Business, and TikTok are on our 2026 roadmap.",
    },
    {
      q: "How is the sentiment analysis bilingual?",
      a: "Our model is trained on Levantine, Khaleeji, and Egyptian dialect text alongside English. We blend caption + comment sentiment so you see what your audience actually feels.",
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. There's no contract, no commitment. Cancel from your settings and you keep access until the end of your billing period.",
    },
    {
      q: "Do you offer agency or multi-brand plans?",
      a: "Yes — Enterprise plans support unlimited accounts and multi-workspace management with role-based permissions.",
    },
  ];

  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <Reveal className="text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            FAQ
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Frequently asked questions.
          </h2>
        </Reveal>

        <Reveal delay={150} className="mt-12">
          <div className="divide-y divide-border rounded-xl border border-border bg-surface">
            {items.map((item, i) => {
              const isOpen = open === i;
              return (
                <div key={i}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-surface-hover"
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm font-medium tracking-tight">{item.q}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-fg-muted transition-transform duration-200",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      "grid overflow-hidden transition-all duration-300 ease-out",
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <div className="min-h-0">
                      <p className="px-6 pb-5 text-sm leading-relaxed text-fg-muted">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Final CTA
// ---------------------------------------------------------------------------

function FinalCta() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-surface to-surface p-10 text-center sm:p-16">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute left-0 bottom-0 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />

            <h2 className="relative text-3xl font-semibold tracking-tight sm:text-4xl">
              Stop guessing. Start seeing.
            </h2>
            <p className="relative mt-4 text-fg-muted">
              Free to try. No credit card. Real data within minutes of connecting Instagram.
            </p>
            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-fg shadow-sm hover:opacity-90"
              >
                Get started free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="mailto:hello@smartmena.app"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-6 py-3 text-sm font-medium text-fg hover:bg-surface-hover"
              >
                Talk to us
              </a>
            </div>

            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-fg-subtle">
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-primary" />
                14-day free trial
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-primary" />
                No credit card
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-primary" />
                Cancel anytime
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function Footer() {
  const cols: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "#features" },
        { label: "Demo", href: "#demo" },
        { label: "Pricing", href: "#pricing" },
        { label: "How it works", href: "#how" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "#" },
        { label: "Contact", href: "mailto:hello@smartmena.app" },
        { label: "Careers", href: "#" },
        { label: "Blog", href: "#" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy", href: "#" },
        { label: "Terms", href: "#" },
        { label: "Cookies", href: "#" },
        { label: "DPA", href: "#" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border pt-16 pb-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <Link href="/landing" className="flex items-center gap-2">
              <Logo className="h-6 w-6" />
              <span className="text-sm font-semibold tracking-tight">SmartMENA</span>
            </Link>
            <p className="mt-3 max-w-xs text-xs text-fg-muted">
              Social analytics that speaks Arabic. Built in Beirut for the MENA region.
            </p>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-widest text-fg">
                {col.title}
              </p>
              <ul className="mt-3 space-y-2 text-xs text-fg-muted">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="hover:text-fg">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-fg-subtle sm:flex-row">
          <p>© {new Date().getFullYear()} SmartMENA Analytics. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            Made with care in Beirut · Live data
          </p>
        </div>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Logo
// ---------------------------------------------------------------------------

function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M3 18L9 8L13 14L17 6L21 18"
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="8" r="1.5" fill="hsl(var(--primary))" />
      <circle cx="17" cy="6" r="1.5" fill="hsl(var(--primary))" />
    </svg>
  );
}
