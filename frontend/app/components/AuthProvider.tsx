"use client";

import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE_URL, getAuthStateChangedEventName, getValidLegacyToken, hasActiveSession } from "../../lib/auth";

type AuthContextValue = {
  hydrated: boolean;
  isAuthenticated: boolean;
  token: string | null;
  refreshAuth: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue>({
  hydrated: false,
  isAuthenticated: false,
  token: null,
  refreshAuth: async () => false,
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [hydrated, setHydrated] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const refreshAuth = useCallback(async () => {
    const currentToken = getValidLegacyToken();
    setToken(currentToken);

    if (currentToken) {
      setIsAuthenticated(true);
      return true;
    }

    const active = await hasActiveSession();
    setIsAuthenticated(active);

    if (active) {
      try {
        const meRes = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!meRes.ok) return active;
        const data = await meRes.json();
        if (data?.access_token && typeof data.access_token === "string") {
          setToken(data.access_token);
        }
      } catch {
        // no-op
      }
    }

    return active;
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      await refreshAuth();
      if (mounted) setHydrated(true);
    };
    void init();

    const sync = () => {
      void refreshAuth();
    };

    const eventName = getAuthStateChangedEventName();
    window.addEventListener(eventName, sync);
    window.addEventListener("focus", sync);
    return () => {
      mounted = false;
      window.removeEventListener(eventName, sync);
      window.removeEventListener("focus", sync);
    };
  }, [refreshAuth]);

  const value = useMemo(
    () => ({ hydrated, isAuthenticated, token, refreshAuth }),
    [hydrated, isAuthenticated, token, refreshAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
