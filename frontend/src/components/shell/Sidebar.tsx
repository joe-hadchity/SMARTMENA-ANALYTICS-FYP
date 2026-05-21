"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  Cable,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  Activity,
  FileText,
  Inbox,
  LineChart,
  LogOut,
  Megaphone,
  Plus,
  Settings,
  Sparkles,
  Swords,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/Tooltip";
import { useI18n } from "@/i18n/I18nProvider";
import { setStoredWorkspaceId, workspacesApi } from "@/lib/api";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  shortcut?: string;
};

type NavSection = {
  titleKey: string;
  items: NavItem[];
};

const SECTIONS: NavSection[] = [
  {
    titleKey: "nav.section.today",
    items: [
      { href: "/", labelKey: "nav.overview", icon: BarChart3, shortcut: "G O" },
      { href: "/calendar", labelKey: "nav.calendar", icon: CalendarDays, shortcut: "G K" },
      { href: "/inbox", labelKey: "nav.inbox", icon: Inbox, shortcut: "G I" },
    ],
  },
  {
    titleKey: "nav.section.publish",
    items: [
      { href: "/posts", labelKey: "nav.posts", icon: FileText, shortcut: "G P" },
      { href: "/campaigns", labelKey: "nav.campaigns", icon: Megaphone },
      { href: "/advisor", labelKey: "nav.advisor", icon: Sparkles },
    ],
  },
  {
    titleKey: "nav.section.analyze",
    items: [
      { href: "/reports/growth", labelKey: "nav.reports", icon: LineChart, shortcut: "G R" },
      { href: "/audience", labelKey: "nav.audience", icon: Users, shortcut: "G A" },
      { href: "/trend-intelligence", labelKey: "nav.trendIntelligence", icon: Activity, shortcut: "G T" },
      { href: "/competitors", labelKey: "nav.competitors", icon: Swords, shortcut: "G X" },
    ],
  },
  {
    titleKey: "nav.section.connect",
    items: [
      { href: "/connections", labelKey: "nav.connections", icon: Cable, shortcut: "G C" },
      { href: "/settings", labelKey: "nav.settings", icon: Settings },
    ],
  },
];

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  isMobile,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobile?: boolean;
}) {
  const pathname = usePathname();
  const { t, locale } = useI18n();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : !!pathname && pathname.startsWith(href);

  const sidebarBg = 'oklch(var(--sidebar-bg))';
  const sidebarBorder = 'oklch(var(--sidebar-border))';
  const sidebarHover = 'oklch(var(--sidebar-hover))';
  const sidebarFg = 'oklch(var(--sidebar-fg))';
  const primaryColor = 'oklch(var(--sidebar-active))'; // Plum accent

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 w-full flex flex-col overflow-hidden",
      )}
      style={{
        background: sidebarBg,
        backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 22px, oklch(60% 0.06 320 / 0.05) 22px 23px)',
        borderRight: locale === "ar" ? 'none' : `1px solid ${sidebarBorder}`,
        borderLeft: locale === "ar" ? `1px solid ${sidebarBorder}` : 'none',
        color: sidebarFg,
      }}
    >
      {/* Header / brand */}
      <div className="px-2.5 py-4 flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 min-w-0 rounded-md px-2 py-1.5 transition-colors"
          style={{
            color: 'oklch(22% 0.050 320)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = sidebarHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {/* Dashed circle with serif S */}
          <div className="relative h-[30px] w-[30px] shrink-0">
            <svg width="30" height="30" viewBox="0 0 30 30" className="block">
              <circle cx="15" cy="15" r="13" fill="none" stroke={primaryColor} strokeWidth="1.4" strokeDasharray="2.4 2.6" />
              <circle cx="15" cy="15" r="9.5" fill={primaryColor} />
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center text-white text-[14px] leading-none"
              style={{ fontFamily: 'Newsreader, serif', fontWeight: 500 }}
            >
              S
            </span>
          </div>
          {!collapsed ? (
            <div className="text-start">
              <div
                className="text-[16px] font-medium leading-none tracking-tight"
                style={{ fontFamily: locale === "ar" ? 'var(--font-arabic)' : 'Newsreader, serif', fontWeight: 500, letterSpacing: '-0.01em' }}
              >
                {locale === "ar" ? "سمارت مينا" : "SmartMENA"}
              </div>
              <div
                className="text-[8.5px] uppercase mt-[3px] tracking-widest"
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.16em', color: 'oklch(var(--sidebar-label))' }}
              >
                analytics ✦ MENA
              </div>
            </div>
          ) : null}
        </Link>
        {!collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleCollapse}
                className="ms-auto p-1.5 rounded-md transition-colors"
                style={{ color: 'oklch(var(--sidebar-label))' }}
                aria-label={isMobile ? "Close navigation" : "Collapse sidebar"}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = sidebarHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {locale === "ar" ? (
                  <ChevronsRight className="h-4 w-4" />
                ) : (
                  <ChevronsLeft className="h-4 w-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {isMobile ? t("nav.close", "Close") : t("nav.collapse", "Collapse")}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      {/* Workspace switcher */}
      <div className="px-3 pb-2">
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pt-1 pb-4 space-y-5">
        {SECTIONS.map((section) => (
          <div key={section.titleKey}>
            {!collapsed ? (
              <div
                className="px-2.5 pb-1.5 text-[9.5px] uppercase tracking-widest font-semibold"
                style={{
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.16em',
                  color: 'oklch(var(--sidebar-label))',
                }}
              >
                {t(section.titleKey)}
              </div>
            ) : (
              <div className="mx-2 my-1.5 h-px" style={{ background: sidebarBorder }} />
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const link = (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative group flex items-center gap-2.5 rounded-[7px] text-[12.5px] font-normal transition-all duration-150",
                      collapsed ? "justify-center h-9 w-9 mx-auto" : "px-2.5 py-2",
                    )}
                    style={{
                      background: active ? primaryColor : 'transparent',
                      color: active ? '#fff' : sidebarFg,
                      fontWeight: active ? 600 : 400,
                      fontFamily: locale === "ar" ? 'var(--font-arabic)' : 'var(--font-sans)',
                      letterSpacing: locale === "ar" ? 0 : '0.005em',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = sidebarHover;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <Icon className="h-4 w-4 shrink-0" style={{ color: active ? '#fff' : 'oklch(var(--sidebar-label))' }} />
                    {!collapsed ? (
                      <>
                        <span className="truncate">{t(item.labelKey)}</span>
                        {item.shortcut ? (
                          <span
                            className="ms-auto text-[10px] tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: 'oklch(var(--sidebar-label))' }}
                          >
                            {item.shortcut}
                          </span>
                        ) : null}
                      </>
                    ) : null}
                  </Link>
                );
                return collapsed ? (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{t(item.labelKey)}</TooltipContent>
                  </Tooltip>
                ) : (
                  link
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / user */}
      <div
        className="mt-auto px-2 pb-3 pt-2"
        style={{ borderTop: `1px dashed ${sidebarBorder}` }}
      >
        <UserMenu collapsed={collapsed} sidebarHover={sidebarHover} primaryColor={primaryColor} sidebarFg={sidebarFg} />
      </div>

      {collapsed ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="absolute -end-3 top-16 h-6 w-6 rounded-full border border-border bg-surface shadow-sm grid place-items-center text-fg-muted hover:text-fg transition-colors"
          aria-label="Expand sidebar"
        >
          {locale === "ar" ? (
            <ChevronsLeft className="h-3.5 w-3.5" />
          ) : (
            <ChevronsRight className="h-3.5 w-3.5" />
          )}
        </button>
      ) : null}
    </aside>
  );
}

function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const { t } = useI18n();
  const listQ = useQuery({
    queryKey: ["workspaces", "list"],
    queryFn: workspacesApi.list,
  });
  const currentQ = useQuery({
    queryKey: ["workspace", "current"],
    queryFn: workspacesApi.current,
  });

  const current = currentQ.data;
  const trigger = (
    <button
      type="button"
      className={cn(
        "w-full flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5",
        "text-sm hover:bg-surface-muted transition-colors shadow-xs",
        collapsed && "justify-center px-0 py-2",
      )}
    >
      <div
        className="h-6 w-6 shrink-0 rounded-md grid place-items-center text-white text-xs font-semibold"
        style={{ background: 'oklch(46% 0.108 320)' }}
      >
        {current?.name?.charAt(0).toUpperCase() || "S"}
      </div>
      {!collapsed ? (
        <div className="min-w-0 text-start flex-1">
          <div className="text-sm font-medium truncate leading-tight">
            {current?.name ?? t("common.loading")}
          </div>
          <div className="text-[10px] text-fg-muted truncate leading-tight uppercase tracking-wider">
            {current?.region_default ?? "MENA"}
          </div>
        </div>
      ) : null}
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent side="right">
              {current?.name ?? t("topbar.workspace")}
            </TooltipContent>
          </Tooltip>
        ) : (
          trigger
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[14rem]">
        <DropdownMenuLabel>{t("topbar.workspace")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(listQ.data ?? []).map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onSelect={() => {
              setStoredWorkspaceId(ws.id);
              if (typeof window !== "undefined") window.location.reload();
            }}
          >
            <div
              className="h-5 w-5 rounded-md grid place-items-center text-white text-[10px] font-semibold"
              style={{ background: 'oklch(46% 0.108 320)' }}
            >
              {ws.name?.charAt(0).toUpperCase() || "W"}
            </div>
            <span className="truncate">{ws.name}</span>
            {current?.id === ws.id ? (
              <span className="ms-auto text-[10px] text-fg-subtle">current</span>
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Plus className="h-4 w-4" />
            {t("settings.create")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            setStoredWorkspaceId(null);
            if (typeof window !== "undefined") window.location.reload();
          }}
        >
          <Building2 className="h-4 w-4" />
          {t("settings.clearStored")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu({ collapsed, sidebarHover, primaryColor, sidebarFg }: { collapsed: boolean; sidebarHover: string; primaryColor: string; sidebarFg: string }) {
  const { t, locale } = useI18n();
  const auth = useAuth();
  const name = auth.user?.name || (locale === "ar" ? "مستخدم سمارت مينا" : "SmartMENA User");
  const email = auth.user?.email || "";

  const trigger = (
    <button
      type="button"
      className={cn(
        "w-full flex items-center gap-2.5 rounded-[7px] px-2 py-2.5 transition-colors",
        collapsed && "justify-center px-0 py-2",
      )}
      style={{ color: sidebarFg }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = sidebarHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <div
        className="h-[30px] w-[30px] rounded-[7px] grid place-items-center text-white font-medium text-[13px] shrink-0"
        style={{
          background: primaryColor,
          fontFamily: 'Newsreader, serif',
          fontWeight: 500,
        }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      {!collapsed ? (
        <div className="min-w-0 text-start flex-1">
          <div
            className="text-[11.5px] font-semibold leading-tight truncate"
            style={{
              color: 'oklch(22% 0.050 320)',
              fontFamily: locale === "ar" ? 'var(--font-arabic)' : 'var(--font-sans)',
            }}
          >
            {name}
          </div>
          <div
            className="text-[10px] leading-tight truncate"
            style={{
              color: 'oklch(var(--sidebar-label))',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {email || "Signed in"}
          </div>
        </div>
      ) : null}
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent side="right">
              {name}
            </TooltipContent>
          </Tooltip>
        ) : (
          trigger
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel>{t("user.menu", "Account")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="h-4 w-4" />
            {t("nav.settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => auth.signOut()}
          className="text-danger focus:text-danger"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
