/* FoodAtlas v2 — Service Worker
 * 策略:
 * - 导航请求(index.html): network-first,保证 HTML 永远最新(带新的 ?v= 资源地址)
 * - CSS/JS/JSON: URL 带 ?v= 版本号,版本化 cache-first;旧版本 URL 永不复用,从源站拉取
 * - 图片: cache-first,使用独立缓存 IMG_CACHE,应用版本更新时不清空
 * 对应架构文档 12.3 离线能力: 已缓存的菜谱/收藏/计时器/单位换算离线可用。
 */
const VERSION = 'foodatlas-v2-20261022e';
const AV = '20261022e';
// 图片独立缓存：不随应用版本变化而删除，应用更新时保留离线图片
const IMG_CACHE = 'foodatlas-images-v2';
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
  // 删除旧应用缓存，但保留图片缓存（IMG_CACHE）
  // 图片缓存独立管理，应用版本更新不清空离线图片
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== IMG_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// 旧菜谱图路径映射（.jpg/.jpeg/.png -> .webp），fetch 处理与 CACHE_IMAGES 下载共用。
// 背景：旧版页面内存中的菜谱数据仍持有 .jpg/.png 路径，而新版菜谱图已统一为 .webp；
// SW 更新后旧页面不刷新时，详情图请求与“下载全部图片”都会请求旧路径导致 404。
// 映射范围经全量数据核对，仅覆盖菜谱图：assets/img/full/img0001-0008 与
// assets/img/recipes/r*（含各自 thumb/ 缩略图）；烘焙/饮品/食材等路径不匹配、零影响。
function mapLegacyImageUrl(u) {
  return u
    .replace(/\/(assets\/img\/(?:thumb\/)?(?:full\/img000[1-8]|recipes\/r\d+))\.(?:jpg|jpeg|png)$/, '/$1.webp')
    .replace(/^(assets\/img\/(?:thumb\/)?(?:full\/img000[1-8]|recipes\/r\d+))\.(?:jpg|jpeg|png)$/, '$1.webp');
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // 导航请求: 网络优先,保证拿到最新 index.html(内含最新 ?v= 资源地址)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(res => {
        // 仅缓存成功的 HTML 响应，避免缓存错误页面
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put('./index.html', copy)).catch(() => {});
        }
        return res;
      }).catch(async () => {
        // 离线回退：返回缓存的 HTML
        const cached = await caches.match('./index.html') || await caches.match('./');
        if (cached) return cached;
        // 缓存中也没有，返回 503 错误响应（绝不返回 undefined）
        return new Response('FoodAtlas 离线：请检查网络连接后重试', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
    );
    return;
  }
  // 非导航请求: cache-first
  // 图片使用独立缓存 IMG_CACHE，其他资源使用应用缓存 VERSION
  // 旧页面兼容：在图片加载边界把旧菜谱图路径映射到新 WebP 路径，
  // 缓存按新路径存取，与新页面共用（映射规则见 mapLegacyImageUrl）。
  const mappedPath = mapLegacyImageUrl(url.pathname);
  let req = e.request;
  if (mappedPath !== url.pathname) {
    const mapped = new URL(e.request.url);
    mapped.pathname = mappedPath;
    req = new Request(mapped.href);
  }
  const isImage = mappedPath !== url.pathname || url.pathname.startsWith('/assets/img/') || url.pathname.includes('/thumb/');
  const cacheName = isImage ? IMG_CACHE : VERSION;
  e.respondWith(
    caches.match(req, { cacheName }).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        // 仅缓存成功的响应，避免缓存 404/500 错误页面
        if (res.ok) {
          const copy = res.clone();
          // 缓存写入失败不影响已成功取得的网络响应
          caches.open(cacheName).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(err => {
        // 非导航请求失败时，让错误传播，由调用方处理
        // 绝不返回 index.html（否则 JSON 会解析失败、图片会显示 HTML）
        throw err;
      });
    })
  );
});

// 批量缓存图片：页面通过 postMessage 发送图片 URL 列表，SW 逐个缓存并回传进度
// 用于“下载全部菜谱图片”功能，支持断点续传（跳过已缓存）、失败重试
// 防止重复下载：如果已有下载任务在运行，拒绝新的请求
// 注意：downloadInProgress 是内存变量，SW 终止重启后重置为 false。
// 这是预期的恢复行为：SW 终止后旧任务中断，新 SW 实例可接受新的下载请求，
// 通过 cache.match() 跳过已缓存图片实现断点续传。
let downloadInProgress = false;
self.addEventListener('message', e => {
  const data = e.data;
  if (!data || data.type !== 'CACHE_IMAGES') return;
  // 防止重复点击导致并发下载（竞争条件）
  if (downloadInProgress) {
    const client = e.source;
    if (client) {
      client.postMessage({ type: 'CACHE_BUSY', message: '下载任务已在进行中' });
    }
    return;
  }
  downloadInProgress = true;
  // 旧页面兼容：旧版页面发来的 URL 列表可能仍含 .jpg/.png 菜谱图路径；
  // SW 内部 fetch 不经过 fetch 事件，需在此同样映射到新 WebP 路径后再缓存。
  const urls = (data.urls || []).map(mapLegacyImageUrl);
  const clientId = e.source ? e.source.id : null;
  // 关键：使用 e.waitUntil() 保持 SW 存活，直到下载完成
  // 否则浏览器可能在 message 处理返回后终止 SW，导致下载中断
  // 注意：waitUntil 不能保证 SW 在页面关闭后必然继续运行，
  // 浏览器仍可能因资源压力终止 SW。已缓存图片保留，下次下载跳过已缓存部分。
  const downloadPromise = (async () => {
    try {
      const cache = await caches.open(IMG_CACHE);
      let success = 0, failed = 0;
      const failedUrls = [];
      // 逐个处理，避免并发过高导致网络拥塞
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        try {
          // 检查是否已缓存（断点续传）
          const cached = await cache.match(url);
          if (cached) {
            success++;
          } else {
            const res = await fetch(url);
            if (res.ok) {
              // 仅在成功写入缓存后才计为成功
              await cache.put(url, res);
              // 验证写入成功（防止配额不足等静默失败）
              const verify = await cache.match(url);
              if (verify) {
                success++;
              } else {
                failed++;
                failedUrls.push(url);
              }
            } else {
              failed++;
              failedUrls.push(url);
            }
          }
        } catch (err) {
          failed++;
          failedUrls.push(url);
        }
        // 每 10 张或最后一张发送一次进度
        if ((i + 1) % 10 === 0 || i === urls.length - 1) {
          const client = clientId ? await clients.get(clientId) : null;
          if (client) {
            client.postMessage({
              type: 'CACHE_PROGRESS',
              total: urls.length,
              done: i + 1,
              success,
              failed,
            });
          }
        }
      }
      // 最终验证：对照完整清单检查缓存完整性
      let verified = 0;
      const missing = [];
      for (const url of urls) {
        const hit = await cache.match(url);
        if (hit) verified++;
        else missing.push(url);
      }
      // 发送完成消息，包含实际验证结果
      const client = clientId ? await clients.get(clientId) : null;
      if (client) {
        client.postMessage({
          type: 'CACHE_COMPLETE',
          total: urls.length,
          success: verified,
          failed: missing.length,
          failedUrls: missing,
          verified: true,
        });
      }
    } finally {
      downloadInProgress = false;
    }
  })();
  // 保持 SW 存活直到下载完成（或失败）
  if (e.waitUntil) {
    e.waitUntil(downloadPromise);
  }
});
