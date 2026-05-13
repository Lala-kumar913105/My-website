const FALLBACK_API_BASE_URL = process.env.NODE_ENV === "development"
  ? "http://localhost:8000"
  : "https://api.zivolf.com";

const normalizeApiBaseUrl = (rawUrl: string) => {
  const trimmed = rawUrl.trim().replace(/\/$/, "");
  return trimmed.replace(/\/api\/v1\/?$/, "");
};

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const resolvedApiBaseUrl = configuredApiBaseUrl || FALLBACK_API_BASE_URL;

if (!configuredApiBaseUrl && typeof console !== "undefined") {
  console.error(`NEXT_PUBLIC_API_BASE_URL is missing. Falling back to ${FALLBACK_API_BASE_URL}`);
}

export const API_BASE_URL = normalizeApiBaseUrl(resolvedApiBaseUrl);

const LEGACY_TOKEN_KEY = "token";
const AUTH_COOKIE_NAME = "access_token";
const AUTH_STATE_CHANGED_EVENT = "auth:state-changed";
const DEBUG_AUTH = process.env.NEXT_PUBLIC_DEBUG_AUTH === "true";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  useCredentials?: boolean;
};

const AUTH_REDIRECT_KEY = "auth_redirect_after_login";

function extractErrorMessage(data: any): string {
  if (!data) return "Request failed";
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.message === "string") return data.message;
  if (Array.isArray(data.detail)) {
    const first = data.detail[0];
    if (typeof first === "string") return first;
    if (first?.msg) return String(first.msg);
  }
  return "Request failed";
}

export async function authRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const useCredentials = options.useCredentials ?? true;
  const token = getValidLegacyToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers,
    credentials: useCredentials ? "include" : "omit",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(extractErrorMessage(data));
  }

  return data as T;
}

export function persistTokenForLegacyPages(token?: string | null) {
  if (typeof window === "undefined") return;
  if (!token) return;
  const normalized = token.replace(/^Bearer\s+/i, "").trim();
  if (!normalized) return;
  localStorage.setItem(LEGACY_TOKEN_KEY, normalized);
  const exp = parseJwtExp(normalized);
  const maxAge = exp ? Math.max(0, Math.floor(exp - Date.now() / 1000)) : undefined;
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(normalized)}; Path=/; SameSite=Lax${typeof maxAge === "number" ? `; Max-Age=${maxAge}` : ""}`;
  dispatchAuthStateChanged();
}

export function clearLegacyToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  document.cookie = `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
  dispatchAuthStateChanged();
}

export function clearAuthClientData() {
  if (typeof window === "undefined") return;
  clearLegacyToken();
  localStorage.removeItem("phone_number");
  localStorage.removeItem("otp");
  localStorage.removeItem("user");
}

export function dispatchAuthStateChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
}

export function getAuthStateChangedEventName() {
  return AUTH_STATE_CHANGED_EVENT;
}

export function getAuthHeader(): HeadersInit | undefined {
  const token = getValidLegacyToken();
  if (!token) return undefined;
  return { Authorization: `Bearer ${token}` };
}

function parseJwtExp(token: string): number | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    const exp = Number(payload?.exp);
    return Number.isFinite(exp) ? exp : null;
  } catch {
    return null;
  }
}

export function getValidLegacyToken(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (!raw) return null;

  const token = raw.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    return null;
  }

  const exp = parseJwtExp(token);
  if (exp && Date.now() >= exp * 1000) {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    return null;
  }

  return token;
}

export function hasSessionHint(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(getValidLegacyToken()) || hasAuthCookieFromDocument();
}

export async function hasActiveSession(): Promise<boolean> {
  try {
    if (!hasSessionHint()) {
      return false;
    }

    const token = getValidLegacyToken();
    let response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: "include",
      cache: "no-store",
    });

    if (DEBUG_AUTH) {
      console.log("[auth] hasActiveSession first attempt", {
        hasToken: Boolean(token),
        status: response.status,
      });
    }

    if (response.status === 401 && token) {
      // Retry once with cookie-only auth to avoid stale localStorage token overriding valid cookie.
      response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        credentials: "include",
        cache: "no-store",
      });
      if (DEBUG_AUTH) {
        console.log("[auth] hasActiveSession cookie-only retry", { status: response.status });
      }
    }

    if (response.status === 401) {
      clearLegacyToken();
      return false;
    }

    return response.ok;
  } catch {
    return false;
  }
}

export function persistPostLoginRedirect(path: string) {
  if (typeof window === "undefined") return;
  if (!path || !path.startsWith("/") || path.startsWith("//")) return;
  sessionStorage.setItem(AUTH_REDIRECT_KEY, path);
}

export function buildLoginRedirectUrl(path: string) {
  const safePath = path && path.startsWith("/") && !path.startsWith("//") ? path : "/";
  return `/login?next=${encodeURIComponent(safePath)}`;
}

export function hasAuthCookieFromDocument(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((cookie) => cookie.trim().startsWith(`${AUTH_COOKIE_NAME}=`));
}

export function consumePostLoginRedirect(defaultPath: string = "/") {
  if (typeof window === "undefined") return defaultPath;
  const saved = sessionStorage.getItem(AUTH_REDIRECT_KEY);
  sessionStorage.removeItem(AUTH_REDIRECT_KEY);
  if (!saved || !saved.startsWith("/") || saved.startsWith("//")) {
    return defaultPath;
  }
  return saved;
}

export async function logoutUser() {
  try {
    await authRequest<{ message: string }>("/api/v1/auth/logout", {
      method: "POST",
      useCredentials: true,
    });
  } finally {
    clearAuthClientData();
  }
}