/* FoodAtlas v2 — 首页 (S3 信息架构与视觉重构, 2026-10-29) */
(function () {
  const { esc, card, imgTag, routeOf } = FA.ui;

  // 按日期确定性选取今日精选 (既有逻辑, 保持不变)
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

  // 特稿卡: 大图 + 编辑式标题 + 导语 + 行动入口 (thumb 缩略图, 不加载原图)
  function featureCard(type, x, kicker, extra) {
    return `<a class="hm-feature" href="${routeOf(type, x.id)}">
      <div class="hm-feat-img">${imgTag(x.image, x.name, null, { thumb: true, eager: true, width: 640, height: 400 })}</div>
      <div class="hm-feat-body">
        <div class="kicker">${esc(kicker)}</div>
        <h3>${esc(x.name)}</h3>
        ${x.summary ? `<p>${esc(x.summary)}</p>` : ''}
        ${extra || ''}
        <span class="hm-feat-go">查看做法 →</span>
      </div></a>`;
  }

  function render() {
    const picks = dailyPicks();
    const recipes = FA.data.list('recipe'), baking = FA.data.list('baking'),
      drinks = FA.data.list('drink'), ings = FA.data.list('ingredient');
    const recent = FA.store.state.recent.slice(0, 4)
      .map(r => { const it = FA.data.get(r.type, r.id); return it ? { type: r.type, item: it } : null; }).filter(Boolean);
    const favs = FA.store.state.favorites.slice(0, 4)
      .map(r => { const it = FA.data.get(r.type, r.id); return it ? { type: r.type, item: it } : null; }).filter(Boolean);

    // 今天吃什么: 真实计数 (分类/时间字段可靠;一人食无数据支撑, 已舍去)
    // 15分钟快手覆盖菜谱/饮品/烘焙三类, 与搜索页"15分钟内"过滤器口径一致
    const meatCount = recipes.filter(x => x.category === '肉类' || x.category === '海鲜').length;
    const vegCount = recipes.filter(x => x.category === '蔬菜').length;
    const fastCount = ['recipe', 'drink', 'baking'].reduce((n, t) =>
      n + FA.data.list(t).filter(x => { const tt = FA.ui.totalTime(x); return tt > 0 && tt <= 15; }).length, 0);

    // 本周主题: 免烤甜点 = 无 oven.temp 的烘焙 (真实数据)
    const noBake = baking.filter(x => !(x.oven && x.oven.temp));

    // 今日精选特稿: 用 picks[1], 避开 hero 大图的 picks[0]
    const feat = picks[1] || picks[0];

    // 烘焙区: 首条特稿横卡 + 后 6 张网格 (不重复)
    const bkFeat = baking[0], bkRest = baking.slice(1, 7);
    const bkFeatOven = bkFeat && bkFeat.oven && bkFeat.oven.temp
      ? `<div class="hm-feat-meta"><span class="badge">🌡️ ${bkFeat.oven.temp}°C${bkFeat.oven.time ? ` · 约 ${bkFeat.oven.time} 分钟` : ''}</span></div>` : '';

    const catChips = (cats, base) => cats.map(c => `<a class="chip" href="${base}?cat=${encodeURIComponent(c)}">${c}</a>`).join('');

    // 工具分组 (基于真实用途, 9 个工具全列)
    const toolById = id => FA.config.tools.find(t => t.id === id);
    const toolGroups = [
      { icon: '⚖️', name: '换算工具', ids: ['scale', 'unit', 'temp'] },
      { icon: '🧊', name: '厨房管理', ids: ['fridge', 'shopping', 'menu', 'substitute'] },
      { icon: '📝', name: '记录工具', ids: ['timer', 'log'] },
    ];
    const toolGroupsHtml = toolGroups.map(g => `<div class="hm-tgroup"><h4>${g.icon} ${g.name}</h4><div class="hm-tlist">${
      g.ids.map(id => { const t = toolById(id); return t ? `<a class="tool-entry" href="#/tools/${t.id}">
        <div class="te-ic">${t.icon}</div><div><h4>${t.name}</h4><p>${t.desc}</p></div></a>` : ''; }).join('')
    }</div></div>`).join('');

    const html = `
    <section class="hero hm-hero wrap">
      <div class="hero-text">
      <div class="kicker">FOODATLAS · 美食编辑杂志</div>
      <h1>探索食物，理解风味，享受烹饪</h1>
      <p>FoodAtlas 食见 · 你的个人美食知识库与厨房工具</p>
      <div class="hero-search"><input id="hero-q" placeholder="搜索菜谱、食材、饮品或烘焙知识…"><button id="hero-go">搜索</button></div>
      <div class="hero-tags"><span>热门：</span>${hotTags().map(t => `<button data-hot="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      </div>
      ${picks.length ? `<a class="hero-figure" href="${routeOf(picks[0].type, picks[0].item.id)}">${imgTag(picks[0].item.image, picks[0].item.name || picks[0].item.title, null, { eager: true, fetchPriority: true, thumb: true, width: 400, height: 267 })}<span class="hero-figcap">今日精选 · <b>${esc(picks[0].item.name || picks[0].item.title)}</b></span></a>` : ''}
    </section>

    <div class="wrap">
      <section class="hm-decide" aria-label="今天吃什么">
        <div class="hm-decide-head"><h2>今天吃什么？</h2><p>三秒帮你缩小选择范围</p></div>
        <div class="hm-decide-row">
          <a class="hm-decide-card" href="#/recipes?cat=${encodeURIComponent('肉类,海鲜')}"><span class="dc-ic">🥩</span><b>来点荤的</b><span>${meatCount} 道菜可选</span></a>
          <a class="hm-decide-card" href="#/recipes?cat=${encodeURIComponent('蔬菜')}"><span class="dc-ic">🥬</span><b>来点素的</b><span>${vegCount} 道菜可选</span></a>
          <a class="hm-decide-card" href="#/search?q=${encodeURIComponent('15分钟内')}&tab=recipe"><span class="dc-ic">⚡</span><b>15 分钟轻松做</b><span>${fastCount} 条可选</span></a>
        </div>
      </section>

      ${feat ? `<section aria-label="今日精选">${featureCard(feat.type, feat.item, 'TODAY · 今日精选')}</section>` : ''}

      <section class="hm-zone bk" aria-label="烘焙甜点">
        <div class="hm-zhead"><div><div class="kicker bk">BAKING · 烘焙甜点</div><h2>烘焙甜点</h2><p>${baking.length} 款面包蛋糕 · 烤箱的魔法</p></div><a class="more" href="#/baking">全部烘焙 →</a></div>
        ${bkFeat ? featureCard('baking', bkFeat, 'BAKING · 本期主推', bkFeatOven) : ''}
        <div class="grid-cards c3">${bkRest.map(x => card(x, 'baking')).join('')}</div>
      </section>

      <section class="hm-zone dk" aria-label="饮品世界">
        <div class="hm-zhead"><div><div class="kicker dk">DRINKS · 饮品世界</div><h2>饮品世界</h2><p>${drinks.length} 款咖啡茶饮 · 清爽时刻</p></div><a class="more" href="#/drinks">全部饮品 →</a></div>
        <div class="hscroll drink-row">${drinks.slice(0, 8).map(x => card(x, 'drink')).join('')}</div>
      </section>

      <section class="hm-zone ing" aria-label="全球食材百科">
        <div class="hm-zhead"><div><div class="kicker ing">INGREDIENTS · 食材百科</div><h2>全球食材百科</h2><p>${ings.length} 种食材 · 认识食物的起点</p></div><a class="more" href="#/ingredients">全部食材 →</a></div>
        <div class="hscroll ing-row">${ings.slice(0, 8).map(x => card(x, 'ingredient')).join('')}</div>
      </section>

      <section class="hm-zone rp" aria-label="菜谱厨房">
        <div class="hm-zhead"><div><div class="kicker">RECIPES · 菜谱厨房</div><h2>菜谱厨房</h2><p>${recipes.length} 道家常与风味菜</p></div><a class="more" href="#/recipes">全部菜谱 →</a></div>
        <div class="filter-bar">${catChips(FA.config.recipeCats, '#/recipes')}</div>
        <div class="hscroll">${recipes.slice(0, 8).map(x => card(x, 'recipe')).join('')}</div>
      </section>

      <div class="fridge-strip">
        <div><h3>🧊 根据现有食材，发现今天可以做的美食</h3><p>记下冰箱里的食材，自动匹配可做的菜谱，缺的还能一键加入购物清单。</p></div>
        <a class="btn" style="background:#F6F3EB;color:#2E4426" href="#/tools/fridge">查看我的冰箱</a>
        <a class="btn ghost" style="border-color:rgba(255,255,255,.4);color:#F6F3EB" href="#/tools/fridge/match">探索相关菜谱</a>
      </div>

      ${noBake.length ? `<section class="hm-theme" aria-label="本周主题">
        <div class="kicker">本周主题 · THEME</div>
        <h2>免烤甜点</h2>
        <p>没有烤箱？这 ${noBake.length} 款甜点不需要烤箱也能做。</p>
        <div class="hscroll">${noBake.map(x => card(x, 'baking')).join('')}</div>
      </section>` : ''}

      <section class="hm-tools" aria-label="厨房工具箱">
        <div class="hm-zhead"><div><div class="kicker">TOOLS · 厨房工具箱</div><h2>厨房工具箱</h2><p>换算、管理、记录，做饭的好帮手</p></div><a class="more" href="#/tools">全部工具 →</a></div>
        <div class="hm-tool-groups">${toolGroupsHtml}</div>
      </section>

      ${recent.length ? `<section class="section"><div class="hm-zhead"><div><div class="kicker">RECENT · 最近浏览</div><h2>最近浏览</h2></div><a class="more" href="#/kitchen?tab=recent">更多 →</a></div>
        <div class="hscroll">${recent.map(p => card(p.item, p.type)).join('')}</div></section>` : ''}
      ${favs.length ? `<section class="section"><div class="hm-zhead"><div><div class="kicker">FAVORITES · 我的收藏</div><h2>我的收藏</h2></div><a class="more" href="#/kitchen?tab=fav">更多 →</a></div>
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
