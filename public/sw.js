const CACHE_VERSION = "v1";
const STATIC_CACHE = `portfolio-static-${CACHE_VERSION}`;
const APP_CACHE = `portfolio-app-${CACHE_VERSION}`;
const PRECACHE_URLS = ["/offline.html"];

// Install: precache offline fallback
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old versioned caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== APP_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: route requests to appropriate strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip: API routes, auth routes — always network
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  // Cache-first for immutable static assets
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image/")
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Cache-first for app shell assets (icons, manifest)
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json"
  ) {
    event.respondWith(cacheFirst(request, APP_CACHE));
    return;
  }

  // Network-first for navigation (HTML pages)
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirstNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match("/offline.html");
    return (
      cached ||
      new Response("Offline", {
        status: 503,
        headers: { "Content-Type": "text/html" },
      })
    );
  }
}
