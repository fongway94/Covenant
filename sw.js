/* Covenant offline cache. Bump CACHE on every content release. */
const CACHE = 'covenant-v14';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './src/styles.css',
  './src/main.js',
  './src/core/state.js',
  './src/core/audio.js',
  './src/core/bus.js',
  './src/core/util.js',
  './src/core/i18n.js',
  './src/engine/scene.js',
  './src/engine/games.js',
  './src/data/chapters.js',
  './src/data/chapters-extra.js',
  './src/data/compendium.js',
  './src/data/quests.js',
  './src/data/mirror.js',
  './src/data/deeper.js',
  './src/data/portraits.js',
  './src/data/moments.js',
  './src/engine/moments.js',
  './src/engine/atmosphere.js',
  './src/data/zh-story.js',
  './src/data/zh-ui.js',
  './src/screens/home.js',
  './src/screens/world.js',
  './src/screens/camp.js',
  './src/screens/story.js',
  './src/screens/modals.js',
  './assets/fonts/covenant-symbols-a.woff2',
  './assets/fonts/covenant-symbols-b.woff2',
  './assets/icons/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png',
  './assets/icons/apple-touch-icon.png',
  './assets/art/title.jpg',
  './assets/art/map.jpg',
  './assets/art/elah.jpg',
  './assets/art/elah-field.jpg',
  './assets/art/sprites/david.webp',
  './assets/art/sprites/david-throw.webp',
  './assets/art/sprites/goliath.webp',
  './assets/art/sprites/goliath-guard.webp',
  './assets/art/sprites/goliath-stagger.webp',
  './assets/art/sprites/daniel.webp',
  './assets/art/sprites/traveller.webp',
  './assets/art/sprites/fisherman.webp',
  './assets/art/sprites/prodigal.webp',
  './assets/art/sprites/esther.webp',
  './assets/art/sprites/shepherd.webp',
  './assets/art/sprites/ruth.webp',
  './assets/art/sprites/zacchaeus.webp',
  './assets/art/sprites/lion.webp',
  './assets/art/lions.jpg',
  './assets/art/jericho.jpg',
  './assets/art/storm.jpg',
  './assets/art/prodigal.jpg',
  './assets/art/esther.jpg',
  './assets/art/camp.jpg',
  './assets/art/bush.jpg',
  './assets/art/ruth.jpg',
  './assets/art/jonah.jpg',
  './assets/art/zacchaeus.jpg',
  './assets/art/portrait-jesus.jpg',
  './assets/art/portrait-companion.jpg',
  './assets/art/portrait-hero.jpg',
  './assets/art/portrait-giant.jpg',
  './assets/art/portrait-woman.jpg',
  './assets/art/portrait-elder.jpg',
  './assets/art/portrait-radiance.jpg',
  './src/engine/visual.js',
  './src/engine/stages.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req).then((hit) => {
      const fresh = fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || fresh;
    })
  );
});
