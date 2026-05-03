"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  Cable,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Flame,
  LineChart,
  Megaphone,
  PenLine,
  Swords,
  Plus,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
    titleKey: "nav.section.monitor",
    items: [
      { href: "/", labelKey: "nav.overview", icon: BarChart3, shortcut: "G O" },
      { href: "/connections", labelKey: "nav.connections", icon: Cable, shortcut: "G C" },
      { href: "/posts", labelKey: "nav.posts", icon: FileText, shortcut: "G P" },
    ],
  },
  {
    titleKey: "nav.section.grow",
    items: [
      { href: "/compose", labelKey: "nav.compose", icon: PenLine, shortcut: "G N" },
      { href: "/calendar", labelKey: "nav.calendar", icon: CalendarDays, shortcut: "G K" },
      { href: "/campaigns", labelKey: "nav.campaigns", icon: Megaphone },
      { href: "/reports/growth", labelKey: "nav.reports", icon: LineChart, shortcut: "G R" },
      { href: "/trends", labelKey: "nav.trends", icon: Flame, shortcut: "G T" },
      { href: "/competitors", labelKey: "nav.competitors", icon: Swords, shortcut: "G X" },
    ],
  },
  {
    titleKey: "nav.section.workspace",
    items: [
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

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 w-full flex flex-col overflow-hidden relative",
      )}
      style={{
        background: "oklch(99.5% 0.004 72)",
        borderRight: locale === "ar" ? "none" : "1px solid oklch(var(--border-subtle))",
        borderLeft: locale === "ar" ? "1px solid oklch(var(--border-subtle))" : "none",
        color: "oklch(var(--fg))",
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cline x1='0' y1='20' x2='20' y2='0' stroke='oklch(70%25 0.06 195 / 0.12)' stroke-width='1'/%3E%3C/svg%3E")`,
      }}
    >
      {/* Decorative teal glow orb at top */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -40,
          [locale === "ar" ? "right" : "left"]: -30,
          width: 140,
          height: 140,
          borderRadius: "50%",
          background: "radial-gradient(circle, oklch(80% 0.08 195 / 0.35) 0%, transparent 70%)",
        }}
      />
      {/* Header / brand */}
      <div
        className={cn(
          "flex items-center gap-2 mb-0.5 relative z-10",
          collapsed ? "justify-center py-4 px-0" : "px-3 py-4",
          locale === "ar" && !collapsed ? "flex-row-reverse" : "",
        )}
      >
        <Link href="/" className="flex items-center gap-2">
          {/* Teal logo icon with gradient */}
          <div
            className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, oklch(58% 0.14 195) 0%, oklch(46% 0.12 210) 100%)",
              boxShadow: "0 3px 10px oklch(52% 0.13 195 / 0.4)",
            }}
          >
            <LineChart className="h-3.5 w-3.5 text-white" />
          </div>
          {!collapsed ? (
            <span
              className="text-sm font-bold tracking-tight"
              style={{
                color: "oklch(var(--fg))",
                letterSpacing: "-0.02em",
                fontFamily: locale === "ar" ? "var(--font-arabic)" : "var(--font-sans)",
              }}
            >
              {locale === "ar" ? "سمارت مينا" : "SmartMENA"}
            </span>
          ) : null}
        </Link>
        {!collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleCollapse}
                className="ms-auto p-1.5 rounded-md transition-colors"
                style={{
                  color: "oklch(var(--sidebar-fg) / 0.42)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "oklch(var(--sidebar-fg) / 0.72)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "oklch(var(--sidebar-fg) / 0.42)";
                }}
                aria-label={isMobile ? "Close navigation" : "Collapse sidebar"}
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
      <nav className="flex-1 overflow-y-auto px-2 pt-1 pb-4 space-y-1 relative z-10">
        {SECTIONS.map((section) => (
          <div key={section.titleKey} className="mb-1">
            {!collapsed ? (
              <div
                className="px-3 pt-2.5 pb-1 text-[9px] font-bold uppercase tracking-widest"
                style={{ color: "oklch(var(--fg-muted))" }}
              >
                {t(section.titleKey)}
              </div>
            ) : null}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const link = (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative group flex items-center rounded-lg text-xs transition-all duration-150",
                      collapsed ? "justify-center h-9 w-9 mx-auto" : "px-3 py-2",
                      active ? "font-semibold" : "font-normal",
                    )}
                    style={{
                      backgroundColor: active
                        ? "oklch(93% 0.04 195)"
                        : "transparent",
                      color: active
                        ? "oklch(46% 0.12 195)"
                        : "oklch(var(--fg-muted))",
                      boxShadow: active ? "0 1px 4px oklch(52% 0.13 195 / 0.12)" : "none",
                      gap: collapsed ? 0 : "8px",
                      justifyContent: collapsed ? "center" : (locale === "ar" ? "flex-end" : "flex-start"),
                      flexDirection: locale === "ar" && !collapsed ? "row-reverse" : "row",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = "oklch(95% 0.006 72)";
                        e.currentTarget.style.color = "oklch(var(--fg))";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "oklch(var(--fg-muted))";
                      }
                    }}
                  >
                    {/* Active indicator bar */}
                    {active && !collapsed && (
                      <div
                        className="absolute top-[20%] bottom-[20%] w-[2.5px] rounded-full"
                        style={{
                          [locale === "ar" ? "right" : "left"]: 0,
                          background: "oklch(46% 0.12 195)",
                        }}
                      />
                    )}
                    <div className="relative shrink-0">
                      <Icon
                        className="h-[17px] w-[17px]"
                        style={{ opacity: active ? 1 : 0.65 }}
                      />
                    </div>
                    {!collapsed ? (
                      <>
                        <span
                          className="flex-1 truncate leading-none"
                          style={{ textAlign: locale === "ar" ? "right" : "left" }}
                        >
                          {t(item.labelKey)}
                        </span>
                        {item.shortcut ? (
                          <span
                            className="text-[10px] tracking-widest opacity-0 group-hover:opacity-60 transition-opacity"
                            style={{ color: "oklch(var(--fg-muted))" }}
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
            {/* Divider between sections (except last) */}
            {section !== SECTIONS[SECTIONS.length - 1] && (
              <div
                className="h-px mx-2.5 my-1.5"
                style={{ background: "oklch(var(--border-subtle))" }}
              />
            )}
          </div>
        ))}
      </nav>

      {/* Footer / user */}
      <div
        className="mt-auto px-2 pb-3 pt-2 border-t"
        style={{ borderColor: "oklch(var(--sidebar-fg) / 0.07)" }}
      >
        <UserMenu collapsed={collapsed} />
      </div>

      {collapsed ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="absolute -end-3 top-16 h-6 w-6 rounded-full shadow-sm grid place-items-center transition-colors"
          style={{
            backgroundColor: "oklch(var(--sidebar-bg))",
            borderColor: "oklch(var(--sidebar-fg) / 0.12)",
            color: "oklch(var(--sidebar-fg) / 0.42)",
            border: "1px solid",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "oklch(var(--sidebar-fg) / 0.72)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "oklch(var(--sidebar-fg) / 0.42)";
          }}
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
        "w-full flex items-center gap-2 rounded-lg border text-sm transition-colors px-2 py-1.5",
        collapsed && "justify-center px-0 py-2",
      )}
      style={{
        backgroundColor: "oklch(var(--sidebar-hover) / 0.6)",
        borderColor: "oklch(var(--sidebar-fg) / 0.12)",
        color: "oklch(var(--sidebar-fg))",
      }}
    >
      <div className="h-6 w-6 shrink-0 rounded-md bg-[oklch(52%_0.13_195)] grid place-items-center text-white text-xs font-semibold">
        {current?.name?.charAt(0).toUpperCase() || "S"}
      </div>
      {!collapsed ? (
        <div className="min-w-0 text-start flex-1">
          <div
            className="text-sm font-medium truncate leading-tight"
            style={{ color: "oklch(var(--sidebar-fg) / 0.92)" }}
          >
            {current?.name ?? t("common.loading")}
          </div>
          <div
            className="text-[10px] truncate leading-tight uppercase tracking-wider"
            style={{ color: "oklch(var(--sidebar-fg) / 0.42)" }}
          >
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
            <div className="h-5 w-5 rounded-md bg-[oklch(52%_0.13_195)] grid place-items-center text-white text-[10px] font-semibold">
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

function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { t } = useI18n();
  const trigger = (
    <button
      type="button"
      className={cn(
        "w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors",
        collapsed && "justify-center px-0 py-2",
      )}
      style={{
        color: "oklch(var(--sidebar-fg))",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "oklch(var(--sidebar-hover) / 0.5)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <div className="h-7 w-7 rounded-full bg-[oklch(96%_0.015_195)] text-[oklch(52%_0.13_195)] grid place-items-center">
        <User className="h-3.5 w-3.5" />
      </div>
      {!collapsed ? (
        <div className="min-w-0 text-start flex-1">
          <div
            className="text-xs font-medium leading-tight truncate"
            style={{ color: "oklch(var(--sidebar-fg) / 0.88)" }}
          >
            {t("user.demo", "Demo founder")}
          </div>
          <div
            className="text-[10px] leading-tight truncate"
            style={{ color: "oklch(var(--sidebar-fg) / 0.42)" }}
          >
            beta access
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
              {t("user.demo", "Demo founder")}
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
        <DropdownMenuItem asChild>
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noreferrer"
          >
            <Building2 className="h-4 w-4" />
            {t("user.docs", "Docs")}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
