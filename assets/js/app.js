/* FoodAtlas v2 — 应用主入口 */
(function () {
  const { esc } = FA.ui;

  function headerHtml() {
    const links = FA.config.nav.map(n => `<a href="${n.route}" data-nav="${n.id}">${n.label}</a>`).join('');
    return `<header class="topbar"><div class="topbar-in">
      <a class="brand" href="#/"><span class="logo">食</span><span>FoodAtlas <small>食见</small></span></a>
      <nav class="nav-links">${links}</nav>
      <div class="topbar-right">
        <button class="icon-btn" id="hd-search" title="搜索">🔍</button>
        <button class="ai-btn" id="hd-ai">✨ AI 助手</button>
      </div></div></header>`;
  }

  function tabbarHtml() {
    const tabs = FA.config.tabs.map(t => `<a href="${t.route}" data-nav="${t.id}"><span class="t-ic">${t.icon}</span>${t.label}</a>`).join('');
    return `<nav class="bottom-nav"><div class="tabs">${tabs}</div></nav>`;
  }

  function footerHtml() {
    const c = FA.data.counts();
    return `<footer class="site"><div class="wrap">
      <div><b style="font-family:var(--font-d)">FoodAtlas 食见</b> · 个人美食知识库与厨房工具<br>
      <span>收录菜谱 ${c.recipe} · 烘焙 ${c.baking} · 饮品 ${c.drink} · 食材 ${c.ingredient} · 技巧 ${c.technique} · 文化 ${c.culture}</span></div>
      <div>数据版本 ${esc(FA.config.dataVersion)} · 本地运行 · <a href="#/kitchen?tab=backup" style="text-decoration:underline">备份数据</a></div>
    </div></footer>`;
  }

  /* ---------- AI 面板 (占位: 等待用户提供 AI 接口) ---------- */
  function openAI() {
    closeAI();
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap'; wrap.id = 'ai-sheet';
    wrap.innerHTML = `<div class="sheet">
      <h3>✨ FoodAtlas AI</h3>
      <p style="color:var(--muted);font-size:14px;margin-bottom:6px">智能厨房顾问 · <b style="color:var(--terra)">接口待接入</b></p>
      <p style="font-size:14px">AI 接口接入后，这里将基于你的本地知识库提供：</p>
      <div class="ai-cap"><b>🔍 自然语言搜索</b>「有鸡蛋和番茄，做点什么好？」——直接说需求，不用记分类。</div>
      <div class="ai-cap"><b>📊 菜谱分析与比较</b>比较两份配方的差异，分析发酵失败的原因。</div>
      <div class="ai-cap"><b>🔄 食材替换建议</b>缺黄油只有植物油？AI 结合替换数据库给出可行方案。</div>
      <div class="ai-cap"><b>🧊 基于库存的建议</b>读取你的冰箱，推荐今天最值得做的菜。</div>
      <div class="ai-cap"><b>📅 完整任务规划</b>未来可按预算、偏好规划一周菜单并生成购物清单。</div>
      <p style="font-size:13px;color:var(--muted);margin-top:10px">架构已预留 RAG 检索与工具调用接口（见 docs/AI_DESIGN.md）。在那之前，关键词搜索与全部厨房工具均可正常使用。</p>
      <button class="btn block" id="ai-close" style="margin-top:12px">知道了</button>
    </div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click', e => { if (e.target === wrap) closeAI(); });
    document.getElementById('ai-close').onclick = closeAI;
  }
  function closeAI() { const el = document.getElementById('ai-sheet'); if (el) el.remove(); }

  function afterRoute(segs) {
    const id = segs[0] || '';
    const map = { '': 'home', recipes: 'recipes', recipe: 'recipes', baking: 'baking', drinks: 'drinks', drink: 'drinks', ingredients: 'ingredients', ingredient: 'ingredients', tools: 'tools', explore: 'explore', technique: 'explore', culture: 'explore', kitchen: 'kitchen', search: '' };
    const cur = map[id] || '';
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === cur));
  }

  function registerRoutes() {
    const R = FA.router;
    R.on([], () => FA.pagesHome.render());
    R.on(['recipes'], (p, q) => FA.pagesContent.listing('recipe', q));
    R.on(['recipe', ':id'], p => FA.pagesDetail.recipeDetail(p.id));
    R.on(['baking'], (p, q) => FA.pagesContent.listing('baking', q));
    R.on(['baking', ':id'], p => FA.pagesDetail.bakingDetail(p.id));
    R.on(['drinks'], (p, q) => FA.pagesContent.listing('drink', q));
    R.on(['drink', ':id'], p => FA.pagesDetail.drinkDetail(p.id));
    R.on(['ingredients'], (p, q) => FA.pagesContent.listing('ingredient', q));
    R.on(['ingredient', ':id'], p => FA.pagesDetail.ingredientDetail(p.id));
    R.on(['explore'], (p, q) => FA.pagesContent.explore(q));
    R.on(['technique', ':id'], p => FA.pagesContent.article('technique', p.id));
    R.on(['culture', ':id'], p => FA.pagesContent.article('culture', p.id));
    R.on(['search'], (p, q) => FA.searchUI.render(q));
    R.on(['kitchen'], (p, q) => FA.pagesPersonal.render(q));
    R.on(['tools'], () => { document.getElementById('app').innerHTML = FA.tools.toolsHome(); document.title = '厨房工具箱 - 食见 FoodAtlas'; });
    R.on(['tools', ':tool'], (p, q) => {
      const t = p.tool, el = document.getElementById('app');
      const T = FA.tools;
      const titles = { scale: '配方换算', unit: '单位换算', substitute: '食材替换助手', fridge: '我的冰箱', shopping: '购物清单', menu: '一周菜单', timer: '烹饪计时器', temp: '温度换算', log: '制作记录' };
      document.title = (titles[t] || '工具') + ' - 食见 FoodAtlas';
      if (t === 'scale') el.innerHTML = T.scaleTool();
      else if (t === 'unit') el.innerHTML = T.unitTool();
      else if (t === 'substitute') el.innerHTML = T.substitute(q.q);
      else if (t === 'fridge') el.innerHTML = T.fridgeTool();
      else if (t === 'shopping') el.innerHTML = T.shopTool();
      else if (t === 'menu') el.innerHTML = T.menuTool(q);
      else if (t === 'timer') el.innerHTML = T.timerTool();
      else if (t === 'temp') el.innerHTML = T.tempTool();
      else if (t === 'log') el.innerHTML = T.logTool();
      else { location.hash = '#/tools'; return; }
      window.scrollTo(0, 0);
    });
    // 冰箱匹配是 fridge 工具的子路由
    R.on(['tools', 'fridge', 'match'], () => {
      document.getElementById('app').innerHTML = FA.tools.fridgeMatch();
      document.title = '按冰箱找菜 - 食见 FoodAtlas'; window.scrollTo(0, 0);
    });
  }

  async function init() {
    if (window.__FA_INIT__) return;
    window.__FA_INIT__ = true;
    document.body.insertAdjacentHTML('afterbegin', headerHtml());
    document.body.insertAdjacentHTML('beforeend', tabbarHtml());
    document.body.insertAdjacentHTML('beforeend', '<button class="fab-ai" id="fab-ai" title="FoodAtlas AI">✨</button>');
    document.getElementById('hd-search').onclick = FA.searchUI.openOverlay;
    document.getElementById('hd-ai').onclick = openAI;
    document.getElementById('fab-ai').onclick = openAI;
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); FA.searchUI.openOverlay(); }
    });

    document.getElementById('app').innerHTML = '<div class="loading">正在加载知识库…</div>';
    await FA.data.loadAll();
    registerRoutes();
    // footer 需要数据计数, 数据加载后插入
    document.body.insertAdjacentHTML('beforeend', footerHtml());
    FA.router.render();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  FA.app = { init, afterRoute, openAI };
  document.addEventListener('DOMContentLoaded', init);
})();
