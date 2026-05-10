const CACHE_NAME = "neoform-pigments-app-v1";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-icon-192.png",
  "/icons/maskable-icon-512.png",
  "/icons/icon.svg",
  "/icons/maskable-icon.svg",
  "/fonts/archivo-black.ttf",
  "/fonts/ibm-plex-mono-700.ttf",
  "/fonts/libre-baskerville-700.ttf",
  "/fonts/permanent-marker.ttf",
  "/fonts/space-grotesk-700.ttf",
  "/cursors/finger-idle.png",
  "/cursors/finger-press.png",
  "/cursors/finger-drag.png",
  "/cursors/finger-release.png",
  "/cursors/finger-burst.png",
  "/cursors/tattoo-machine.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/"));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    return (await cache.match(request)) ?? (await cache.match(fallbackUrl));
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    refreshCache(cache, request);
    return cachedResponse;
  }

  const response = await fetch(request);

  if (response.ok) {
    cache.put(request, response.clone());
  }

  return response;
}

function refreshCache(cache, request) {
  fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response);
      }
    })
    .catch(() => {
      // Offline is expected for a local-first editor.
    });
}
