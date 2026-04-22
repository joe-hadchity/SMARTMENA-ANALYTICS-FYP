"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

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
  const pathname = usePathname() || "";

  if (BARE_ROUTES.some((prefix) => pathname.startsWith(prefix))) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Desktop sidebar */}
      <div
        className={cn(
          "hidden lg:flex shrink-0 transition-[width] duration-200 ease-out-soft",
          collapsed ? "w-[72px]" : "w-64",
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
        <main className="flex-1 px-4 md:px-6 lg:px-8 py-6">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>

      {/* Global AI insights + chat dock */}
      <InsightsDock />
    </div>
  );
}
