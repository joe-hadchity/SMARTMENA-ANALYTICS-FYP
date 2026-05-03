"use client";

import { Command } from "cmdk";
import {
  Activity,
  BarChart3,
  Cable,
  CalendarDays,
  FileText,
  LineChart,
  Megaphone,
  Moon,
  Search,
  Settings,
  Sun,
  SunMoon,
  Swords,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

type CmdKCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
};

const Ctx = createContext<CmdKCtx | null>(null);

export function useCommandPalette() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCommandPalette must be used inside CommandPaletteProvider");
  return v;
}

type NavCmd = { href: string; labelKey: string; icon: LucideIcon; shortcut?: string };

const NAV_COMMANDS: NavCmd[] = [
  { href: "/", labelKey: "nav.overview", icon: BarChart3, shortcut: "G O" },
  { href: "/connections", labelKey: "nav.connections", icon: Cable, shortcut: "G C" },
  { href: "/posts", labelKey: "nav.posts", icon: FileText, shortcut: "G P" },
  { href: "/calendar", labelKey: "nav.calendar", icon: CalendarDays, shortcut: "G K" },
  { href: "/campaigns", labelKey: "nav.campaigns", icon: Megaphone },
  { href: "/reports/growth", labelKey: "nav.reports", icon: LineChart, shortcut: "G R" },
  { href: "/trend-intelligence", labelKey: "nav.trendIntelligence", icon: Activity, shortcut: "G T" },
  { href: "/competitors", labelKey: "nav.competitors", icon: Swords, shortcut: "G X" },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const { setTheme } = useTheme();

  const toggle = useCallback(() => setOpen((o) => !o), []);

  // ⌘K / Ctrl+K to toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, toggle]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const ctxValue = useMemo(() => ({ open, setOpen, toggle }), [open, toggle]);

  const runThen = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };

  return (
    <Ctx.Provider value={ctxValue}>
      {children}
      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center pt-[12vh] px-4 bg-fg/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-xl border border-border bg-bg-elevated shadow-lg overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <Command
              label="Command Palette"
              shouldFilter
              className="text-fg"
              loop
            >
              <div className="flex items-center gap-2 border-b border-border px-3">
                <Search className="h-4 w-4 text-fg-subtle" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder={t("cmdk.placeholder", "Type a command or search…")}
                  className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-fg-subtle"
                />
                <span className="kbd">ESC</span>
              </div>
              <Command.List className="max-h-[60vh] overflow-y-auto p-1.5">
                <Command.Empty className="px-3 py-8 text-center text-xs text-fg-subtle">
                  {t("cmdk.empty", "No matches.")}
                </Command.Empty>

                <Command.Group
                  heading={t("cmdk.group.nav", "Go to")}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-fg-subtle"
                >
                  {NAV_COMMANDS.map((c) => {
                    const Icon = c.icon;
                    return (
                      <Command.Item
                        key={c.href}
                        value={`${t(c.labelKey)} ${c.href}`}
                        onSelect={runThen(() => router.push(c.href))}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-2 text-sm",
                          "data-[selected=true]:bg-surface-hover cursor-pointer",
                        )}
                      >
                        <Icon className="h-4 w-4 text-fg-muted" />
                        <span>{t(c.labelKey)}</span>
                        {c.shortcut ? (
                          <span className="ms-auto text-[10px] text-fg-subtle tracking-widest">
                            {c.shortcut}
                          </span>
                        ) : null}
                      </Command.Item>
                    );
                  })}
                </Command.Group>

                <Command.Group
                  heading={t("cmdk.group.actions", "Quick actions")}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-fg-subtle"
                >
                  <Command.Item
                    value="new campaign create"
                    onSelect={runThen(() => router.push("/campaigns/new"))}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-surface-hover cursor-pointer"
                  >
                    <Megaphone className="h-4 w-4 text-fg-muted" />
                    <span>{t("cmdk.action.newCampaign", "New campaign")}</span>
                  </Command.Item>
                  <Command.Item
                    value="connect meta instagram facebook"
                    onSelect={runThen(() => router.push("/connections"))}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-surface-hover cursor-pointer"
                  >
                    <Cable className="h-4 w-4 text-fg-muted" />
                    <span>{t("cmdk.action.connectMeta", "Connect Meta account")}</span>
                  </Command.Item>
                </Command.Group>

                <Command.Group
                  heading={t("cmdk.group.preferences", "Preferences")}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-fg-subtle"
                >
                  <Command.Item
                    value="theme light day"
                    onSelect={runThen(() => setTheme("light"))}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-surface-hover cursor-pointer"
                  >
                    <Sun className="h-4 w-4 text-fg-muted" />
                    <span>{t("cmdk.action.themeLight", "Light theme")}</span>
                  </Command.Item>
                  <Command.Item
                    value="theme dark night"
                    onSelect={runThen(() => setTheme("dark"))}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-surface-hover cursor-pointer"
                  >
                    <Moon className="h-4 w-4 text-fg-muted" />
                    <span>{t("cmdk.action.themeDark", "Dark theme")}</span>
                  </Command.Item>
                  <Command.Item
                    value="theme system auto"
                    onSelect={runThen(() => setTheme("system"))}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-surface-hover cursor-pointer"
                  >
                    <SunMoon className="h-4 w-4 text-fg-muted" />
                    <span>{t("cmdk.action.themeSystem", "Match system theme")}</span>
                  </Command.Item>
                  <Command.Item
                    value="language english"
                    onSelect={runThen(() => setLocale("en"))}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-surface-hover cursor-pointer"
                  >
                    <Globe className="h-4 w-4 text-fg-muted" />
                    <span>{t("cmdk.action.langEn", "Switch to English")}</span>
                    {locale === "en" ? (
                      <span className="ms-auto text-[10px] text-fg-subtle">current</span>
                    ) : null}
                  </Command.Item>
                  <Command.Item
                    value="language arabic ar عربي"
                    onSelect={runThen(() => setLocale("ar"))}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-surface-hover cursor-pointer"
                  >
                    <Globe className="h-4 w-4 text-fg-muted" />
                    <span>{t("cmdk.action.langAr", "Switch to Arabic")}</span>
                    {locale === "ar" ? (
                      <span className="ms-auto text-[10px] text-fg-subtle">current</span>
                    ) : null}
                  </Command.Item>
                </Command.Group>
              </Command.List>

              <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-[11px] text-fg-subtle">
                <span className="inline-flex items-center gap-1">
                  <span className="kbd">↑</span>
                  <span className="kbd">↓</span>
                  to navigate
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="kbd">↵</span> to select
                </span>
                <span className="ms-auto inline-flex items-center gap-1">
                  <span className="kbd">⌘</span>
                  <span className="kbd">K</span>
                </span>
              </div>
            </Command>
          </div>
        </div>
      ) : null}
    </Ctx.Provider>
  );
}
