const CACHE_VERSION = "v3";
const CACHE_NAME = `zivolf-static-${CACHE_VERSION}`;
const LEGACY_CACHE_PREFIXES = ["zivolf-cache-", "zivolf-static-"];
const CORE_ASSETS = ["/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          const isLegacyCache = LEGACY_CACHE_PREFIXES.some((prefix) =>
            key.startsWith(prefix)
          );
          if (key !== CACHE_NAME && isLegacyCache) {
            return caches.delete(key);
          }
          return undefined;
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;

  // Never cache API calls
  if (url.hostname === "api.zivolf.com" || url.pathname.startsWith("/api/")) {
    return;
  }

  // Never cache Next.js build files aggressively
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(fetch(req, { cache: "no-store" }));
    return;
  }

  // Only handle same-origin requests in this SW
  if (url.origin !== self.location.origin) {
    return;
  }

  // Navigation requests: network-first + offline page fallback
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((response) => response)
        .catch(() => caches.match("/offline"))
    );
    return;
  }

  // Minimal offline support: only serve explicitly precached assets.
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Zivolf Update";
  const options = {
    body: data.body || "You have new updates.",
    data: data.url || "/",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data || "/";
  event.waitUntil(self.clients.openWindow(target));
});