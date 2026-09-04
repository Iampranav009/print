const CACHE = "printbuddy-pages-v1";
const STATIC = "printbuddy-static-v1";

function shouldBypass(url) {
  return (
    url.includes("/api/") ||
    url.includes("razorpay.com") ||
    url.includes("supabase.co") ||
    url.startsWith("chrome-extension")
  );
}

self.addEventListener("install", (e) => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE && k !== STATIC)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  if (shouldBypass(request.url)) return;

  // Static assets: cache-first, long-lived
  if (request.url.includes("/_next/static/")) {
    e.respondWith(
      caches.open(STATIC).then((cache) =>
        cache.match(request).then(
          (hit) =>
            hit ||
            fetch(request).then((res) => {
              cache.put(request, res.clone());
              return res;
            })
        )
      )
    );
    return;
  }

  // Pages and other assets: network-first, cache as fallback
  e.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});
