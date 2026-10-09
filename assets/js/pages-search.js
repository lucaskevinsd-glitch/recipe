/* FoodAtlas v2 — 全局搜索页 */
(function () {
  const { esc, card } = FA.ui;

  function render(query) {
    const q = (query.q || '').trim();
    const { results, parsed } = FA.search.search(q, { limit: 60 });
    const desc = FA.search.describeParsed(parsed);
    const groups = {};
    results.forEach(r => { (groups[r.type] = groups[r.type] || []).push(r); });
    const order = ['recipe', 'baking', 'drink', 'ingredient', 'technique', 'culture'];
    const html = `<div class="wrap page">
      <div class="kicker">SEARCH</div>
      <h1 style="font-family:var(--font-d);font-size:28px;margin:6px 0 4px">搜索「${esc(q)}」</h1>
      <p style="color:var(--muted);font-size:14px;margin-bottom:6px">找到 ${results.length} 条相关内容</p>
      ${desc.length ? `<div class="parsed-chips" style="padding:0;margin-bottom:10px"><span>理解为：</span>${desc.map(d => `<span class="badge green">${esc(d)}</span>`).join('')}</div>` : ''}
      ${q && !results.length ? FA.ui.empty('🔍', '没有找到相关内容，换个关键词试试') : ''}
      ${order.filter(t => groups[t]).map(t => `
        <section class="section"><div class="section-head"><div><div class="kicker">${t.toUpperCase()}</div>
        <h2>${FA.ui.TYPE_LABEL[t]}（${groups[t].length}）</h2></div></div>
        <div class="grid-cards">${groups[t].map(r => card(r.item, t)).join('')}</div></section>`).join('')}
    </div>`;
    document.getElementById('app').innerHTML = html;
    document.title = `搜索 ${q} - 食见 FoodAtlas`;
  }

  /* 搜索浮层 (顶栏触发) */
  function openOverlay() {
    closeOverlay();
    const wrap = document.createElement('div');
    wrap.className = 'search-overlay'; wrap.id = 'search-overlay';
    wrap.innerHTML = `<div class="search-panel"><div class="sp-head">
      <input id="so-q" placeholder="搜索菜谱、食材、烘焙、饮品、技巧…" autocomplete="off">
      <button class="icon-btn" id="so-x">✕</button></div>
      <div id="so-body"><div class="search-group"><h4>试试这样搜</h4>
      <div class="filter-bar">${['30分钟内快手菜', '不需要烤箱的甜点', '鸡肉', '低糖饮品', '吐司'].map(t => `<button class="chip" data-so-hot="${esc(t)}">${esc(t)}</button>`).join('')}</div></div></div></div>`;
    document.body.appendChild(wrap);
    const $ = id => document.getElementById(id);
    const input = $('so-q');
    const doSearch = () => {
      const q = input.value.trim();
      if (!q) { $('so-body').innerHTML = ''; return; }
      const { results, parsed } = FA.search.search(q, { limit: 24 });
      const desc = FA.search.describeParsed(parsed);
      const groups = {};
      results.forEach(r => { (groups[r.type] = groups[r.type] || []).push(r); });
      $('so-body').innerHTML =
        (desc.length ? `<div class="parsed-chips"><span>理解为：</span>${desc.map(d => `<span class="badge green">${esc(d)}</span>`).join('')}</div>` : '') +
        (results.length ? Object.keys(groups).map(t => `<div class="search-group"><h4>${FA.ui.TYPE_LABEL[t]}</h4>` +
          groups[t].slice(0, 5).map(r => `<a class="sr-item" href="${FA.ui.routeOf(t, r.item.id)}">
            ${r.item.image ? `<img src="${esc(r.item.image)}" loading="lazy">` : ''}
            <div><div class="t">${esc(r.item.name || r.item.title)}</div><div class="s">${esc(r.item.category || '')}</div></div></a>`).join('') +
          `</div>`).join('') +
          `<div style="padding:12px 16px"><a class="btn block" href="#/search?q=${encodeURIComponent(q)}">查看全部 ${results.length} 条结果</a></div>`
          : `<div class="search-group">${FA.ui.empty('🔍', '没有找到相关内容')}</div>`);
    };
    let deb = null;
    input.addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(doSearch, 250); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && input.value.trim()) { closeOverlay(); location.hash = '#/search?q=' + encodeURIComponent(input.value.trim()); } });
    wrap.addEventListener('click', e => { if (e.target === wrap) closeOverlay(); });
    $('so-x').onclick = closeOverlay;
    wrap.querySelectorAll('[data-so-hot]').forEach(b => b.onclick = () => { input.value = b.dataset.soHot; doSearch(); input.focus(); });
    setTimeout(() => input.focus(), 50);
  }
  function closeOverlay() { const el = document.getElementById('search-overlay'); if (el) el.remove(); }

  FA.searchUI = { render, openOverlay, closeOverlay };
})();
