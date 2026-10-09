/* FoodAtlas v2 — Service Worker
 * 策略: 应用外壳与数据 cache-first(版本化); 图片 cache-first; 兜底离线页。
 * 对应架构文档 12.3 离线能力: 已缓存的菜谱/收藏/计时器/单位换算离线可用。
 */
const VERSION = 'foodatlas-v2-20261009b';
const CORE = [
  './', './index.html', './manifest.json',
  './assets/css/main.css',
  './assets/js/config.js', './assets/js/data.js', './assets/js/store.js',
  './assets/js/ui.js', './assets/js/search.js', './assets/js/tools.js',
  './assets/js/pages-home.js', './assets/js/pages-content.js',
  './assets/js/pages-detail.js', './assets/js/pages-personal.js',
  './assets/js/pages-search.js', './assets/js/router.js', './assets/js/app.js',
  './data/meta.json',
];
const DATA = [
  './data/recipes.json', './data/baking.json', './data/drinks.json',
  './data/ingredients.json', './data/substitutions.json',
  './data/techniques.json', './data/cultures.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll([...CORE, ...DATA])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
