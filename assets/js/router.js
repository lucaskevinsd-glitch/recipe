/* FoodAtlas v2 — 路由 */
(function () {
  const root = () => document.getElementById('app');
  let current = '';
  // 滚动位置恢复：按 hash 保存各页面滚动位置
  const scrollPos = new Map();
  // popstate 在浏览器前进/后退时触发（程序化 hash 赋值不触发），用于区分导航类型
  let isBackForward = false;

  function parseHash() {
    const h = location.hash || '#/';
    const [pathQ] = [h.slice(1)];
    const [path, qs] = pathQ.split('?');
    const segs = path.split('/').filter(Boolean);
    const query = Object.fromEntries(new URLSearchParams(qs || ''));
    return { segs, query };
  }

  const routes = [];
  function on(pattern, handler) { routes.push({ pattern, handler }); }
  function matchRoute(segs) {
    for (const r of routes) {
      if (r.pattern.length !== segs.length) continue;
      const params = {};
      let ok = true;
      for (let i = 0; i < segs.length; i++) {
        const p = r.pattern[i];
        if (p.startsWith(':')) params[p.slice(1)] = decodeURIComponent(segs[i]);
        else if (p !== segs[i]) { ok = false; break; }
      }
      if (ok) return { handler: r.handler, params };
    }
    return null;
  }

  async function render() {
    const { segs, query } = parseHash();
    const m = matchRoute(segs);
    const key = location.hash;
    // 保存离开页面的滚动位置（用于返回时恢复）
    if (current && current !== key) scrollPos.set(current, window.scrollY);
    if (m) {
      document.getElementById('app').innerHTML = '<div class="loading">正在加载…</div>';
      document.title = '食见 FoodAtlas · 认识每一种食材，做好每一顿饭';
      try { await m.handler(m.params, query); }
      catch (e) { console.error(e); root().innerHTML = FA.ui.empty('😵', '页面加载出错，请稍后重试'); }
    } else {
      root().innerHTML = FA.ui.empty('🧭', '找不到这个页面', '<a class="btn" href="#/">回首页</a>');
    }
    const isSamePage = (current === key);
    current = key;
    FA.app && FA.app.afterRoute && FA.app.afterRoute(segs);
    // 滚动处理：
    // - 同页重渲染（如工具页操作）：不滚动，保持当前位置
    // - 前进/后退且有保存位置：恢复位置
    // - 新页面导航：回顶
    if (isSamePage) {
      // 同页重渲染，不改变滚动位置
    } else if (isBackForward && scrollPos.has(key)) {
      const y = scrollPos.get(key);
      window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    isBackForward = false;
  }

  function nav(route) { location.hash = route; }

  window.addEventListener('popstate', () => { isBackForward = true; });
  window.addEventListener('hashchange', render);
  FA.router = { on, render, nav, parseHash };
})();
