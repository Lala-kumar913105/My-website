const FALLBACK_API_BASE_URL = "https://api.zivolf.com";

const normalizeApiBaseUrl = (rawUrl: string) => {
  const trimmed = rawUrl.trim().replace(/\/$/, "");
  const withoutVersionSuffix = trimmed.replace(/\/api\/v1\/?$/, "");
  return withoutVersionSuffix.replace(/^http:\/\//i, "https://");
};

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const resolvedApiBaseUrl = configuredApiBaseUrl || FALLBACK_API_BASE_URL;

if (!configuredApiBaseUrl && typeof console !== "undefined") {
  console.error("NEXT_PUBLIC_API_BASE_URL is missing. Falling back to https://api.zivolf.com");
}

export const API_BASE_URL = normalizeApiBaseUrl(resolvedApiBaseUrl);

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  useCredentials?: boolean;
};

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
    throw new Error(data?.detail || data?.message || "Request failed");
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
