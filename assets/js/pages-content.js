/* FoodAtlas v2 — 内容列表页 / 探索页 / 文章页 */
(function () {
  const { esc, card, sectionHead, pageHead } = FA.ui;

  const TYPE_CONF = {
    recipe: { kicker: 'RECIPES', title: '菜谱厨房', sub: '家常菜、肉类、海鲜、蔬菜、汤品、主食', cats: () => FA.config.recipeCats },
    baking: { kicker: 'BAKING', title: '烘焙甜点', sub: '面包、蛋糕、饼干、塔派与烘焙技术', cats: () => FA.config.bakingCats },
    drink: { kicker: 'DRINKS', title: '饮品世界', sub: '咖啡、茶饮、果汁、奶昔、气泡饮品', cats: () => FA.config.drinkCats },
    ingredient: { kicker: 'INGREDIENTS', title: '全球食材百科', sub: '选购、保存、处理、营养与替换建议', cats: () => FA.config.ingCats },
  };

  // 列表页路由必须与 app.js 中 FA.router.on 注册的路由一致
  // (recipe→#/recipes, baking→#/baking, drink→#/drinks, ingredient→#/ingredients)
  const LIST_ROUTE = { recipe: 'recipes', baking: 'baking', drink: 'drinks', ingredient: 'ingredients' };

  function listing(type, query) {
    const conf = TYPE_CONF[type];
    const cat = query.cat || '';
    const level = query.level || '';
    const kw = (query.kw || '').trim();
    let items = FA.data.list(type);
    if (cat) items = items.filter(x => x.category === cat || x.cat === cat);
    if (level) items = items.filter(x => x.level === level);
    if (kw) {
      const r = FA.search.search(kw, { types: [type], limit: 500 }).results;
      const ids = new Set(r.map(x => x.item.id));
      items = items.filter(x => ids.has(x.id));
    }
    const listBase = '#/' + LIST_ROUTE[type];
    const chips = conf.cats().map(c =>
      `<a class="chip ${cat === c ? 'on' : ''}" href="${listBase}${c ? '?cat=' + encodeURIComponent(c) : ''}">${c}</a>`).join('');
    const base = listBase;
    const qs = [cat && `cat=${encodeURIComponent(cat)}`, kw && `kw=${encodeURIComponent(kw)}`].filter(Boolean).join('&');

    const html = `${pageHead(conf.kicker, conf.title, `${conf.sub} · 共 ${items.length} 条`)}
      <div class="filter-bar"><a class="chip ${!cat ? 'on' : ''}" href="${base}">全部</a>${chips}
        <select id="f-level"><option value="">难度不限</option>${FA.config.levels.map(l => `<option ${level === l ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <input id="f-kw" placeholder="在结果中搜索…" value="${esc(kw)}" style="border:1px solid var(--line2);border-radius:999px;padding:7px 14px;font-size:14px;background:var(--surface)">
      </div>
      <div class="grid-cards">${items.map(x => card(x, type)).join('') || FA.ui.empty('🔍', '没有符合条件的内容，换个筛选试试')}</div>`;

    document.getElementById('app').innerHTML = `<div class="wrap page">${html}</div>`;
    const go = () => {
      const l = document.getElementById('f-level').value, k = document.getElementById('f-kw').value.trim();
      const q = [cat && `cat=${encodeURIComponent(cat)}`, l && `level=${encodeURIComponent(l)}`, k && `kw=${encodeURIComponent(k)}`].filter(Boolean).join('&');
      location.hash = base + (q ? '?' + q : '');
    };
    document.getElementById('f-level').onchange = go;
    document.getElementById('f-kw').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }

  /* ---------- 探索页: 美食文化 + 厨房技巧 ---------- */
  function explore(query) {
    const tab = query.tab === 'tech' ? 'tech' : 'culture';
    const cat = query.cat || '';
    const items = tab === 'tech' ? FA.data.list('technique') : FA.data.list('culture');
    const cats = tab === 'tech' ? FA.config.techCats : FA.config.cultureCats;
    const list = cat ? items.filter(x => x.category === cat) : items;
    const cards = list.map(x => {
      const type = tab === 'tech' ? 'technique' : 'culture';
      return `<a class="card" href="${FA.ui.routeOf(type, x.id)}">
        <div class="card-body"><div class="kicker" style="font-size:11px">${esc(x.category)}</div>
        <div class="card-title">${esc(x.title)}</div>
        <div class="card-desc">${esc(x.summary)}</div>
        <div class="meta-row">${x.region ? `<span class="badge">${esc(x.region)}</span>` : ''}${x.level ? `<span class="badge green">${esc(x.level)}</span>` : ''}</div>
        </div></a>`;
    }).join('');
    const html = `${pageHead('EXPLORE', '食物探索', '世界菜系、地方风味、烹饪知识，发现食物背后的故事。')}
      <div class="explore-tabs">
        <a class="chip ${tab === 'culture' ? 'on' : ''}" href="#/explore?tab=culture">美食文化</a>
        <a class="chip ${tab === 'tech' ? 'on' : ''}" href="#/explore?tab=tech">厨房技巧</a>
      </div>
      <div class="filter-bar"><a class="chip ${!cat ? 'on' : ''}" href="#/explore?tab=${tab}">全部</a>
        ${cats.map(c => `<a class="chip ${cat === c ? 'on' : ''}" href="#/explore?tab=${tab}&cat=${encodeURIComponent(c)}">${c}</a>`).join('')}</div>
      <div class="grid-cards c3">${cards || FA.ui.empty('🧭', '这个分类还没有内容')}</div>`;
    document.getElementById('app').innerHTML = `<div class="wrap page">${html}</div>`;
  }

  /* ---------- 文章详情 (技巧/文化) ---------- */
  function article(type, id) {
    const item = FA.data.get(type, id);
    if (!item) return notFound();
    FA.store.pushRecent(type, id);
    const related = (item.related || []).map(rid => {
      const e = FA.data.byId.get(rid);
      return e ? card(e.item, e.type) : '';
    }).join('');
    const html = `<div class="wrap page"><div class="article">
      <div class="kicker">${esc(item.category)}</div>
      <h1>${esc(item.title)}</h1>
      <div class="art-meta">${item.region ? esc(item.region) + ' · ' : ''}${item.level ? esc(item.level) + ' · ' : ''}编辑整理</div>
      <p class="lead">${esc(item.summary)}</p>
      ${(item.body || []).map(p => `<p>${esc(p)}</p>`).join('')}
      ${item.keyPoints && item.keyPoints.length ? `<div class="tip-box"><h4>要点</h4><ul>${item.keyPoints.map(k => `<li>${esc(k)}</li>`).join('')}</ul></div>` : ''}
      ${item.mistakes && item.mistakes.length ? `<h3 style="font-family:var(--font-d);margin:20px 0 10px">常见误区</h3>${item.mistakes.map(m => `<div class="faq-item"><b>⚠ ${esc(m.m)}</b><p>${esc(m.fix)}</p></div>`).join('')}` : ''}
      <div class="detail-actions">${FA.ui.favBtn(type, id)}<a class="btn ghost sm" href="#/explore">← 返回探索</a></div>
      ${related ? `<section class="section"><h3 style="font-family:var(--font-d);margin-bottom:14px">相关内容</h3><div class="grid-cards">${related}</div></section>` : ''}
    </div></div>`;
    document.getElementById('app').innerHTML = html;
    document.title = item.title + ' - 食见 FoodAtlas';
  }

  function notFound() {
    document.getElementById('app').innerHTML = `<div class="wrap page">${FA.ui.empty('🔍', '内容不存在或已被移除', '<a class="btn" href="#/">回首页</a>')}</div>`;
  }

  FA.pagesContent = { listing, explore, article, notFound };
})();
