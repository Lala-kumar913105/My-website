const FALLBACK_PRODUCT_IMAGE = "/default-product.png";

const isHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeApiBase = (apiBaseUrl?: string): string | null => {
  if (!apiBaseUrl) return null;
  const trimmed = apiBaseUrl.trim();
  if (!trimmed) return null;
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
};

export const resolveProductImageSrc = (
  imageUrl?: string | null,
  apiBaseUrl?: string | null,
): string => {
  const raw = imageUrl?.trim();

  if (!raw) {
    return FALLBACK_PRODUCT_IMAGE;
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return isHttpUrl(raw) ? raw : FALLBACK_PRODUCT_IMAGE;
  }

  if (raw.startsWith("//") || raw.startsWith("data:") || raw.startsWith("javascript:")) {
    return FALLBACK_PRODUCT_IMAGE;
  }

  const normalizedBase = normalizeApiBase(apiBaseUrl ?? undefined);
  if (normalizedBase) {
    try {
      return new URL(raw.replace(/^\/+/, ""), normalizedBase).toString();
    } catch {
      return FALLBACK_PRODUCT_IMAGE;
    }
  }

  if (raw.startsWith("/")) {
    return raw;
  }

  return `/${raw.replace(/^\/+/, "")}`;
};

export { FALLBACK_PRODUCT_IMAGE };