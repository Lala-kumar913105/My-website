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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: options.useCredentials ? "include" : "omit",
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
  localStorage.setItem("token", token);
}

export function clearLegacyToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
}

export function persistPostLoginRedirect(path: string) {
  if (typeof window === "undefined") return;
  if (!path || !path.startsWith("/") || path.startsWith("//")) return;
  sessionStorage.setItem(AUTH_REDIRECT_KEY, path);
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
    clearLegacyToken();
  }
}