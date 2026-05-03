"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  ChevronRight,
  Languages,
  Menu,
  Search,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCommandPalette } from "@/components/command/CommandPaletteProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { useI18n } from "@/i18n/I18nProvider";
import { healthApi } from "@/lib/api";
import { cn } from "@/lib/utils";

import { ThemeToggle } from "./ThemeToggle";

const PATH_LABEL_KEYS: Record<string, string> = {
  "": "nav.overview",
  connections: "nav.connections",
  posts: "nav.posts",
  campaigns: "nav.campaigns",
  insights: "nav.insights",
  recommendations: "nav.recommendations",
  settings: "nav.settings",
  new: "common.new",
};

export default function Topbar({
  onOpenMobileNav,
}: {
  onOpenMobileNav?: () => void;
}) {
  const { t, locale, setLocale } = useI18n();
  const cmdk = useCommandPalette();
  const pathname = usePathname() || "/";

  const healthQ = useQuery({
    queryKey: ["health"],
    queryFn: healthApi.check,
    refetchInterval: 30_000,
    retry: 0,
  });
  const healthy = !!healthQ.data;

  const crumbs = buildBreadcrumbs(pathname, (k) => t(k));

  const isDashboard = pathname === "/";

  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-12 border-b px-3 md:px-5 flex items-center gap-3",
      )}
      style={{
        borderColor: "oklch(var(--border) / 0.6)",
        backgroundColor: "oklch(var(--bg-elevated) / 0.80)",
        backdropFilter: "blur(12px) saturate(1.5)",
        WebkitBackdropFilter: "blur(12px) saturate(1.5)",
      }}
    >
      {/* Mobile nav toggle */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onOpenMobileNav}
        className="lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Breadcrumbs - Claude Design minimal style */}
      <nav
        aria-label="Breadcrumb"
        className="hidden sm:flex items-center gap-2 text-sm min-w-0"
      >
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-2 min-w-0">
            {c.href ? (
              <Link
                href={c.href}
                className="truncate font-medium transition-colors"
                style={{
                  color: "oklch(var(--fg-muted))",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "oklch(var(--fg))";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "oklch(var(--fg-muted))";
                }}
              >
                {c.label}
              </Link>
            ) : (
              <span
                className="truncate font-semibold"
                style={{ color: "oklch(var(--fg))" }}
              >
                {c.label}
              </span>
            )}
            {i < crumbs.length - 1 ? (
              <span
                className="text-[10px] opacity-40"
                style={{ color: "oklch(var(--fg-muted))" }}
              >
                /
              </span>
            ) : null}
          </span>
        ))}
      </nav>

      {/* Period tabs - only on dashboard */}
      {isDashboard && (
        <div className="hidden md:flex items-center gap-0.5 ms-4">
          {["7D", "30D", "90D"].map((period) => (
            <button
              key={period}
              className={cn(
                "px-3 py-1 text-xs font-mono transition-all duration-150",
                "border-b-2",
                period === "30D"
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-fg-muted hover:text-fg"
              )}
            >
              {period}
            </button>
          ))}
        </div>
      )}

      <div className="ms-auto" />

      {/* Search / command palette trigger */}
      <button
        type="button"
        onClick={() => cmdk.setOpen(true)}
        className={cn(
          "hidden md:inline-flex items-center gap-2 rounded-lg border border-border bg-surface",
          "px-2.5 h-8 text-xs text-fg-subtle hover:bg-surface-muted transition-colors",
          "min-w-[200px]",
        )}
      >
        <Search className="h-3.5 w-3.5" />
        <span>{t("topbar.search", "Search or run a command")}</span>
        <span className="ms-auto flex items-center gap-1">
          <span className="kbd">⌘</span>
          <span className="kbd">K</span>
        </span>
      </button>

      {/* Environment / health */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            tone={healthy ? "success" : "danger"}
            size="sm"
            dot
            className="hidden sm:inline-flex"
          >
            {healthy
              ? t("topbar.health.ok")
              : t("topbar.health.down")}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {healthy
            ? t("topbar.health.okHint", "API reachable")
            : t("topbar.health.downHint", "Backend is unreachable. Start it at :4000.")}
        </TooltipContent>
      </Tooltip>

      {/* Locale switcher */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Language">
                <Languages className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{t("topbar.language", "Language")}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t("topbar.language", "Language")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setLocale("en")}
            className={locale === "en" ? "bg-surface-hover" : ""}
          >
            English
            {locale === "en" ? (
              <span className="ms-auto text-[10px] text-fg-subtle">current</span>
            ) : null}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setLocale("ar")}
            className={locale === "ar" ? "bg-surface-hover" : ""}
          >
            العربية
            {locale === "ar" ? (
              <span className="ms-auto text-[10px] text-fg-subtle">current</span>
            ) : null}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ThemeToggle />

      {/* Notifications (placeholder) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden sm:inline-flex"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {t("topbar.notifications", "Notifications")}
        </TooltipContent>
      </Tooltip>
    </header>
  );
}

function buildBreadcrumbs(
  pathname: string,
  t: (key: string) => string,
): { label: string; href?: string }[] {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) {
    return [{ label: t("nav.overview") }];
  }
  const crumbs: { label: string; href?: string }[] = [
    { label: "SmartMENA", href: "/" },
  ];
  let acc = "";
  parts.forEach((p, i) => {
    acc += `/${p}`;
    const isLast = i === parts.length - 1;
    const key = PATH_LABEL_KEYS[p];
    const label = key ? t(key) : decodeURIComponent(p);
    crumbs.push({ label, href: isLast ? undefined : acc });
  });
  return crumbs;
}
