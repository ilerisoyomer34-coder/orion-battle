/* KOMUTA — çevrimdışı önbellek */
const CACHE = 'komuta-v2';
const ASSETS = [
  './', './index.html', './manifest.json', './css/style.css', './lib/three.min.js',
  './js/core.js', './js/textures.js', './js/models.js', './js/vehmodels.js', './js/world.js', './js/nav.js',
  './js/combat.js', './js/vehicles.js', './js/player.js', './js/ai.js', './js/progression.js',
  './js/missions.js', './js/missiondefs.js', './js/ui.js', './js/main.js',
  './icons/icon-192.png', './icons/icon-512.png'
];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('komuta-') && k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then((m) => m || caches.match('./index.html')))
  );
});
