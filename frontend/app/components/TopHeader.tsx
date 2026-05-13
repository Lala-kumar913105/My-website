"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LanguageToggle from "./LanguageToggle";
import { API_BASE_URL, getValidLegacyToken, hasAuthCookieFromDocument, logoutUser } from "../../lib/auth";
import { useAuth } from "./AuthProvider";

const CART_CHANGED_EVENT = "cart:changed";

export default function TopHeader() {
  const router = useRouter();
  const pathname = usePathname();

  const [cartCount, setCartCount] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const auth = useAuth();

  const isSearchPage = pathname === "/search";

  useEffect(() => {
    if (isSearchPage) {
      const query = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("q") : "";
      setSearchText(query || "");
    } else {
      setSearchText("");
    }
  }, [isSearchPage, pathname]);

  const fetchCartCount = useCallback(async () => {
    if (typeof window === "undefined") return;

    const token = getValidLegacyToken();
    const hasCookie = hasAuthCookieFromDocument();
    if (!token && !hasCookie) {
      setIsAuthenticated(false);
      setCartCount(0);
      return;
    }

    try {
      const meResponse = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      });

      if (!meResponse.ok) {
        if (meResponse.status === 401) {
          setIsAuthenticated(false);
        }
        setCartCount(0);
        return;
      }

      const me = await meResponse.json();
      setIsAuthenticated(Boolean(me?.id));
      if (!me?.id) {
        setCartCount(0);
        return;
      }

      const role = String(me?.role || "").toLowerCase();
      const canAccessCart = ["buyer", "both", "user"].includes(role);
      if (!canAccessCart) {
        setCartCount(0);
        return;
      }

      const cartResponse = await fetch(`${API_BASE_URL}/api/v1/carts/${me.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      });

      if (!cartResponse.ok) {
        setCartCount(0);
        return;
      }

      const cart = await cartResponse.json();
      const count = Array.isArray(cart?.items)
        ? cart.items.reduce((sum: number, item: { quantity?: number }) => sum + (item.quantity || 0), 0)
        : 0;
      setCartCount(count);
    } catch {
      setIsAuthenticated(false);
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    setHydrated(true);
    void fetchCartCount();

    const onCartChanged = () => {
      void fetchCartCount();
    };

    const onWindowFocus = () => {
      void fetchCartCount();
    };

    window.addEventListener(CART_CHANGED_EVENT, onCartChanged);
    window.addEventListener("focus", onWindowFocus);

    return () => {
      window.removeEventListener(CART_CHANGED_EVENT, onCartChanged);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [fetchCartCount]);

  useEffect(() => {
    if (!auth.hydrated) return;
    setIsAuthenticated(auth.isAuthenticated);
  }, [auth.hydrated, auth.isAuthenticated]);

  const badgeText = useMemo(() => (cartCount > 99 ? "99+" : String(cartCount)), [cartCount]);

  const submitSearch = () => {
    const trimmed = searchText.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await logoutUser();
    } catch {
      // local token is still cleared in logoutUser finally block
    } finally {
      setCartCount(0);
      setIsAuthenticated(false);
      setMobileMenuOpen(false);
      void auth.refreshAuth();
      router.push('/');
      setLogoutLoading(false);
    }
  };

  return (
    <header className="relative z-40 border-b border-slate-200 bg-white/95 backdrop-blur pointer-events-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white">
            Z
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-900 sm:text-lg">Zivolf</p>
            <p className="truncate text-xs text-slate-500">Products • Services • Marketplace</p>
          </div>
        </Link>

        <div className="order-3 w-full sm:order-none sm:flex-1">
          <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
            <span className="text-slate-400">🔍</span>
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitSearch();
              }}
              placeholder="Search"
              className="w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <LanguageToggle />
          {hydrated && isAuthenticated ? (
            <Link
              href="/profile"
              className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 sm:inline-flex"
            >
              Profile
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 sm:inline-flex"
            >
              Login
            </Link>
          )}
          {hydrated && isAuthenticated && (
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutLoading}
              className="hidden rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 disabled:opacity-70 sm:inline-flex"
            >
              {logoutLoading ? 'Logging out...' : 'Logout'}
            </button>
          )}
          {hydrated && !isAuthenticated && (
            <Link
              href="/register"
              className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 sm:inline-flex"
            >
              Register
            </Link>
          )}
          <button
            type="button"
            aria-label="Cart"
            onClick={() => router.push("/cart")}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-lg text-slate-700 transition hover:border-slate-300"
          >
            🛒
            {cartCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-rose-600 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-white">
                {badgeText}
              </span>
            )}
          </button>
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-lg text-slate-700 sm:hidden"
          >
            ☰
          </button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-2">
            {hydrated && isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push('/profile');
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-left text-sm font-medium text-slate-700"
                >
                  Profile
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={logoutLoading}
                  className="rounded-xl border border-rose-200 px-4 py-2 text-left text-sm font-medium text-rose-700 disabled:opacity-70"
                >
                  {logoutLoading ? 'Logging out...' : 'Logout'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push('/login');
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-left text-sm font-medium text-slate-700"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push('/register');
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-left text-sm font-medium text-slate-700"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
