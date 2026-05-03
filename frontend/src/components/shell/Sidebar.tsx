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
        "h-screen sticky top-0 w-full flex flex-col overflow-hidden",
        // Dark-always sidebar using custom tokens
        "bg-[oklch(var(--sidebar-bg))] border-e border-[oklch(var(--sidebar-border))]",
      )}
      style={{
        // Force dark text colors regardless of theme
        color: "oklch(var(--sidebar-fg))",
      }}
    >
      {/* Header / brand */}
      <div className="px-4 py-4 flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-3 min-w-0"
        >
          {/* Teal logo icon */}
          <div className="h-7 w-7 shrink-0 rounded-lg bg-[oklch(52%_0.13_195)] grid place-items-center shadow-sm">
            <LineChart className="h-3.5 w-3.5 text-white" />
          </div>
          {!collapsed ? (
            <span className="text-sm font-bold tracking-tight text-[oklch(var(--sidebar-fg))]">
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
      <nav className="flex-1 overflow-y-auto px-2 pt-1 pb-4 space-y-5">
        {SECTIONS.map((section) => (
          <div key={section.titleKey}>
            {!collapsed ? (
              <div
                className="px-2.5 pb-1.5 text-[9px] uppercase tracking-widest font-bold"
                style={{ color: "oklch(var(--sidebar-fg) / 0.22)" }}
              >
                {t(section.titleKey)}
              </div>
            ) : (
              <div
                className="mx-2 my-1.5 h-px"
                style={{ backgroundColor: "oklch(var(--sidebar-fg) / 0.07)" }}
              />
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
                      "relative group flex items-center gap-2.5 rounded-lg text-sm transition-all duration-150",
                      collapsed ? "justify-center h-9 w-9 mx-auto" : "px-2.5 py-1.5",
                      active ? "font-medium" : "",
                      // Active indicator border
                      active && !collapsed
                        ? locale === "ar"
                          ? "border-r-[2.5px] border-r-[oklch(70%_0.09_195)]"
                          : "border-l-[2.5px] border-l-[oklch(70%_0.09_195)]"
                        : "",
                    )}
                    style={{
                      backgroundColor: active
                        ? "oklch(var(--sidebar-active) / 0.4)"
                        : "transparent",
                      color: active
                        ? "oklch(var(--sidebar-fg) / 0.92)"
                        : "oklch(var(--sidebar-fg) / 0.42)",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor =
                          "oklch(var(--sidebar-hover) / 0.5)";
                        e.currentTarget.style.color = "oklch(var(--sidebar-fg) / 0.72)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "oklch(var(--sidebar-fg) / 0.42)";
                      }
                    }}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed ? (
                      <>
                        <span className="truncate">{t(item.labelKey)}</span>
                        {item.shortcut ? (
                          <span
                            className="ms-auto text-[10px] tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: "oklch(var(--sidebar-fg) / 0.42)" }}
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
