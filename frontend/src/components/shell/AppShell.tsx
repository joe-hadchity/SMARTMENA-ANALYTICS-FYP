"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

import Sidebar from "./Sidebar";

const BARE_ROUTES = ["/login", "/register", "/r/", "/onboarding"];
const FULL_SCREEN_ROUTES = ["/advisor"];

export default function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname() || "";
  const isBareRoute = BARE_ROUTES.some((prefix) => pathname.startsWith(prefix));
  const isFullScreenRoute = FULL_SCREEN_ROUTES.some((prefix) => pathname.startsWith(prefix));

  if (isBareRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex relative" style={{ background: 'oklch(var(--bg))' }}>
      {/* Warm tint blobs in opposing corners */}
      <div
        className="fixed pointer-events-none z-0"
        style={{
          top: -120,
          right: -120,
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: `radial-gradient(circle, oklch(88% 0.060 320 / 0.45) 0%, transparent 70%)`,
        }}
      />
      <div
        className="fixed pointer-events-none z-0"
        style={{
          bottom: -140,
          left: -100,
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: `radial-gradient(circle, oklch(92% 0.050 60 / 0.5) 0%, transparent 70%)`,
        }}
      />

      {/* Grid texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent 0 24px, rgba(50,30,30,0.04) 24px 25px),
                           repeating-linear-gradient(90deg, transparent 0 24px, rgba(50,30,30,0.04) 24px 25px)`,
          backgroundAttachment: 'fixed',
        }}
      />

      <div
        className={cn(
          "hidden lg:flex shrink-0 transition-[width] duration-200 ease-out-soft relative z-10",
          collapsed ? "w-[52px]" : "w-52",
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

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Mobile menu button - only visible on mobile */}
        <div className="lg:hidden sticky top-0 z-30 px-4 py-3 flex items-center backdrop-blur-sm" style={{ background: 'oklch(var(--bg) / 0.8)' }}>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <main className={cn(
          "flex-1",
          !isFullScreenRoute && "px-4 md:px-6 lg:px-8 py-6 pb-8"
        )}>
          {isFullScreenRoute ? (
            children
          ) : (
            <div className="mx-auto max-w-[1400px]">{children}</div>
          )}
        </main>
      </div>
    </div>
  );
}
