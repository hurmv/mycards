// Offline support for My Cards.
// Bump VERSION whenever you change any file, so phones pick up the update.
const VERSION = "my-cards-v2";
const CORE = ["./", "index.html", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
const CDN = [
  "https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js",
  "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js"
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(CORE);
    await Promise.all(CDN.map(u => fetch(u, { mode: "no-cors" }).then(r => c.put(u, r)).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // The app page: try the network first so updates arrive, fall back to cache offline.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => {
      const copy = r.clone(); caches.open(VERSION).then(c => c.put("index.html", copy)); return r;
    }).catch(() => caches.match("index.html")));
    return;
  }

  // Everything else (icons, libraries, fonts): cache first, then network.
  const cacheable = url.origin === location.origin ||
    /(^|\.)cdnjs\.cloudflare\.com$|cdn\.jsdelivr\.net$|fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!cacheable) return;
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return r;
  })));
});
