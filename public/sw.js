const CACHE_NAME = "iron-log-shell-v1";
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/workout.html",
  "/history.html",
  "/progress.html",
  "/styles/main.css",
  "/scripts/shared.js",
  "/scripts/dashboard.js",
  "/scripts/workout.js",
  "/scripts/history.js",
  "/scripts/progress.js",
  "/manifest.webmanifest",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/index.html")))
  );
});
