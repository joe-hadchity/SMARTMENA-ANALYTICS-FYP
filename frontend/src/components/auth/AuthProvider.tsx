"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  authApi,
  clearStoredAuth,
  readAuthToken,
  setStoredWorkspaceId,
  type AuthPayload,
  type AuthUser,
  type AuthWorkspace,
} from "@/lib/api";

type AuthContextValue = {
  user: AuthUser | null;
  workspaces: AuthWorkspace[];
  activeWorkspace: AuthPayload["activeWorkspace"];
  loading: boolean;
  signIn: (input: { email: string; password: string }) => Promise<AuthPayload>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    workspaceName?: string;
    region?: string;
    locale?: "ar" | "en";
    industry?: string;
  }) => Promise<AuthPayload>;
  signOut: () => void;
  refresh: () => Promise<AuthPayload | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_ROUTES = ["/login", "/register", "/r/", "/onboarding"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = usePathname() || "/";
  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const [payload, setPayload] = useState<AuthPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const applyPayload = useCallback((next: AuthPayload) => {
    setPayload(next);
    if (next.activeWorkspace?.id) {
      setStoredWorkspaceId(next.activeWorkspace.id);
    }
  }, []);

  const refresh = useCallback(async () => {
    const token = readAuthToken();
    if (!token) {
      setPayload(null);
      setLoading(false);
      return null;
    }

    try {
      const next = await authApi.me();
      applyPayload(next);
      return next;
    } catch {
      clearStoredAuth();
      queryClient.clear();
      setPayload(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [applyPayload]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (loading) return;
    if (!payload?.user && !isPublic) {
      router.replace("/login");
    }
    if (payload?.user && (pathname === "/login" || pathname === "/register")) {
      router.replace("/");
    }
  }, [isPublic, loading, payload?.user, pathname, router]);

  const signIn = useCallback(
    async (input: { email: string; password: string }) => {
      const next = await authApi.login(input);
      applyPayload(next);
      return next;
    },
    [applyPayload],
  );

  const register = useCallback(
    async (input: {
      name: string;
      email: string;
      password: string;
      workspaceName?: string;
      region?: string;
      locale?: "ar" | "en";
      industry?: string;
    }) => {
      const next = await authApi.register(input);
      applyPayload(next);
      return next;
    },
    [applyPayload],
  );

  const signOut = useCallback(() => {
    authApi.logout();
    queryClient.clear();
    setPayload(null);
    router.replace("/login");
  }, [queryClient, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: payload?.user || null,
      workspaces: payload?.workspaces || [],
      activeWorkspace: payload?.activeWorkspace || null,
      loading,
      signIn,
      register,
      signOut,
      refresh,
    }),
    [loading, payload, refresh, register, signIn, signOut],
  );

  if (!isPublic && loading) {
    return (
      <div className="min-h-screen bg-bg text-fg flex items-center justify-center">
        <div className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-fg-muted shadow-xs">
          Loading SmartMENA...
        </div>
      </div>
    );
  }

  if (!isPublic && !payload?.user) {
    return (
      <div className="min-h-screen bg-bg text-fg flex items-center justify-center">
        <div className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-fg-muted shadow-xs">
          Redirecting to login...
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
