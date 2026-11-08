/* KOMUTA — çevrimdışı önbellek
   Kod (html/js/css): önce ağ, olmazsa önbellek → güncellemeler hemen gelir.
   Modeller ve dokular (assets/): önce önbellek → ikinci açılış hızlı, çevrimdışı oynanır. */
const CACHE = 'komuta-v4';
const CORE = [
  './', './index.html', './manifest.json', './css/style.css', './lib/three.min.js', './lib/three-addons.js',
  './js/core.js', './js/pwa.js', './js/assetdata.js', './js/worlddata.js', './js/assets.js', './js/textures.js', './js/models.js', './js/glbchar.js',
  './js/vehmodels.js', './js/worldassets.js', './js/world.js', './js/nav.js', './js/combat.js', './js/vehicles.js', './js/player.js', './js/ai.js',
  './js/progression.js', './js/missions.js', './js/missiondefs.js', './js/ui.js', './js/main.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // eski sürümlerin kod önbelleğini sil, model dosyalarını yeni önbelleğe taşı (yeniden indirmemek için)
    const keys = await caches.keys(), cur = await caches.open(CACHE);
    for (const k of keys) {
      if (!k.startsWith('komuta-') || k === CACHE) continue;
      const old = await caches.open(k);
      for (const req of await old.keys()) if (req.url.includes('/assets/')) { const r = await old.match(req); if (r) await cur.put(req, r); }
      await caches.delete(k);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  if (req.url.includes('/assets/')) {
    e.respondWith(caches.match(req).then((m) => m || fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; })));
    return;
  }
  e.respondWith(
    fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; })
      .catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
  );
});
