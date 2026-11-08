// MineNumbers service worker: abre rápido aunque la señal sea mala.
const V = "mn-v3";
const SHELL = ["./", "index.html", "manifest.webmanifest", "logo.png",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-192.png", "icons/maskable-512.png", "icons/favicon-48.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.hostname.endsWith("supabase.co")) return;
  if (r.mode === "navigate") {
    // Red primero, pero si tarda más de 2.5 s se abre lo guardado (y la red sigue actualizando en segundo plano).
    const net = fetch(r).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); return res; });
    const cached = () => caches.match(r).then(hit => hit || caches.match("index.html"));
    e.respondWith(new Promise(resolve => {
      let done = false;
      const t = setTimeout(() => cached().then(hit => { if (hit && !done) { done = true; resolve(hit); } }), 2500);
      net.then(res => { if (!done) { done = true; clearTimeout(t); resolve(res); } })
         .catch(() => cached().then(hit => { if (!done) { done = true; clearTimeout(t); resolve(hit || Response.error()); } }));
    }));
    e.waitUntil(net.catch(() => {}));
    return;
  }
  e.respondWith(caches.match(r).then(hit => {
    const net = fetch(r).then(res => { if (res.ok || res.type === "opaque") { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })
      .catch(() => hit);
    return hit || net;
  }));
});
