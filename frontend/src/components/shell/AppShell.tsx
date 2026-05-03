"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";

import InsightsDock from "@/components/insights/InsightsDock";
import { cn } from "@/lib/utils";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

// Routes that should render without the app chrome (sidebar + topbar + dock).
// Public share pages are served standalone so they render cleanly for guests.
const BARE_ROUTES = ["/r/"];

export default function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname() || "";

  useEffect(() => setMounted(true), []);

  if (BARE_ROUTES.some((prefix) => pathname.startsWith(prefix))) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Desktop sidebar - Claude Design dimensions: 208px expanded, 52px collapsed */}
      <div
        className={cn(
          "hidden lg:flex shrink-0 transition-[width] duration-200 ease-out-soft",
          collapsed ? "w-[52px]" : "w-52",
        )}
      >
        <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
      </div>

      {/* Mobile sidebar */}
      {mobileOpen ? (
        <div className="lg:hidden fixed inset-0 z-40 flex animate-fade-in">
          <div
            className="absolute inset-0 bg-fg/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] h-full">
            <Sidebar
              collapsed={false}
              onToggleCollapse={() => setMobileOpen(false)}
              isMobile
            />
          </div>
        </div>
      ) : null}

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onOpenMobileNav={() => setMobileOpen(true)} />
        <main
          className="flex-1 px-4 md:px-6 lg:px-8 py-6 relative"
          style={{
            background:
              mounted && resolvedTheme === "dark"
                ? `radial-gradient(ellipse at 10% 0%, oklch(30% 0.08 195 / 0.22) 0%, transparent 45%),
                   radial-gradient(ellipse at 90% 100%, oklch(28% 0.07 60 / 0.18) 0%, transparent 45%),
                   radial-gradient(ellipse at 60% 40%, oklch(20% 0.05 195 / 0.10) 0%, transparent 40%),
                   oklch(var(--bg))`
                : `radial-gradient(ellipse at 10% 0%, oklch(88% 0.07 195 / 0.6) 0%, transparent 45%),
                   radial-gradient(ellipse at 90% 100%, oklch(93% 0.05 60 / 0.55) 0%, transparent 45%),
                   radial-gradient(ellipse at 55% 50%, oklch(95% 0.03 195 / 0.3) 0%, transparent 35%),
                   url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cellipse cx='60' cy='60' rx='55' ry='30' fill='none' stroke='oklch(60%25 0.08 195 / 0.07)' stroke-width='1'/%3E%3Cellipse cx='60' cy='60' rx='42' ry='22' fill='none' stroke='oklch(60%25 0.08 195 / 0.06)' stroke-width='1'/%3E%3Cellipse cx='60' cy='60' rx='28' ry='14' fill='none' stroke='oklch(60%25 0.08 195 / 0.05)' stroke-width='1'/%3E%3Cellipse cx='60' cy='60' rx='14' ry='7' fill='none' stroke='oklch(60%25 0.08 195 / 0.04)' stroke-width='1'/%3E%3C/svg%3E"),
                   oklch(var(--bg))`,
          }}
        >
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>

      {/* Global AI insights + chat dock */}
      <InsightsDock />
    </div>
  );
}
