"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "sonner";
import { useState, type ReactNode } from "react";

import { I18nProvider } from "@/i18n/I18nProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { CommandPaletteProvider } from "@/components/command/CommandPaletteProvider";

export default function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="smartmena.theme"
      disableTransitionOnChange={false}
    >
      <QueryClientProvider client={client}>
        <I18nProvider>
          <TooltipProvider delayDuration={200}>
            <AuthProvider>
              <CommandPaletteProvider>{children}</CommandPaletteProvider>
            </AuthProvider>
          </TooltipProvider>
        </I18nProvider>
      </QueryClientProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          className:
            "!bg-bg-elevated !text-fg !border !border-border !shadow-lg",
        }}
      />
    </NextThemesProvider>
  );
}
