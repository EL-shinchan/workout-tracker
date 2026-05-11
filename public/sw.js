const CACHE_NAME = "iron-log-shell-v5";
const SHELL_ASSETS = [
  "/",
  "/login.html",
  "/index.html",
  "/workout.html",
  "/history.html",
  "/progress.html",
  "/imports.html",
  "/chat.html",
  "/config.html",
  "/styles/main.css",
  "/scripts/shared.js",
  "/scripts/login.js",
  "/scripts/dashboard.js",
  "/scripts/workout.js",
  "/scripts/history.js",
  "/scripts/progress.js",
  "/scripts/imports.js",
  "/scripts/chat.js",
  "/scripts/config.js",
  "/scripts/pwa.js",
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

  if (requestUrl.pathname === "/users.html") {
    event.respondWith(Response.redirect("/config.html", 302));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.status === 404) {
          return caches.match("/index.html");
        }
        return response;
      }).catch(() => caches.match("/index.html"))
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/index.html")))
  );
});
