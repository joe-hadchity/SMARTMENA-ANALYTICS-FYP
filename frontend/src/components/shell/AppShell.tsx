"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import DecisionBriefPanel from "@/components/decision/DecisionBriefPanel";
import LiveSignalsRibbon from "@/components/signals/LiveSignalsRibbon";
import {
  LIVE_SIGNALS_CHANGED_EVENT,
  readLiveSignalsEnabled,
} from "@/lib/uiPreferences";
import { cn } from "@/lib/utils";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const BARE_ROUTES = [
  "/login",
  "/register",
  "/r/",
  "/onboarding",
  "/landing",
  "/workspaces/new",
];

export default function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [briefCollapsed, setBriefCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [liveSignalsEnabled, setLiveSignalsEnabled] = useState(true);
  const pathname = usePathname() || "";
  const isBareRoute = BARE_ROUTES.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    const syncPreference = () => setLiveSignalsEnabled(readLiveSignalsEnabled());

    syncPreference();
    window.addEventListener("storage", syncPreference);
    window.addEventListener(LIVE_SIGNALS_CHANGED_EVENT, syncPreference);

    return () => {
      window.removeEventListener("storage", syncPreference);
      window.removeEventListener(LIVE_SIGNALS_CHANGED_EVENT, syncPreference);
    };
  }, []);

  if (isBareRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-bg">
      <div
        className={cn(
          "hidden lg:flex shrink-0 transition-[width] duration-200 ease-out-soft",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
      </div>

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
          className={cn(
            "flex-1 px-4 py-6 md:px-6 lg:px-8",
            liveSignalsEnabled ? "pb-24" : "pb-8",
          )}
        >
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>

      <div
        className={cn(
          "hidden shrink-0 transition-[width] duration-200 ease-out-soft xl:flex",
          briefCollapsed ? "w-[72px]" : "w-[344px]",
        )}
      >
        <DecisionBriefPanel
          collapsed={briefCollapsed}
          onToggleCollapse={() => setBriefCollapsed((value) => !value)}
        />
      </div>

      {liveSignalsEnabled ? (
        <LiveSignalsRibbon collapsed={collapsed} rightCollapsed={briefCollapsed} />
      ) : null}
    </div>
  );
}
