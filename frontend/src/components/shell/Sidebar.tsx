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
  LineChart,
  Megaphone,
  Plus,
  Settings,
  Swords,
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
      { href: "/calendar", labelKey: "nav.calendar", icon: CalendarDays, shortcut: "G K" },
      { href: "/campaigns", labelKey: "nav.campaigns", icon: Megaphone },
      { href: "/reports/growth", labelKey: "nav.reports", icon: LineChart, shortcut: "G R" },
      { href: "/trend-intelligence", labelKey: "nav.trendIntelligence", icon: Activity, shortcut: "G T" },
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
        "h-screen sticky top-0 w-full bg-bg-elevated/95 border-e border-border",
        "flex flex-col overflow-hidden",
      )}
    >
      {/* Header / brand */}
      <div className="px-3 py-3 flex items-center gap-2">
        <Link
          href="/"
          className="flex items-center gap-2.5 min-w-0 rounded-md px-1.5 py-1.5 hover:bg-surface-muted transition-colors"
        >
          <div className="h-8 w-8 shrink-0 rounded-md gradient-tile grid place-items-center text-white font-bold shadow-xs">
            S
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight truncate">
                SmartMENA
              </div>
              <div className="text-[10px] text-fg-subtle leading-tight tracking-wider uppercase">
                Analytics
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
                className="ms-auto p-1.5 rounded-md text-fg-muted hover:bg-surface-muted hover:text-fg transition-colors"
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
              <div className="px-2.5 pb-1.5 text-[10px] uppercase tracking-widest text-fg-subtle font-semibold">
                {t(section.titleKey)}
              </div>
            ) : (
              <div className="mx-2 my-1.5 h-px bg-border" />
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
                      "relative group flex items-center gap-2.5 rounded-md text-sm transition-colors",
                      collapsed ? "justify-center h-9 w-9 mx-auto" : "px-2.5 py-1.5",
                      active
                        ? "bg-surface-muted text-fg font-semibold shadow-[inset_0_0_0_1px_hsl(var(--border))]"
                        : "text-fg-muted hover:text-fg hover:bg-surface-muted",
                    )}
                  >
                    {active ? (
                      <span
                        className={cn(
                          "absolute top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary",
                          collapsed ? "start-0" : "-start-2",
                        )}
                      />
                    ) : null}
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed ? (
                      <>
                        <span className="truncate">{t(item.labelKey)}</span>
                        {item.shortcut ? (
                          <span className="ms-auto text-[10px] text-fg-subtle tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
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
      <div className="mt-auto px-2 pb-3 pt-2 border-t border-border">
        <UserMenu collapsed={collapsed} />
      </div>

      {collapsed ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="absolute -end-3 top-16 h-6 w-6 rounded-full border border-border bg-bg-elevated text-fg-muted hover:text-fg shadow-sm grid place-items-center"
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
      <div className="h-6 w-6 shrink-0 rounded-md gradient-tile grid place-items-center text-white text-xs font-semibold">
        {current?.name?.charAt(0).toUpperCase() || "S"}
      </div>
      {!collapsed ? (
        <div className="min-w-0 text-start flex-1">
          <div className="text-sm font-medium truncate leading-tight">
            {current?.name ?? t("common.loading")}
          </div>
          <div className="text-[10px] text-fg-subtle truncate leading-tight uppercase tracking-wider">
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
            <div className="h-5 w-5 rounded-md gradient-tile grid place-items-center text-white text-[10px] font-semibold">
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
        "w-full flex items-center gap-2.5 rounded-md px-2 py-1.5",
        "hover:bg-surface-muted transition-colors",
        collapsed && "justify-center px-0 py-2",
      )}
    >
      <div className="h-7 w-7 rounded-md border border-border bg-surface-muted text-fg-muted grid place-items-center">
        <User className="h-3.5 w-3.5" />
      </div>
      {!collapsed ? (
        <div className="min-w-0 text-start flex-1">
          <div className="text-xs font-medium leading-tight truncate">
            {t("user.demo", "Demo founder")}
          </div>
          <div className="text-[10px] text-fg-subtle leading-tight truncate">
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
