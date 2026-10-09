/* FoodAtlas v2 — Service Worker
 * 策略:
 * - 导航请求(index.html): network-first,保证 HTML 永远最新(带新的 ?v= 资源地址)
 * - CSS/JS/JSON: URL 带 ?v= 版本号,版本化 cache-first;旧版本 URL 永不复用,从源站拉取
 * - 图片: cache-first(内容不变,换图时改文件名或等 SW 更新)
 * 对应架构文档 12.3 离线能力: 已缓存的菜谱/收藏/计时器/单位换算离线可用。
 */
const VERSION = 'foodatlas-v2-20261009d';
const AV = '20261009d';
const CORE = [
  './assets/css/main.css?v=' + AV,
  './assets/js/config.js?v=' + AV, './assets/js/data.js?v=' + AV, './assets/js/store.js?v=' + AV,
  './assets/js/ui.js?v=' + AV, './assets/js/search.js?v=' + AV, './assets/js/tools.js?v=' + AV,
  './assets/js/pages-home.js?v=' + AV, './assets/js/pages-content.js?v=' + AV,
  './assets/js/pages-detail.js?v=' + AV, './assets/js/pages-personal.js?v=' + AV,
  './assets/js/pages-search.js?v=' + AV, './assets/js/router.js?v=' + AV, './assets/js/app.js?v=' + AV,
  './manifest.json',
];
const DATA = [
  './data/recipes.json?v=' + AV, './data/baking.json?v=' + AV, './data/drinks.json?v=' + AV,
  './data/ingredients.json?v=' + AV, './data/substitutions.json?v=' + AV,
  './data/techniques.json?v=' + AV, './data/cultures.json?v=' + AV,
  './data/meta.json?v=' + AV,
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
  // 导航请求: 网络优先,保证拿到最新 index.html(内含最新 ?v= 资源地址)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }
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
