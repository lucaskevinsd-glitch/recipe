/* FoodAtlas v2 — 路由 */
(function () {
  const root = () => document.getElementById('app');
  let current = '';

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
    if (m) {
      document.getElementById('app').innerHTML = '<div class="loading">正在加载…</div>';
      document.title = '食见 FoodAtlas · 认识每一种食材，做好每一顿饭';
      try { await m.handler(m.params, query); }
      catch (e) { console.error(e); root().innerHTML = FA.ui.empty('😵', '页面加载出错，请稍后重试'); }
    } else {
      root().innerHTML = FA.ui.empty('🧭', '找不到这个页面', '<a class="btn" href="#/">回首页</a>');
    }
    current = key;
    FA.app && FA.app.afterRoute && FA.app.afterRoute(segs);
    window.scrollTo(0, 0);
  }

  function nav(route) { location.hash = route; }

  window.addEventListener('hashchange', render);
  FA.router = { on, render, nav, parseHash };
})();
