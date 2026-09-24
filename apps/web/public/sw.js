const CACHE = "printbuddy-pages-v2";
const STATIC = "printbuddy-static-v2";
const SHARE_DB = "printbuddy-share-target";
const SHARE_STORE = "pending";
const SHARE_KEY = "latest";
const MAX_SHARED_BYTES = 50 * 1024 * 1024;
const ACCEPTED_SHARED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

function openShareDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SHARE_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SHARE_STORE)) {
        db.createObjectStore(SHARE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveSharedFiles(payload) {
  const db = await openShareDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(SHARE_STORE, "readwrite");
    tx.objectStore(SHARE_STORE).put(payload, SHARE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

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
  const url = new URL(request.url);

  if (request.method === "POST" && url.origin === self.location.origin && url.pathname === "/share-target") {
    e.respondWith(
      (async () => {
        try {
          const formData = await request.formData();
          const files = formData
            .getAll("files")
            .filter((value) => value instanceof File && value.size > 0);
          const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
          const valid =
            files.length > 0 &&
            totalBytes <= MAX_SHARED_BYTES &&
            files.every((file) => ACCEPTED_SHARED_TYPES.has(file.type));

          if (!valid) {
            return Response.redirect(new URL("/app/print?shared_error=1", self.location.origin), 303);
          }

          await saveSharedFiles({
            files,
            title: String(formData.get("title") || ""),
            text: String(formData.get("text") || ""),
            receivedAt: Date.now(),
          });

          return Response.redirect(new URL("/app/print?shared=1", self.location.origin), 303);
        } catch {
          return Response.redirect(new URL("/app/print?shared_error=1", self.location.origin), 303);
        }
      })()
    );
    return;
  }

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
