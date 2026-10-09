/* FoodAtlas v2 — 首页 (架构文档 3.1) */
(function () {
  const { esc, card, sectionHead } = FA.ui;

  // 按日期确定性选取今日精选
  function dailyPicks() {
    const day = Math.floor(Date.now() / 864e5);
    const pick = (arr, n) => {
      if (!arr.length) return [];
      const out = [];
      for (let i = 0; i < n && i < arr.length; i++) out.push(arr[(day * 7 + i * 13) % arr.length]);
      return out;
    };
    return [
      ...pick(FA.data.list('recipe'), 4).map(x => ({ type: 'recipe', item: x })),
      ...pick(FA.data.list('baking'), 2).map(x => ({ type: 'baking', item: x })),
      ...pick(FA.data.list('drink'), 2).map(x => ({ type: 'drink', item: x })),
    ];
  }

  function hotTags() { return ['宫保鸡丁', '吐司', '拿铁', '30分钟内', '不需要烤箱', '低糖']; }

  function render() {
    const picks = dailyPicks();
    const recipes = FA.data.list('recipe'), baking = FA.data.list('baking'),
      drinks = FA.data.list('drink'), ings = FA.data.list('ingredient');
    const recent = FA.store.state.recent.slice(0, 4)
      .map(r => { const it = FA.data.get(r.type, r.id); return it ? { type: r.type, item: it } : null; }).filter(Boolean);
    const favs = FA.store.state.favorites.slice(0, 4)
      .map(r => { const it = FA.data.get(r.type, r.id); return it ? { type: r.type, item: it } : null; }).filter(Boolean);

    const channelCards = [
      { icon: '🍳', name: '菜谱厨房', desc: `${recipes.length} 道家常与风味菜`, href: '#/recipes' },
      { icon: '🍰', name: '烘焙甜点', desc: `${baking.length} 款面包蛋糕`, href: '#/baking' },
      { icon: '🥤', name: '饮品世界', desc: `${drinks.length} 款咖啡茶饮`, href: '#/drinks' },
      { icon: '🥬', name: '全球食材百科', desc: `${ings.length} 种食材知识`, href: '#/ingredients' },
    ].map(c => `<a class="channel-card" href="${c.href}"><div class="cc-ic">${c.icon}</div><h3>${c.name}</h3><p>${c.desc}</p></a>`).join('');

    const catChips = (cats, base) => cats.map(c => `<a class="chip" href="${base}?cat=${encodeURIComponent(c)}">${c}</a>`).join('');

    const html = `
    <section class="hero wrap">
      <h1>探索食物，理解风味，享受烹饪</h1>
      <p>FoodAtlas 食见 · 你的个人美食知识库与厨房工具</p>
      <div class="hero-search"><input id="hero-q" placeholder="搜索菜谱、食材、饮品或烘焙知识…"><button id="hero-go">搜索</button></div>
      <div class="hero-tags"><span>热门：</span>${hotTags().map(t => `<button data-hot="${esc(t)}">${esc(t)}</button>`).join('')}</div>
    </section>

    <div class="wrap">
      <div class="channel-row">${channelCards}</div>

      <section class="section">${sectionHead('TODAY', '今日精选', '#/explore', '去探索')}
        <div class="grid-cards">${picks.map(p => card(p.item, p.type)).join('')}</div></section>

      <div class="fridge-strip">
        <div><h3>🧊 根据现有食材，发现今天可以做的美食</h3><p>记下冰箱里的食材，自动匹配可做的菜谱，缺的还能一键加入购物清单。</p></div>
        <a class="btn" style="background:#F6F3EB;color:#2E4426" href="#/tools/fridge">查看我的冰箱</a>
        <a class="btn ghost" style="border-color:rgba(255,255,255,.4);color:#F6F3EB" href="#/tools/fridge/match">探索相关菜谱</a>
      </div>

      <section class="section">${sectionHead('RECIPES', '菜谱厨房', '#/recipes', '全部菜谱 →')}
        <div class="filter-bar">${catChips(FA.config.recipeCats, '#/recipes')}</div>
        <div class="hscroll">${recipes.slice(0, 8).map(x => card(x, 'recipe')).join('')}</div></section>

      <section class="section">${sectionHead('BAKING', '烘焙甜点', '#/baking', '全部烘焙 →')}
        <div class="filter-bar">${catChips(FA.config.bakingCats.slice(0, 5), '#/baking')}</div>
        <div class="hscroll">${baking.slice(0, 8).map(x => card(x, 'baking')).join('')}</div></section>

      <section class="section">${sectionHead('DRINKS', '饮品世界', '#/drinks', '全部饮品 →')}
        <div class="filter-bar">${catChips(FA.config.drinkCats.slice(0, 5), '#/drinks')}</div>
        <div class="hscroll">${drinks.slice(0, 8).map(x => card(x, 'drink')).join('')}</div></section>

      <section class="section">${sectionHead('INGREDIENTS', '全球食材百科', '#/ingredients', '全部食材 →')}
        <div class="hscroll">${ings.slice(0, 8).map(x => card(x, 'ingredient')).join('')}</div></section>

      <section class="section">${sectionHead('TOOLS', '厨房工具箱', '#/tools', '全部工具 →')}
        <div class="tool-grid">${FA.config.tools.slice(0, 6).map(t => `<a class="tool-entry" href="#/tools/${t.id}">
          <div class="te-ic">${t.icon}</div><div><h4>${t.name}</h4><p>${t.desc}</p></div></a>`).join('')}</div></section>

      ${recent.length ? `<section class="section">${sectionHead('RECENT', '最近浏览', '#/kitchen?tab=recent', '更多 →')}
        <div class="hscroll">${recent.map(p => card(p.item, p.type)).join('')}</div></section>` : ''}
      ${favs.length ? `<section class="section">${sectionHead('FAVORITES', '我的收藏', '#/kitchen?tab=fav', '更多 →')}
        <div class="hscroll">${favs.map(p => card(p.item, p.type)).join('')}</div></section>` : ''}
    </div>`;

    document.getElementById('app').innerHTML = `<div class="page" style="padding-top:0">${html}</div>`;
    const $ = id => document.getElementById(id);
    const go = q => { if (q.trim()) location.hash = '#/search?q=' + encodeURIComponent(q.trim()); };
    $('hero-go').onclick = () => go($('hero-q').value);
    $('hero-q').addEventListener('keydown', e => { if (e.key === 'Enter') go(e.target.value); });
    document.querySelectorAll('[data-hot]').forEach(b => b.onclick = () => go(b.dataset.hot));
  }

  FA.pagesHome = { render };
})();
