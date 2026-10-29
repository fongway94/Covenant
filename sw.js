/* Covenant offline cache. Bump CACHE on every content release. */
const CACHE = 'covenant-v36';
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
  './src/engine/momentart.js',
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
  './assets/art/tend.jpg',
  './assets/art/stones.jpg',
  './assets/art/window.jpg',
  './assets/art/flame.jpg',
  './assets/art/cry.jpg',
  './assets/art/carry.jpg',
  './assets/art/robe.jpg',
  './assets/art/hall.jpg',
  './assets/art/belly.jpg',
  './assets/art/branches.jpg',
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
  './src/engine/demo.js',
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

/* Two strategies, because the two kinds of file fail differently.

   Code (HTML, JS, CSS, the manifest) is fetched network-first: the whole point
   of a release is that the player gets it on the next reload, and a cache-first
   worker quietly serves the previous build — that is how a fix ships and
   nobody sees it. If the network is slow or absent, the cached copy answers
   after a short wait, so offline play still works.

   Pictures and fonts rarely change and are the bulk of the download, so they
   stay cache-first. */
const CODE = /\.(?:html|js|css|json|webmanifest)$/i;

function putFresh(req, res) {
  if (!res || !res.ok) return res;
  const copy = res.clone();
  caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/') || CODE.test(url.pathname)) {
    event.respondWith((async () => {
      const hit = await caches.match(req);
      const net = fetch(req).then((res) => putFresh(req, res)).catch(() => null);
      if (!hit) return (await net) || Response.error();
      /* cached copy answers if the network stalls, so a lift or a tunnel does
         not leave the app hanging */
      const slow = new Promise((r) => setTimeout(() => r(hit), 2500));
      return (await Promise.race([net, slow])) || hit;
    })());
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => putFresh(req, res)).catch(() => hit))
  );
});
