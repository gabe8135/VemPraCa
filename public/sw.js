self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch (pode ser evoluído para cache offline futuramente)
self.addEventListener("fetch", () => {});
